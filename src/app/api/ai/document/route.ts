import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { aiConfigured, aiMessage } from '@/lib/mailAi'
import { AI_ENTITIES, AiEntity, buildEntityContext, logAIAction } from '@/lib/ai/crm'
import { logError } from '@/lib/logError'

export const DOC_TYPES: Record<string, { label: string; prompt: string; words: string }> = {
  cover_letter: {
    label: 'Cover letter',
    words: '150-220 words',
    prompt: 'Write a formal cover letter from CZAAH to the counterparty introducing this matter and proposing next steps.',
  },
  mou_outline: {
    label: 'MoU outline',
    words: '250-400 words',
    prompt: 'Draft a Memorandum of Understanding OUTLINE with numbered clauses (Parties, Purpose, Scope, Responsibilities, Commercials, Confidentiality, Term, Governing law). Mark anything not in the record as "[to be confirmed]". This is a drafting aid, not a signed instrument.',
  },
  proposal_summary: {
    label: 'Proposal summary',
    words: '180-260 words',
    prompt: 'Write a one-page proposal summary suitable for a decision-maker: the opportunity, what CZAAH proposes, commercials, and the ask.',
  },
  meeting_brief: {
    label: 'Meeting brief',
    words: '120-180 words',
    prompt: 'Write an internal pre-meeting brief: where things stand, the objective for the meeting, likely objections, and the outcome to push for.',
  },
  client_update: {
    label: 'Client status update',
    words: '120-180 words',
    prompt: 'Write a short, reassuring client-facing status update on progress. No internal-only detail, no financial internals the client would not already know.',
  },
}

/**
 * POST /api/ai/document  { type, id, docType, instructions? }
 *   -> { configured:false } | { title, body }
 */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const type = b.type as AiEntity
    const id = b.id
    const spec = DOC_TYPES[b.docType]
    if (!AI_ENTITIES.includes(type) || !id) return NextResponse.json({ error: 'A valid type and id are required.' }, { status: 400 })
    if (!spec) return NextResponse.json({ error: 'Unknown document type.' }, { status: 400 })

    const ctx = await buildEntityContext(type, id)
    if (!ctx) return NextResponse.json({ error: 'Record not found.' }, { status: 404 })

    if (!aiConfigured()) {
      await logAIAction({ actorId: access.userId, actionType: `document:${b.docType}`, relatedType: type, relatedId: id, status: 'not_configured' })
      return NextResponse.json({ configured: false, message: 'AI document drafting is not switched on yet.' })
    }

    const system = `You draft business documents for CZAAH, an international business advisory group.
${spec.prompt}
Length: ${spec.words}. British English. Plain text with simple line breaks — no markdown symbols.
Use only facts in the record; mark gaps as "[to be confirmed]". Never fabricate figures, dates or names.
Start with a single title line, then a blank line, then the document.`

    const instr = String(b.instructions || '').trim().slice(0, 500)
    const user = `${ctx.text}${instr ? `\n\nextra instructions: ${instr}` : ''}`

    try {
      const r = await aiMessage({ system, user, maxTokens: 900 })
      const lines = r.text.split('\n')
      const title = (lines[0] || spec.label).replace(/^#+\s*/, '').trim().slice(0, 200)
      const body = lines.slice(1).join('\n').trim() || r.text
      await logAIAction({
        actorId: access.userId, actionType: `document:${b.docType}`, relatedType: type, relatedId: id,
        model: r.model, promptSummary: `${spec.label} for ${type} "${ctx.title}"`, output: `${title}\n\n${body}`,
        status: 'ok', tokensIn: r.inputTokens, tokensOut: r.outputTokens,
      })
      return NextResponse.json({ configured: true, title, body })
    } catch (aiErr) {
      await logAIAction({
        actorId: access.userId, actionType: `document:${b.docType}`, relatedType: type, relatedId: id,
        status: 'error', error: aiErr instanceof Error ? aiErr.message : String(aiErr),
      })
      return NextResponse.json({ error: 'The AI service could not complete that request.' }, { status: 502 })
    }
  } catch (err) {
    logError('api.ai.document', err)
    return NextResponse.json({ error: 'Could not draft the document.' }, { status: 500 })
  }
}
