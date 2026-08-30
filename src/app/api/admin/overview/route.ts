import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

const OPEN_ENQ = ['submitted', 'assigned', 'active', 'waiting']
const OPEN_OPP = ['draft', 'submitted', 'more_info_required', 'approved', 'in_progress']

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString()
    const thirtyAgo = new Date(now.getTime() - 30 * 864e5).toISOString()
    const eod = new Date(); eod.setHours(23, 59, 59, 999)
    const count = (q: any) => q.select('*', { count: 'exact', head: true })

    const [
      totalMembers, pendingKYC, totalEnquiries, unassignedEnquiries, activeEnquiries, totalAdmins,
      clients, companies, newLeads7d, openOpps,
      tasksToday, tasksOverdue, mailIn30, mailOut30, resolvedEnq,
    ] = await Promise.all([
      count(db.from('profiles')).eq('role', 'member'),
      count(db.from('profiles')).eq('status', 'pending_kyc_review').eq('role', 'member'),
      count(db.from('enquiries')),
      count(db.from('enquiries')).eq('status', 'submitted'),
      count(db.from('enquiries')).in('status', ['assigned', 'active', 'waiting']),
      count(db.from('profiles')).eq('role', 'admin'),
      count(db.from('crm_contacts')).eq('type', 'client'),
      count(db.from('crm_companies')),
      count(db.from('enquiries')).gte('created_at', weekAgo),
      count(db.from('partner_opportunities')).in('status', OPEN_OPP),
      count(db.from('crm_tasks')).eq('status', 'open').lte('due_at', eod.toISOString()),
      count(db.from('crm_tasks')).eq('status', 'open').lt('due_at', now.toISOString()),
      count(db.from('mailbox_messages')).eq('direction', 'inbound').gte('created_at', thirtyAgo),
      count(db.from('mailbox_messages')).eq('direction', 'outbound').gte('created_at', thirtyAgo),
      count(db.from('enquiries')).eq('status', 'resolved'),
    ])

    const { data: recentEnq } = await db
      .from('enquiries').select('created_at')
      .gte('created_at', new Date(now.getTime() - 14 * 864e5).toISOString())
    const leadsSeries: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const key = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10)
      leadsSeries.push({ date: key, count: (recentEnq || []).filter((e) => e.created_at.slice(0, 10) === key).length })
    }

    const { data: opps } = await db.from('partner_opportunities').select('status').in('status', OPEN_OPP)
    const pipelineByStage: Record<string, number> = {}
    for (const o of opps || []) pipelineByStage[o.status] = (pipelineByStage[o.status] || 0) + 1

    const total = totalEnquiries.count ?? 0
    return NextResponse.json({
      // legacy fields (existing /admin page)
      totalMembers: totalMembers.count ?? 0,
      pendingKYC: pendingKYC.count ?? 0,
      totalEnquiries: total,
      unassignedEnquiries: unassignedEnquiries.count ?? 0,
      activeEnquiries: activeEnquiries.count ?? 0,
      totalAdmins: totalAdmins.count ?? 0,
      // CRM dashboard fields
      clients: clients.count ?? 0,
      companies: companies.count ?? 0,
      activeLeads: activeEnquiries.count ?? 0,
      newLeads7d: newLeads7d.count ?? 0,
      openOpportunities: openOpps.count ?? 0,
      tasksDueToday: tasksToday.count ?? 0,
      tasksOverdue: tasksOverdue.count ?? 0,
      mailInbound30d: mailIn30.count ?? 0,
      mailOutbound30d: mailOut30.count ?? 0,
      conversionRate: total ? Math.round(((resolvedEnq.count ?? 0) / total) * 100) : 0,
      leadsSeries,
      pipelineByStage,
    })
  } catch (err) {
    logError('api.admin.overview', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
