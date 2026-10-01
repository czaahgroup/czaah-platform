import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'
import { escapeHtml } from '@/lib/escapeHtml'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { cleanRfq, offerQuantity, RFQ_KIND_LABEL, type CleanRfq } from '@/lib/minerals'

/**
 * Public: a quote request, an opportunity enquiry or a sourcing request from
 * minerals.czaah.com. Stored (Admin → Minerals → Requests), copied into the
 * group inbox (Admin → Enquiries), linked to a CRM contact, then emailed to
 * info@ with a confirmation to the sender.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`rfq-attempt:${ip}`, 30, 3600_000).success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  // A hidden field real visitors never see. A request that fills it is kept,
  // marked spam, with no emails — never thrown away, because a browser's
  // autofill can fill the field for a real person.
  const trapped = !!(body && typeof body.hp_field === 'string' && body.hp_field.trim())
  const { rfq, error } = cleanRfq(body)
  if (error || !rfq) {
    return trapped ? NextResponse.json({ success: true, reference: null }) : NextResponse.json({ error }, { status: 400 })
  }
  if (!rateLimit(`rfq-stored:${ip}`, 8, 3600_000).success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const db = createAdminClient()

    let offer: { id: string; reference: string; title: string; commodity: string; offer_type: string } | null = null
    if (rfq.offer_id) {
      const { data } = await db.from('mineral_offers').select('id, reference, title, commodity, offer_type').eq('id', rfq.offer_id).eq('status', 'approved').maybeSingle()
      if (!data) return NextResponse.json({ error: 'This offer is no longer available. Send us your requirement instead.' }, { status: 404 })
      offer = data
    }
    const kind = !offer ? 'sourcing' : offer.offer_type === 'supply' ? 'quote' : 'opportunity'

    const contactId = trapped ? null : await upsertContact(db, rfq)

    const { data: row, error: insertError } = await db.from('mineral_rfqs').insert({
      kind,
      offer_id: offer?.id ?? null,
      offer_reference: offer?.reference ?? null,
      offer_title: offer?.title ?? null,
      commodity: rfq.commodity || offer?.commodity || null,
      name: rfq.name,
      company: rfq.company,
      email: rfq.email,
      phone: rfq.phone,
      country: rfq.country,
      quantity: rfq.quantity,
      quantity_unit: rfq.quantity_unit,
      incoterm: rfq.incoterm,
      destination_port: rfq.destination_port,
      message: rfq.message,
      source_page: rfq.source_page,
      contact_id: contactId,
      ...(trapped ? { status: 'spam', admin_notes: 'Held as spam: the hidden anti-spam field was filled in. If this is a real person, change the status.' } : {}),
    }).select('id, reference').single()
    if (insertError || !row) throw insertError || new Error('rfq insert returned nothing')
    if (trapped) return NextResponse.json({ success: true, reference: row.reference })

    const subject = `${RFQ_KIND_LABEL[kind]}${offer ? ` — ${offer.title.slice(0, 80)}` : rfq.commodity ? ` — ${rfq.commodity}` : ''} (${row.reference})`

    // The same request in Admin → Enquiries, beside every other enquiry.
    const { error: inboxError } = await db.from('public_messages').insert({
      name: rfq.name,
      email: rfq.email,
      phone: rfq.phone,
      interest: subject,
      message: summary(rfq, offer).map(([k, v]) => `${k}: ${v}`).join('\n') || '(No details — see Minerals → Requests.)',
      source: 'minerals_portal',
    })
    if (inboxError) logError('api.mineral-rfqs', inboxError, { step: 'enquiries-inbox', rfq: row.reference })

    await sendEmails(rfq, row.reference, subject, offer).catch((err) => logError('api.mineral-rfqs', err, { step: 'email', rfq: row.reference }))
    return NextResponse.json({ success: true, reference: row.reference })
  } catch (err) {
    logError('api.mineral-rfqs', err)
    return NextResponse.json({ error: 'We could not send your request just now. Please try again.' }, { status: 500 })
  }
}

type Db = ReturnType<typeof createAdminClient>

/** One CRM contact per email: reuse it (touching activity), or create a lead contact. */
async function upsertContact(db: Db, rfq: CleanRfq): Promise<string | null> {
  try {
    const pattern = rfq.email.replace(/[\\%_]/g, (c) => `\\${c}`)
    const { data: existing } = await db.from('crm_contacts').select('id, tags').ilike('email', pattern).maybeSingle()
    if (existing) {
      const tags = Array.isArray(existing.tags) ? existing.tags : []
      await db.from('crm_contacts').update({
        last_activity_at: new Date().toISOString(),
        tags: tags.includes('minerals') ? tags : [...tags, 'minerals'],
      }).eq('id', existing.id)
      return existing.id
    }
    const { data: created, error } = await db.from('crm_contacts').insert({
      name: rfq.name,
      email: rfq.email,
      phone: rfq.phone,
      type: 'lead',
      stage: 'new',
      source: 'minerals_portal',
      tags: ['minerals'],
      last_activity_at: new Date().toISOString(),
    }).select('id').single()
    if (error) throw error
    return created.id
  } catch (err) {
    // The request itself must never be lost to a CRM hiccup.
    logError('api.mineral-rfqs', err, { step: 'crm-contact' })
    return null
  }
}

/** The details of a request as label / value pairs, skipping what was left empty. */
function summary(rfq: CleanRfq, offer: { reference: string; title: string } | null): [string, string][] {
  const rows: [string, string | null][] = [
    ['Offer', offer ? `${offer.title} (${offer.reference})` : null],
    ['Mineral', rfq.commodity],
    ['Company', rfq.company],
    ['Country', rfq.country],
    ['Quantity', offerQuantity(rfq.quantity, rfq.quantity_unit)],
    ['Delivery terms', rfq.incoterm],
    ['Destination port', rfq.destination_port],
    ['Message', rfq.message],
  ]
  return rows.filter(([, v]) => v) as [string, string][]
}

/** Resend reports a refused send in its result rather than throwing; make it an error we log. */
async function deliver(message: Parameters<typeof resend.emails.send>[0]) {
  const { error } = await resend.emails.send(message)
  if (error) throw new Error(`${error.name || 'send failed'}: ${error.message}`)
}

async function sendEmails(rfq: CleanRfq, reference: string, subject: string, offer: { reference: string; title: string } | null) {
  const e = (v: string | null | undefined) => escapeHtml(v == null ? '' : v)
  const rows: [string, string][] = [['Reference', reference], ['Name', rfq.name], ['Email', rfq.email], ...(rfq.phone ? [['Phone', rfq.phone] as [string, string]] : []), ...summary(rfq, offer)]
  const table = rows.map(([k, v]) =>
    `<tr><td style="color:rgba(255,255,255,0.45);padding:6px 12px 6px 0;font-size:13px;vertical-align:top;width:130px">${k}</td><td style="color:#fff;padding:6px 0;font-size:13px;line-height:1.6">${e(v).replace(/\n/g, '<br/>')}</td></tr>`,
  ).join('')
  const wrap = (inner: string) => `<div style="font-family:'Raleway',Arial,sans-serif;background:#000;color:#fff;padding:40px 20px;max-width:600px;margin:0 auto"><div style="text-align:center;margin-bottom:28px"><h1 style="color:#C9A84C;font-family:'Cinzel',Georgia,serif;font-size:26px;letter-spacing:6px;margin:0">CZAAH</h1><p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:4px;margin-top:8px">MINERALS</p></div><div style="background:#080808;border:1px solid #1A1A1A;border-radius:8px;padding:28px">${inner}</div></div>`

  await deliver({
    from: FROM_EMAIL,
    to: 'info@czaah.com',
    replyTo: rfq.email,
    subject,
    html: wrap(`<h2 style="color:#C9A84C;font-size:19px;margin:0 0 16px">${e(subject)}</h2><table style="width:100%;border-collapse:collapse">${table}</table><p style="margin:22px 0 0"><a href="https://czaah.com/admin/minerals" style="display:inline-block;background:#C9A84C;color:#000;padding:11px 26px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">Open in Minerals &rarr;</a></p>`),
  })
  await deliver({
    from: FROM_EMAIL,
    to: rfq.email,
    subject: `We've received your request (${reference})`,
    html: wrap(`<h2 style="color:#C9A84C;font-size:19px;margin:0 0 16px">Thank you, ${e(rfq.name)}</h2><p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 14px">We've received your request${offer ? ` about <strong style="color:#fff">${e(offer.title)}</strong>` : ''}. A member of the CZAAH Minerals team will be in touch. Nothing is agreed or reserved until we confirm it with you in writing.</p><p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0">Your reference is <strong style="color:#fff">${e(reference)}</strong>.</p>`),
  })
}
