import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { aiConfigured, aiMessage } from '@/lib/mailAi'
import { logAIAction } from '@/lib/ai/crm'
import { logError } from '@/lib/logError'

/**
 * GET /api/crm/risk-radar[?summary=1]
 *   Deterministic scan across deals, construction projects and trades for
 *   things that need attention (stalled, overdue, mismatched). Admin only.
 *   With ?summary=1 and Workers AI configured, also returns a short
 *   narrative.
 */
const DAY = 864e5
const OPEN_DEAL = ['lead', 'qualified', 'proposal', 'negotiation', 'due_diligence', 'agreement']
const LATE_DEAL_STAGE = ['negotiation', 'due_diligence', 'agreement']
const ACTIVE_PROJECT = ['planning', 'tendering', 'awarded', 'in_progress', 'on_hold']
const OPEN_TRADE = ['inquiry', 'offer', 'negotiation', 'contract', 'nomination', 'in_transit', 'delivered']

export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const db = access.supabase
    const now = Date.now()
    const today = new Date().toISOString().slice(0, 10)
    const d21 = new Date(now - 21 * DAY).toISOString()
    const d21d = new Date(now - 21 * DAY).toISOString().slice(0, 10)

    const [deals, projects, trades, tradeSteps, projUpdates, dealEvents, overdueTasks] = await Promise.all([
      db.from('deals').select('id, reference, title, stage, probability, expected_close, updated_at').in('stage', OPEN_DEAL),
      db.from('construction_projects').select('id, reference, name, status, progress_pct, target_completion, updated_at').in('status', ACTIVE_PROJECT),
      db.from('commodity_trades').select('id, reference, title, status, laycan_end, created_at, updated_at').in('status', OPEN_TRADE),
      db.from('trade_steps').select('trade_id, name, status').eq('status', 'blocked'),
      db.from('construction_updates').select('project_id, report_date'),
      db.from('audit_log').select('target_id, created_at').eq('target_type', 'deal').gte('created_at', d21),
      db.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('status', 'open').lt('due_at', new Date().toISOString()),
    ])

    const alerts: any[] = []
    const add = (severity: string, category: string, message: string, href: string | null) =>
      alerts.push({ severity, category, message, href })

    const dealActive = new Set((dealEvents.data || []).map((e: any) => e.target_id))
    for (const x of deals.data || []) {
      if (x.expected_close && x.expected_close < today)
        add('high', 'Deal overdue', `${x.reference} "${x.title}" passed its expected close (${x.expected_close}) and is still ${x.stage}.`, `/admin/crm/deals/${x.id}`)
      else if (LATE_DEAL_STAGE.includes(x.stage) && !dealActive.has(x.id) && x.updated_at < d21)
        add('medium', 'Deal stalled', `${x.reference} "${x.title}" is in ${x.stage} with no activity for 3+ weeks.`, `/admin/crm/deals/${x.id}`)
      if ((x.probability || 0) >= 60 && ['lead', 'qualified'].includes(x.stage))
        add('low', 'Stage mismatch', `${x.reference} is at ${x.probability}% but only stage ${x.stage}.`, `/admin/crm/deals/${x.id}`)
    }

    const lastUpd: Record<string, string> = {}
    for (const u of projUpdates.data || []) if (!lastUpd[u.project_id] || u.report_date > lastUpd[u.project_id]) lastUpd[u.project_id] = u.report_date
    for (const x of projects.data || []) {
      if (x.target_completion && x.target_completion < today && x.status !== 'completed' && x.status !== 'handover')
        add('high', 'Project overdue', `${x.reference} "${x.name}" is past target completion (${x.target_completion}) at ${x.progress_pct}%.`, `/admin/construction/projects/${x.id}`)
      if (x.status === 'in_progress' && (!lastUpd[x.id] || lastUpd[x.id] < d21d))
        add('medium', 'No site update', `${x.reference} "${x.name}" has had no progress update in 3+ weeks.`, `/admin/construction/projects/${x.id}`)
      if (x.status === 'in_progress' && (x.progress_pct || 0) === 0)
        add('low', 'No progress logged', `${x.reference} "${x.name}" is in progress but shows 0%.`, `/admin/construction/projects/${x.id}`)
    }

    const blockedByTrade: Record<string, string[]> = {}
    for (const s of tradeSteps.data || []) (blockedByTrade[s.trade_id] ||= []).push(s.name)
    for (const x of trades.data || []) {
      if (x.laycan_end && x.laycan_end < today && !['delivered', 'settled', 'closed'].includes(x.status))
        add('high', 'Laycan passed', `${x.reference} "${x.title}" is past laycan (${x.laycan_end}) at status ${x.status}.`, `/admin/trading/trades/${x.id}`)
      if (blockedByTrade[x.id]?.length)
        add('medium', 'Blocked step', `${x.reference} "${x.title}" has blocked step(s): ${blockedByTrade[x.id].join(', ')}.`, `/admin/trading/trades/${x.id}`)
      if (['inquiry', 'offer', 'negotiation'].includes(x.status) && x.created_at < new Date(now - 30 * DAY).toISOString())
        add('low', 'Trade ageing', `${x.reference} "${x.title}" has sat in ${x.status} for over a month.`, `/admin/trading/trades/${x.id}`)
    }

    const overdue = overdueTasks.count ?? 0
    if (overdue > 0) add(overdue > 10 ? 'high' : 'medium', 'Overdue tasks', `${overdue} CRM task${overdue === 1 ? ' is' : 's are'} past due.`, '/admin/crm/tasks')

    const order = { high: 0, medium: 1, low: 2 } as any
    alerts.sort((a, b) => order[a.severity] - order[b.severity])
    const counts = { high: alerts.filter((a) => a.severity === 'high').length, medium: alerts.filter((a) => a.severity === 'medium').length, low: alerts.filter((a) => a.severity === 'low').length }

    let summary: string | null = null
    if (request.nextUrl.searchParams.get('summary') === '1' && alerts.length && aiConfigured()) {
      try {
        const r = await aiMessage({
          system: 'You are a portfolio risk analyst for CZAAH. Given a list of alerts, write 3-4 sentences: the overall picture, then the two items to tackle first. Plain text, no markdown.',
          user: alerts.map((a) => `[${a.severity}] ${a.category}: ${a.message}`).join('\n'),
          maxTokens: 300,
        })
        summary = r.text
        await logAIAction({ actorId: access.userId, actionType: 'risk_summary', model: r.model, output: r.text, status: 'ok', tokensIn: r.inputTokens, tokensOut: r.outputTokens })
      } catch (e) {
        await logAIAction({ actorId: access.userId, actionType: 'risk_summary', status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({ counts, alerts, summary, aiAvailable: aiConfigured() })
  } catch (err) {
    logError('api.crm.risk-radar.get', err)
    return NextResponse.json({ error: 'Could not run the risk scan.' }, { status: 500 })
  }
}
