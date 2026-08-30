import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, safeTerm } from '@/lib/crmAuth'
import { aiConfigured, aiMessage } from '@/lib/mailAi'
import { logAIAction } from '@/lib/ai/crm'
import { logError } from '@/lib/logError'

/**
 * POST /api/ai/ask  { question }
 *   Retrieval-augmented Q&A over the CRM and modules. Pulls records whose
 *   name/title matches keywords in the question, feeds them to the model,
 *   and returns an answer plus the sources it was given. Admin only.
 */
const STOP = new Set(['the', 'and', 'for', 'with', 'what', 'which', 'who', 'whom', 'whose', 'how', 'many', 'much', 'our', 'are', 'have', 'has', 'this', 'that', 'from', 'about', 'any', 'all', 'show', 'list', 'give', 'tell', 'does', 'did', 'was', 'were', 'will', 'can', 'into', 'their', 'them', 'they'])
const HREF: Record<string, (id: string) => string> = {
  contact: (id) => `/admin/crm/contacts/${id}`,
  company: (id) => `/admin/crm/companies/${id}`,
  deal: (id) => `/admin/crm/deals/${id}`,
  construction_project: (id) => `/admin/construction/projects/${id}`,
  commodity_trade: (id) => `/admin/trading/trades/${id}`,
}

export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const b = await request.json().catch(() => ({}))
    const question = String(b.question || '').trim().slice(0, 500)
    if (question.length < 3) return NextResponse.json({ error: 'Ask a question.' }, { status: 400 })

    const terms = [...new Set(safeTerm(question).toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 6)
    const db = access.supabase
    const sources: { type: string; id: string; label: string; href: string | null }[] = []
    const ctxBlocks: string[] = []

    if (terms.length) {
      const ors = terms.map((t) => `%${t}%`)
      const runSearch = async (table: string, cols: string, nameCol: string, type: string, fmt: (r: any) => string) => {
        let q = db.from(table).select(cols).limit(8)
        q = q.or(ors.map((p) => `${nameCol}.ilike.${p}`).join(','))
        const { data } = await q
        for (const r of data || []) {
          sources.push({ type, id: r.id, label: fmt(r), href: HREF[type]?.(r.id) || null })
          const bits = Object.entries(r).filter(([k, v]) => v != null && v !== '' && k !== 'id').map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
          ctxBlocks.push(`${type} [${r.id.slice(0, 8)}]: ${bits.join(', ')}`)
        }
      }
      await Promise.all([
        runSearch('crm_contacts', 'id, name, email, type, stage, title', 'name', 'contact', (r) => r.name),
        runSearch('crm_companies', 'id, name, domain, country, stage, org_type', 'name', 'company', (r) => r.name),
        runSearch('deals', 'id, reference, title, stage, value_amount, currency, probability, expected_close', 'title', 'deal', (r) => `${r.reference} ${r.title}`),
        runSearch('construction_projects', 'id, reference, name, status, progress_pct, target_completion', 'name', 'construction_project', (r) => `${r.reference} ${r.name}`),
        runSearch('commodity_trades', 'id, reference, title, status, commodity, quantity, quantity_unit, incoterm', 'title', 'commodity_trade', (r) => `${r.reference} ${r.title}`),
      ])
    }

    if (!aiConfigured()) {
      await logAIAction({ actorId: access.userId, actionType: 'ask', status: 'not_configured', promptSummary: question })
      return NextResponse.json({ configured: false, message: 'The knowledge assistant is not switched on yet.', sources })
    }

    const system = `You are CZAAH's internal knowledge assistant. Answer the user's question using ONLY the records below.
If the records do not contain the answer, say so plainly and suggest what to search for. Never invent figures or names.
Be direct and brief. When you cite a record, use its short id in brackets.`
    const user = `question: ${question}\n\nrecords:\n${ctxBlocks.length ? ctxBlocks.join('\n') : '(no records matched the question)'}`

    try {
      const r = await aiMessage({ system, user, maxTokens: 500 })
      await logAIAction({
        actorId: access.userId, actionType: 'ask', model: r.model,
        promptSummary: question, output: r.text, status: 'ok', tokensIn: r.inputTokens, tokensOut: r.outputTokens,
      })
      // de-dupe sources
      const seen = new Set<string>()
      const uniq = sources.filter((s) => { const k = `${s.type}:${s.id}`; if (seen.has(k)) return false; seen.add(k); return true })
      return NextResponse.json({ configured: true, answer: r.text, sources: uniq })
    } catch (aiErr) {
      await logAIAction({ actorId: access.userId, actionType: 'ask', status: 'error', error: aiErr instanceof Error ? aiErr.message : String(aiErr), promptSummary: question })
      return NextResponse.json({ error: 'The AI service could not answer that.' }, { status: 502 })
    }
  } catch (err) {
    logError('api.ai.ask', err)
    return NextResponse.json({ error: 'Could not answer that question.' }, { status: 500 })
  }
}
