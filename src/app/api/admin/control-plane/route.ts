import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { aiConfigured, aiMessage } from '@/lib/mailAi'
import { logAIAction } from '@/lib/ai/crm'
import { logError } from '@/lib/logError'

/**
 * GET /api/admin/control-plane — one cross-module snapshot for super admins.
 *
 * Aggregates the CRM plus every Phase-3 module (directory, recruitment,
 * deals, construction, trading) into a single payload, with a merged
 * recent-activity feed from audit_log.
 */
const ACTIVE_PROJECTS = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold']
const OPEN_TRADES = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered']
const PIPELINE_STAGES = ['sourced', 'shortlisted', 'interview', 'selected', 'offer', 'medical', 'visa', 'ticketing']

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
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const wantNarrative = request.nextUrl.searchParams.get('narrative') === '1'

    const count = (q: any) => q.select('*', { count: 'exact', head: true })
    const now = new Date()
    const q30 = new Date(now.getTime() - 30 * 864e5).toISOString()
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10)

    const [
      contacts, companies, orgRows, activeLeads,
      dealRows, dealsWonQtr,
      openOrders, pipelineRows, deployed30,
      projectRows,
      openTradeRows, tradesSettledQtr, activeShipments,
      documents, recent,
    ] = await Promise.all([
      count(db.from('crm_contacts')),
      count(db.from('crm_companies')),
      db.from('crm_companies').select('org_type'),
      count(db.from('enquiries')).in('status', ['assigned', 'active', 'waiting']),
      db.from('deals').select('value_amount, probability, stage'),
      count(db.from('deals')).eq('stage', 'closed_won').gte('closed_at', quarterStart),
      count(db.from('recruitment_job_orders')).in('status', ['open', 'partially_filled']),
      db.from('recruitment_placements').select('stage'),
      count(db.from('recruitment_placements')).eq('stage', 'deployed').gte('stage_changed_at', q30),
      db.from('construction_projects').select('status, progress_pct, contract_value'),
      db.from('commodity_trades').select('status, quantity, price_amount'),
      count(db.from('commodity_trades')).eq('status', 'settled').gte('updated_at', quarterStart),
      count(db.from('trade_shipments')).in('status', ['nominated', 'loading', 'sailed', 'arrived']),
      count(db.from('crm_documents')),
      db.from('audit_log')
        .select('id, action, target_type, target_id, created_at, actor:profiles!audit_log_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const openDeals = (dealRows.data || []).filter((d: any) => !['closed_won', 'closed_lost'].includes(d.stage))
    const weightedPipeline = Math.round(openDeals.reduce((s: number, d: any) => s + ((Number(d.value_amount) || 0) * (d.probability || 0)) / 100, 0))

    const orgByType: Record<string, number> = {}
    for (const r of orgRows.data || []) orgByType[r.org_type || 'company'] = (orgByType[r.org_type || 'company'] || 0) + 1

    const pipelineActive = (pipelineRows.data || []).filter((r: any) => PIPELINE_STAGES.includes(r.stage)).length

    const projects = projectRows.data || []
    const activeProjects = projects.filter((p: any) => ACTIVE_PROJECTS.includes(p.status))
    const avgProgress = activeProjects.length
      ? Math.round(activeProjects.reduce((s: number, p: any) => s + (p.progress_pct || 0), 0) / activeProjects.length) : 0
    const constructionContractValue = Math.round(activeProjects.reduce((s: number, p: any) => s + (Number(p.contract_value) || 0), 0))

    const trades = openTradeRows.data || []
    const openTrades = trades.filter((t: any) => OPEN_TRADES.includes(t.status))
    const tradeNotional = Math.round(openTrades.reduce((s: number, t: any) => s + ((Number(t.quantity) || 0) * (Number(t.price_amount) || 0)), 0))

    const payload: any = {
      crm: {
        contacts: contacts.count ?? 0,
        companies: companies.count ?? 0,
        orgByType,
        activeLeads: activeLeads.count ?? 0,
        documents: documents.count ?? 0,
      },
      deals: {
        open: openDeals.length,
        weightedPipeline,
        wonThisQuarter: dealsWonQtr.count ?? 0,
      },
      recruitment: {
        openOrders: openOrders.count ?? 0,
        inPipeline: pipelineActive,
        deployedLast30d: deployed30.count ?? 0,
      },
      construction: {
        activeProjects: activeProjects.length,
        avgProgress,
        contractValue: constructionContractValue,
      },
      trading: {
        openTrades: openTrades.length,
        notionalOpen: tradeNotional,
        settledThisQuarter: tradesSettledQtr.count ?? 0,
        activeShipments: activeShipments.count ?? 0,
      },
      recent: (recent.data || []).map((r: any) => ({
        id: r.id, action: r.action, targetType: r.target_type, targetId: r.target_id,
        actor: r.actor?.full_name || 'System', at: r.created_at,
      })),
      aiAvailable: aiConfigured(),
    }

    if (wantNarrative && aiConfigured()) {
      try {
        const facts = [
          `CRM: ${payload.crm.contacts} contacts, ${payload.crm.companies} companies, ${payload.crm.activeLeads} active leads`,
          `Deals: ${payload.deals.open} open, weighted pipeline ${payload.deals.weightedPipeline}, ${payload.deals.wonThisQuarter} won this quarter`,
          `Recruitment: ${payload.recruitment.openOrders} open orders, ${payload.recruitment.inPipeline} candidates in pipeline, ${payload.recruitment.deployedLast30d} deployed in 30d`,
          `Construction: ${payload.construction.activeProjects} active projects, avg ${payload.construction.avgProgress}% complete, contract value ${payload.construction.contractValue}`,
          `Trading: ${payload.trading.openTrades} open trades, open notional ${payload.trading.notionalOpen}, ${payload.trading.activeShipments} shipments moving`,
        ].join('\n')
        const r = await aiMessage({
          system: 'You are the chief of staff for CZAAH. Given this snapshot, write 3-4 sentences for the leadership team: the overall state of the business, what is going well, and the one area that needs attention. Plain text, no markdown.',
          user: facts, maxTokens: 300,
        })
        payload.narrative = r.text
        await logAIAction({ actorId: user.id, actionType: 'exec_narrative', model: r.model, output: r.text, status: 'ok', tokensIn: r.inputTokens, tokensOut: r.outputTokens })
      } catch (e) {
        await logAIAction({ actorId: user.id, actionType: 'exec_narrative', status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json(payload)
  } catch (err) {
    logError('api.admin.control-plane', err)
    return NextResponse.json({ error: 'Could not load the control plane.' }, { status: 500 })
  }
}
