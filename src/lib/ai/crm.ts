/**
 * Phase-2 AI helpers for the CRM / business modules.
 *
 * Model access goes through the existing Cloudflare Workers AI wrapper
 * (src/lib/mailAi.ts); this module adds:
 *   - entity context assembly for prompts
 *   - the ai_actions audit write
 *
 * Everything degrades cleanly: when Workers AI is not configured the
 * callers return { configured: false } rather than erroring.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

export const AI_ENTITIES = ['contact', 'company', 'deal', 'construction_project', 'commodity_trade'] as const
export type AiEntity = (typeof AI_ENTITIES)[number]

const SOURCES: Record<AiEntity, { table: string; columns: string; title: (r: any) => string }> = {
  contact: { table: 'crm_contacts', columns: 'id, name, email, phone, title, type, stage, source, tags, notes, created_at, company:crm_companies(name)', title: (r) => r.name },
  company: { table: 'crm_companies', columns: 'id, name, domain, website, country, company_size, stage, org_type, kyc_status, jurisdiction, description, created_at', title: (r) => r.name },
  deal: { table: 'deals', columns: 'id, reference, title, kind, stage, value_amount, agreed_amount, currency, probability, expected_close, closed_at, description, created_at', title: (r) => r.title },
  construction_project: { table: 'construction_projects', columns: 'id, reference, name, project_type, status, progress_pct, site_location, contract_value, budget, currency, start_date, target_completion, description, created_at', title: (r) => r.name },
  commodity_trade: { table: 'commodity_trades', columns: 'id, reference, title, desk, side, status, commodity, grade, quantity, quantity_unit, price_basis, incoterm, load_port, discharge_port, laycan_start, laycan_end, notes, created_at', title: (r) => r.title },
}

/** Build a compact plain-text digest of an entity plus its recent notes. */
export async function buildEntityContext(type: AiEntity, id: string): Promise<{ title: string; text: string } | null> {
  const db = createAdminClient()
  const src = SOURCES[type]
  const { data: row } = await db.from(src.table).select(src.columns).eq('id', id).maybeSingle()
  if (!row) return null

  const lines: string[] = [`${type.replace(/_/g, ' ')}:`]
  for (const [k, v] of Object.entries(row)) {
    if (v == null || v === '' || k === 'id') continue
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
    lines.push(`  ${k}: ${val}`)
  }

  const { data: notes } = await db.from('crm_notes')
    .select('body, created_at, author:profiles!crm_notes_author_id_fkey(full_name)')
    .eq('related_type', type).eq('related_id', id)
    .order('created_at', { ascending: false }).limit(15)
  if (notes?.length) {
    lines.push('', 'recent notes (newest first):')
    for (const n of notes) lines.push(`  - [${new Date(n.created_at).toISOString().slice(0, 10)}] ${String(n.body).replace(/\s+/g, ' ').slice(0, 400)}`)
  }

  const { data: tasks } = await db.from('crm_tasks')
    .select('title, status, due_at').eq('related_type', type).eq('related_id', id)
    .order('created_at', { ascending: false }).limit(10)
  if (tasks?.length) {
    lines.push('', 'tasks:')
    for (const t of tasks) lines.push(`  - ${t.title} (${t.status}${t.due_at ? `, due ${new Date(t.due_at).toISOString().slice(0, 10)}` : ''})`)
  }

  return { title: src.title(row) || type, text: lines.join('\n') }
}

export interface AiActionLog {
  actorId: string | null
  actionType: string
  relatedType?: AiEntity
  relatedId?: string | null
  model?: string | null
  promptSummary?: string | null
  output?: string | null
  status?: 'ok' | 'error' | 'not_configured'
  error?: string | null
  tokensIn?: number
  tokensOut?: number
}

export async function logAIAction(a: AiActionLog): Promise<void> {
  try {
    await createAdminClient().from('ai_actions').insert({
      actor_id: a.actorId,
      action_type: a.actionType,
      related_type: a.relatedType ?? null,
      related_id: a.relatedId ?? null,
      model: a.model ?? null,
      prompt_summary: a.promptSummary ? a.promptSummary.slice(0, 500) : null,
      output: a.output ? a.output.slice(0, 8000) : null,
      status: a.status ?? 'ok',
      error: a.error ? String(a.error).slice(0, 1000) : null,
      tokens_in: a.tokensIn ?? 0,
      tokens_out: a.tokensOut ?? 0,
    })
  } catch (e) {
    logError('ai.logAction', e, { actionType: a.actionType })
  }
}
