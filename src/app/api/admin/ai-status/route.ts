import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { aiConfigured } from '@/lib/mailAi'
import { logError } from '@/lib/logError'

/** GET /api/admin/ai-status — AI configuration + recent ai_actions (admin). */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const [{ data: recent }, { data: month }] = await Promise.all([
      access.supabase.from('ai_actions')
        .select('id, action_type, related_type, related_id, model, status, tokens_in, tokens_out, created_at, actor:profiles!ai_actions_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false }).limit(40),
      access.supabase.from('ai_actions').select('status, tokens_in, tokens_out').gte('created_at', since),
    ])

    const stats = { ok: 0, error: 0, not_configured: 0, tokensIn: 0, tokensOut: 0 }
    for (const r of month || []) {
      stats[r.status as 'ok'] = (stats[r.status as 'ok'] || 0) + 1
      stats.tokensIn += r.tokens_in || 0
      stats.tokensOut += r.tokens_out || 0
    }

    return NextResponse.json({
      configured: aiConfigured(),
      model: process.env.MAIL_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      stats,
      recent: (recent || []).map((r) => ({
        id: r.id, actionType: r.action_type, relatedType: r.related_type, relatedId: r.related_id,
        model: r.model, status: r.status, tokensIn: r.tokens_in, tokensOut: r.tokens_out,
        actor: r.actor?.full_name || 'System', at: r.created_at,
      })),
    })
  } catch (err) {
    logError('api.admin.ai-status', err)
    return NextResponse.json({ error: 'Could not load AI status.' }, { status: 500 })
  }
}
