import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { aiConfigured, aiMessage } from '@/lib/mailAi'
import { AI_ENTITIES, AiEntity, buildEntityContext, logAIAction } from '@/lib/ai/crm'
import { logError } from '@/lib/logError'

const SYSTEM = `You are a concise briefing assistant for CZAAH, an international business advisory group.
Given a structured record and its notes, write a short internal briefing for the account owner.
Rules: 4-6 sentences maximum. Lead with where things stand. Call out the single most useful next
action. Never invent facts that are not in the record. Plain text, no headings, no markdown.`

/**
 * POST /api/ai/briefing  { type, id }
 *   Returns { configured: false } when Workers AI is not set up, otherwise
 *   { configured: true, text }. Every call is written to ai_actions.
 */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const type = b.type as AiEntity
    const id = b.id
    if (!AI_ENTITIES.includes(type) || !id) {
      return NextResponse.json({ error: 'A valid type and id are required.' }, { status: 400 })
    }

    const ctx = await buildEntityContext(type, id)
    if (!ctx) return NextResponse.json({ error: 'Record not found.' }, { status: 404 })

    if (!aiConfigured()) {
      await logAIAction({ actorId: access.userId, actionType: 'briefing', relatedType: type, relatedId: id, status: 'not_configured' })
      return NextResponse.json({
        configured: false,
        message: 'AI briefings are not switched on yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN to enable them.',
      })
    }

    try {
      const r = await aiMessage({ system: SYSTEM, user: ctx.text, maxTokens: 400 })
      await logAIAction({
        actorId: access.userId, actionType: 'briefing', relatedType: type, relatedId: id,
        model: r.model, promptSummary: `briefing for ${type} "${ctx.title}"`, output: r.text,
        status: 'ok', tokensIn: r.inputTokens, tokensOut: r.outputTokens,
      })
      return NextResponse.json({ configured: true, text: r.text })
    } catch (aiErr) {
      await logAIAction({
        actorId: access.userId, actionType: 'briefing', relatedType: type, relatedId: id,
        status: 'error', error: aiErr instanceof Error ? aiErr.message : String(aiErr),
      })
      return NextResponse.json({ error: 'The AI service could not complete that request.' }, { status: 502 })
    }
  } catch (err) {
    logError('api.ai.briefing', err)
    return NextResponse.json({ error: 'Could not generate a briefing.' }, { status: 500 })
  }
}
