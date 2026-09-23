import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'
import { escapeHtml } from '@/lib/escapeHtml'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { cleanLead, listingRef, LEAD_KIND_LABEL } from '@/lib/propertyLeads'

/**
 * Public: an enquiry, viewing request or investment enquiry from
 * property.czaah.com. Stored as a lead (Admin → Property Leads), linked to a
 * CRM contact, then emailed to info@ with a confirmation to the visitor.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`lead-attempt:${ip}`, 30, 3600_000).success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  // Honeypot: bots that fill it get a normal-looking success.
  if (body && typeof body.company_site === 'string' && body.company_site.trim()) {
    return NextResponse.json({ success: true, reference: null })
  }
  const { data: lead, error } = cleanLead(body)
  if (error) return NextResponse.json({ error }, { status: 400 })
  if (!rateLimit(`lead-stored:${ip}`, 8, 3600_000).success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const db = createAdminClient()

    let listing: { id: string; title: string; city: string | null; country: string | null } | null = null
    if (lead!.listing_id) {
      const { data } = await db.from('property_listings').select('id, title, city, country').eq('id', lead!.listing_id).eq('status', 'approved').maybeSingle()
      if (!data) return NextResponse.json({ error: 'This property is no longer available. Please contact us directly.' }, { status: 404 })
      listing = data
    }

    // A signed-in buyer sees their requests on /account.
    let userId: string | null = null
    try {
      const { data: { user } } = await (await createClient()).auth.getUser()
      userId = user?.id ?? null
    } catch { /* anonymous */ }

    const contactId = await upsertContact(db, lead!.name, lead!.email, lead!.phone)

    const { data: row, error: insertError } = await db.from('property_leads').insert({
      kind: lead!.kind,
      name: lead!.name,
      email: lead!.email,
      phone: lead!.phone,
      message: lead!.message,
      listing_id: listing?.id ?? null,
      listing_reference: listing ? listingRef(listing.id) : null,
      listing_title: listing?.title ?? null,
      country: lead!.country || listing?.country || null,
      city: lead!.city || listing?.city || null,
      budget_amount: lead!.budget_amount,
      budget_currency: lead!.budget_currency,
      property_type: lead!.property_type,
      funding: lead!.funding,
      purpose: lead!.purpose,
      timeline: lead!.timeline,
      source_page: lead!.source_page,
      user_id: userId,
      contact_id: contactId,
    }).select('id, reference').single()
    if (insertError || !row) throw insertError || new Error('lead insert returned nothing')

    if (lead!.kind === 'viewing_request') {
      const { error: vErr } = await db.from('property_viewings').insert({
        lead_id: row.id, listing_id: listing?.id ?? null, preferred_date: lead!.preferred_date, preferred_slot: lead!.preferred_slot,
      })
      if (vErr) logError('api.property-leads', vErr, { step: 'viewing-insert', lead: row.reference })
    }

    await sendEmails(lead!, row.reference, listing, new URL(request.url).origin).catch((err) =>
      logError('api.property-leads', err, { step: 'email', lead: row.reference }),
    )
    return NextResponse.json({ success: true, reference: row.reference })
  } catch (err) {
    logError('api.property-leads', err)
    return NextResponse.json({ error: 'We could not send your request just now. Please try again.' }, { status: 500 })
  }
}

type Db = ReturnType<typeof createAdminClient>

/** One CRM contact per email: reuse it (touching activity), or create a lead contact. */
async function upsertContact(db: Db, name: string, email: string, phone: string | null): Promise<string | null> {
  try {
    const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`)
    const find = () => db.from('crm_contacts').select('id, phone, tags').ilike('email', pattern).maybeSingle()
    let { data: existing } = await find()
    if (!existing) {
      const { data: created, error } = await db.from('crm_contacts').insert({
        name, email, phone, type: 'lead', stage: 'new', source: 'property_portal', tags: ['property'], last_activity_at: new Date().toISOString(),
      }).select('id').single()
      if (created) return created.id
      // Lost a race with a concurrent insert on the unique email index.
      if (error) ({ data: existing } = await find())
      if (!existing) return null
    }
    const tags: string[] = Array.isArray(existing.tags) ? existing.tags : []
    await db.from('crm_contacts').update({
      last_activity_at: new Date().toISOString(),
      ...(existing.phone || !phone ? {} : { phone }),
      ...(tags.includes('property') ? {} : { tags: [...tags, 'property'] }),
    }).eq('id', existing.id)
    return existing.id
  } catch (err) {
    // A lead must never be lost because the CRM link failed.
    logError('api.property-leads', err, { step: 'crm-contact' })
    return null
  }
}

async function sendEmails(
  lead: NonNullable<ReturnType<typeof cleanLead>['data']>,
  reference: string,
  listing: { id: string; title: string } | null,
  origin: string,
) {
  const e = (v: string | number | null | undefined) => escapeHtml(v == null ? '' : String(v))
  const kind = LEAD_KIND_LABEL[lead.kind]
  const rows: [string, string | null][] = [
    ['Reference', reference],
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Property', listing ? `${listing.title} (${listingRef(listing.id)})` : null],
    ['Preferred date', lead.preferred_date],
    ['Preferred time', lead.preferred_slot],
    ['Budget', lead.budget_amount ? `${lead.budget_currency || ''} ${lead.budget_amount.toLocaleString('en-GB')}`.trim() : null],
    ['Location', [lead.city, lead.country].filter(Boolean).join(', ') || null],
    ['Property type', lead.property_type],
    ['Funding', lead.funding],
    ['Purpose', lead.purpose],
    ['Timeline', lead.timeline],
    ['Message', lead.message],
  ]
  const table = rows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="color:rgba(255,255,255,0.45);padding:6px 12px 6px 0;font-size:13px;vertical-align:top;width:130px">${k}</td><td style="color:#fff;padding:6px 0;font-size:13px;line-height:1.6">${e(v).replace(/\n/g, '<br/>')}</td></tr>`,
  ).join('')
  const adminBase = origin.includes('property.czaah.com') ? 'https://czaah.com' : origin
  const wrap = (inner: string) => `<div style="font-family:'Raleway',Arial,sans-serif;background:#000;color:#fff;padding:40px 20px;max-width:600px;margin:0 auto"><div style="text-align:center;margin-bottom:28px"><h1 style="color:#C9A84C;font-family:'Cinzel',Georgia,serif;font-size:26px;letter-spacing:6px;margin:0">CZAAH</h1><p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:4px;margin-top:8px">PROPERTIES</p></div><div style="background:#080808;border:1px solid #1A1A1A;border-radius:8px;padding:28px">${inner}</div></div>`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: 'info@czaah.com',
    replyTo: lead.email,
    subject: `${kind} ${reference}${listing ? ` — ${listing.title.slice(0, 80)}` : ''}`,
    html: wrap(`<h2 style="color:#C9A84C;font-size:19px;margin:0 0 16px">${e(kind)}</h2><table style="width:100%;border-collapse:collapse">${table}</table><p style="margin:22px 0 0"><a href="${adminBase}/admin/property-leads" style="display:inline-block;background:#C9A84C;color:#000;padding:11px 26px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">Open in Property Leads &rarr;</a></p>`),
  })

  const what = lead.kind === 'viewing_request' ? 'viewing request' : lead.kind === 'investment_enquiry' ? 'investment enquiry' : 'enquiry'
  await resend.emails.send({
    from: FROM_EMAIL,
    to: lead.email,
    subject: `We've received your ${what} (${reference})`,
    html: wrap(`<h2 style="color:#C9A84C;font-size:19px;margin:0 0 16px">Thank you, ${e(lead.name)}</h2><p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 14px">We've received your ${what}${listing ? ` about <strong style="color:#fff">${e(listing.title)}</strong>` : ''}. A member of the CZAAH Properties team will be in touch${lead.kind === 'viewing_request' ? ' to confirm a time' : ''}.</p><p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0">Your reference is <strong style="color:#fff">${e(reference)}</strong>.</p>`),
  })
}
