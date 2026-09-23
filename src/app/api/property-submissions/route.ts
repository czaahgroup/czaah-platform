import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { rateLimit } from '@/lib/rateLimit'
import { escapeHtml } from '@/lib/escapeHtml'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { sniffImageType, LISTING_IMAGE_TYPES } from '@/lib/uploadSafety'
import {
  cleanSubmission,
  KIND_LABEL,
  SUBMISSION_MAX_IMAGES,
  SUBMISSION_MAX_IMAGE_BYTES,
  SUBMISSION_MAX_TOTAL_BYTES,
} from '@/lib/propertySubmissions'

/**
 * Public: "Sell / Let / List a development / Partner" from property.czaah.com.
 *
 * A submission is stored for review and NEVER published: property_listings is
 * not touched here. Photos go to the private platform-files bucket; only an
 * admin converting the submission copies them to the public listing bucket.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
    // Two limits: a generous one on attempts (so a few typos never lock a real
    // owner out) and a strict one on submissions actually stored, below.
    if (!rateLimit(`property-submission-attempt:${ip}`, 30, 3600_000).success) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const type = request.headers.get('content-type') || ''
    if (!type.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Unsupported request.' }, { status: 415 })
    }
    const length = Number(request.headers.get('content-length') || 0)
    if (length > SUBMISSION_MAX_TOTAL_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: 'The photos are too large in total. Please send fewer or smaller images.' }, { status: 413 })
    }

    const form = await request.formData()

    // Honeypot: a field real visitors never see. Bots that fill it get a
    // normal-looking success and nothing is stored or sent.
    if (String(form.get('company_site') || '').trim()) {
      return NextResponse.json({ success: true, reference: null })
    }

    const { data, errors } = cleanSubmission(form)
    if (errors) return NextResponse.json({ error: errors.join(' ') }, { status: 400 })

    // Photos: only for a specific property or development.
    const files = form.getAll('images').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f && (f as File).size > 0)
    if (data!.kind === 'partnership' && files.length) {
      return NextResponse.json({ error: 'Photos are not needed for a partnership enquiry.' }, { status: 400 })
    }
    if (files.length > SUBMISSION_MAX_IMAGES) {
      return NextResponse.json({ error: `Please send at most ${SUBMISSION_MAX_IMAGES} photos.` }, { status: 400 })
    }
    let total = 0
    const images: { buf: Uint8Array; ext: string; type: string }[] = []
    for (const f of files) {
      if (f.size > SUBMISSION_MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: `"${f.name}" is over 8 MB. Please use a smaller image.` }, { status: 400 })
      }
      total += f.size
      if (total > SUBMISSION_MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: 'The photos are too large in total. Please send fewer or smaller images.' }, { status: 413 })
      }
      const buf = new Uint8Array(await f.arrayBuffer())
      // The browser's label is only a hint — the bytes decide.
      const sniffed = sniffImageType(buf)
      if (!sniffed || !LISTING_IMAGE_TYPES[sniffed]) {
        return NextResponse.json({ error: `"${f.name}" isn't a JPEG, PNG, WebP or AVIF image.` }, { status: 400 })
      }
      images.push({ buf, ext: LISTING_IMAGE_TYPES[sniffed], type: sniffed })
    }

    if (!rateLimit(`property-submission-stored:${ip}`, 5, 3600_000).success) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later, or email info@czaah.com.' }, { status: 429 })
    }

    const supabase = createAdminClient()
    const { data: row, error: insertError } = await supabase
      .from('property_submissions')
      .insert(data!.row)
      .select('id, reference')
      .single()
    if (insertError || !row) {
      logError('api.propertySubmissions', insertError, { step: 'insert' })
      return NextResponse.json({ error: 'We could not save your details. Please try again.' }, { status: 500 })
    }

    const paths: string[] = []
    for (const [i, img] of images.entries()) {
      const path = `submissions/${row.id}/${i + 1}.${img.ext}`
      const { error } = await supabase.storage.from('platform-files').upload(path, img.buf, { contentType: img.type, upsert: false })
      if (error) logError('api.propertySubmissions', error, { step: 'image-upload', index: i })
      else paths.push(path)
    }
    if (paths.length) await supabase.from('property_submissions').update({ images: paths }).eq('id', row.id)

    // Notify the team and confirm to the sender. Every value is escaped —
    // the confirmation goes to an address the visitor typed.
    const r = data!.row
    const lines: [string, unknown][] = [
      ['Reference', row.reference],
      ['Type', KIND_LABEL[data!.kind]],
      ['Name', r.full_name],
      ['Email', r.email],
      ['Phone', r.phone],
      ['Company', r.company],
      ['Location', [r.address, r.city, r.country].filter(Boolean).join(', ')],
      ['Property type', r.property_type],
      ['Development', r.development_name],
      ['Expected price', r.expected_price != null ? `${r.currency || ''} ${Number(r.expected_price).toLocaleString('en-GB')}` : null],
      ['Expected rent', r.expected_rent != null ? `${r.currency || ''} ${Number(r.expected_rent).toLocaleString('en-GB')} / ${r.rent_period}` : null],
      ['Photos', paths.length ? String(paths.length) : null],
      ['Message', r.message],
    ]
    const table = lines
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `<tr><td style="color:#888;padding:6px 12px 6px 0;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
      .join('')
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: 'info@czaah.com',
        replyTo: String(r.email),
        subject: `New ${KIND_LABEL[data!.kind].toLowerCase()} submission — ${row.reference}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>A new submission is waiting for review in Admin → Submissions.</p><table>${table}</table></div>`,
      })
      await resend.emails.send({
        from: FROM_EMAIL,
        to: String(r.email),
        replyTo: 'info@czaah.com',
        subject: `We've received your details — ${row.reference}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>Dear ${escapeHtml(r.full_name)},</p><p>Thank you for contacting CZAAH Properties. We have received your details (reference <strong>${escapeHtml(row.reference)}</strong>) and a member of the team will be in touch.</p><p>Nothing is published until we have spoken with you and agreed the details.</p><p>CZAAH Properties</p></div>`,
      })
    } catch (err) {
      // The submission is saved; email is best-effort.
      logError('api.propertySubmissions', err, { step: 'email' })
    }

    return NextResponse.json({ success: true, reference: row.reference })
  } catch (err) {
    logError('api.propertySubmissions', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
