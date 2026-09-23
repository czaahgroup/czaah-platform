import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import { logActivity } from '@/lib/activity'
import { LEAD_STATUSES, LEAD_KINDS, VIEWING_STATUSES, dealFromLead, type LeadKind } from '@/lib/propertyLeads'

/**
 * Admin → Property Leads.
 *   GET    list (?status=&kind=), with viewings and the admin team for assigning
 *   PATCH  { id, status?, assigned_to?, admin_notes? }  or  { viewing_id, status?, scheduled_at?, mode?, notes? }
 *   POST   { id, action: 'create_deal' }  — qualify into a CRM deal
 *   DELETE ?id=  — remove a lead (spam, test)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const sp = new URL(request.url).searchParams
    let q = auth.supabase.from('property_leads').select('*').order('created_at', { ascending: false }).limit(300)
    const status = sp.get('status')
    const kind = sp.get('kind')
    if (status && (LEAD_STATUSES as readonly string[]).includes(status)) q = q.eq('status', status)
    else q = q.neq('status', 'spam')
    if (kind && (LEAD_KINDS as readonly string[]).includes(kind)) q = q.eq('kind', kind)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ids = (data || []).map((l) => l.id)
    const [{ data: viewings }, { data: team }] = await Promise.all([
      ids.length ? auth.supabase.from('property_viewings').select('*').in('lead_id', ids) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      auth.supabase.from('profiles').select('id, full_name').in('role', ['admin', 'super_admin']).eq('status', 'approved').order('full_name'),
    ])
    const byLead = new Map<string, unknown[]>()
    for (const v of viewings || []) {
      const k = (v as { lead_id: string }).lead_id
      byLead.set(k, [...(byLead.get(k) || []), v])
    }
    return NextResponse.json({ data: (data || []).map((l) => ({ ...l, viewings: byLead.get(l.id) || [] })), team: team || [] })
  } catch (err) {
    logError('api.admin.property-leads.get', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))

    if (body.viewing_id) {
      const update: Record<string, unknown> = {}
      if (body.status !== undefined) {
        if (!(VIEWING_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Invalid viewing status' }, { status: 400 })
        update.status = body.status
      }
      if (body.scheduled_at !== undefined) {
        const d = body.scheduled_at ? new Date(body.scheduled_at) : null
        if (d && Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
        update.scheduled_at = d ? d.toISOString() : null
      }
      if (body.mode !== undefined) {
        if (!['in_person', 'video'].includes(body.mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
        update.mode = body.mode
      }
      if (body.notes !== undefined) update.notes = String(body.notes || '').slice(0, 2000) || null
      const { data: v, error } = await auth.supabase.from('property_viewings').update(update).eq('id', body.viewing_id).select('lead_id, status').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      // Confirming a viewing moves an early-stage lead along.
      if (v?.status === 'confirmed') {
        await auth.supabase.from('property_leads').update({ status: 'viewing_booked' }).eq('id', v.lead_id).in('status', ['new', 'contacted', 'qualified'])
      }
      await logActivity({ actorId: auth.userId, action: 'property_viewing.updated', targetId: body.viewing_id, metadata: update })
      return NextResponse.json({ success: true })
    }

    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const update: Record<string, unknown> = {}
    if (body.status !== undefined) {
      if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      update.status = body.status
    }
    if (body.assigned_to !== undefined) {
      if (body.assigned_to) {
        const { data: p } = await auth.supabase.from('profiles').select('role').eq('id', body.assigned_to).maybeSingle()
        if (!p || !['admin', 'super_admin'].includes(p.role)) return NextResponse.json({ error: 'Leads can only be assigned to the admin team.' }, { status: 400 })
      }
      update.assigned_to = body.assigned_to || null
    }
    if (body.admin_notes !== undefined) update.admin_notes = String(body.admin_notes || '').slice(0, 5000) || null
    const { error } = await auth.supabase.from('property_leads').update(update).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logActivity({ actorId: auth.userId, action: 'property_lead.updated', targetId: body.id, metadata: { status: body.status } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.property-leads.patch', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { id, action } = await request.json().catch(() => ({}))
    if (!id || action !== 'create_deal') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    const db = auth.supabase
    const { data: lead } = await db.from('property_leads').select('*').eq('id', id).maybeSingle()
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (lead.deal_id) return NextResponse.json({ success: true, deal_id: lead.deal_id })

    const { data: listing } = lead.listing_id
      ? await db.from('property_listings').select('listing_type, price, currency').eq('id', lead.listing_id).maybeSingle()
      : { data: null }
    const d = dealFromLead({ kind: lead.kind as LeadKind, listing_title: lead.listing_title, name: lead.name, reference: lead.reference }, listing)

    // deals.country is a 2-letter code; map the market name via Admin → Locations.
    let country: string | null = null
    if (lead.country) {
      const { data: c } = await db.from('property_countries').select('country_code').ilike('name', lead.country).maybeSingle()
      country = c?.country_code || null
    }
    const { data: deal, error } = await db.from('deals').insert({
      title: d.title, kind: d.kind, stage: 'qualified', property_id: lead.listing_id, country,
      value_amount: d.value_amount, currency: d.currency, description: d.description,
      owner_id: lead.assigned_to || auth.userId, created_by: auth.userId,
    }).select('id').single()
    if (error || !deal) return NextResponse.json({ error: error?.message || 'Could not create the deal' }, { status: 500 })
    if (lead.contact_id) {
      await db.from('deal_parties').insert({ deal_id: deal.id, contact_id: lead.contact_id, role: d.role, created_by: auth.userId })
    }
    await db.from('property_leads').update({ deal_id: deal.id, status: lead.status === 'new' || lead.status === 'contacted' ? 'qualified' : lead.status }).eq('id', id)
    await logActivity({ actorId: auth.userId, action: 'property_lead.deal_created', targetId: id, metadata: { deal_id: deal.id } })
    return NextResponse.json({ success: true, deal_id: deal.id })
  } catch (err) {
    logError('api.admin.property-leads.post', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await auth.supabase.from('property_leads').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logActivity({ actorId: auth.userId, action: 'property_lead.deleted', targetId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.admin.property-leads.delete', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
