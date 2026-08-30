import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess, scopeQuery } from '@/lib/crmAuth'
import { aiConfigured, aiMessage } from '@/lib/mailAi'
import { buildEntityContext, logAIAction } from '@/lib/ai/crm'
import { logError } from '@/lib/logError'

const SYSTEM = `You draft professional business emails for CZAAH, an international business advisory group.
You are given a CRM record for the recipient and a short instruction describing the email's purpose.
Write a ready-to-send email. First line must be "Subject: <subject>", then a blank line, then the body.
Keep it warm, direct and concise (120-180 words). British English. Sign off as "The CZAAH Team".
Use only facts present in the record or the instruction — never invent specifics.`

/**
 * POST /api/ai/draft-email  { contactId, intent, dealId? }
 *   -> { configured:false } | { subject, body }
 */
export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const b = await request.json().catch(() => ({}))
    const contactId = b.contactId
    const intent = String(b.intent || '').trim().slice(0, 600)
    if (!contactId) return NextResponse.json({ error: 'contactId is required.' }, { status: 400 })
    if (!intent) return NextResponse.json({ error: 'Describe what the email should say.' }, { status: 400 })

    let cq = access.supabase.from('crm_contacts').select('id, name').eq('id', contactId)
    cq = scopeQuery(cq, access, ['owner_id', 'created_by', 'profile_id'])
    const { data: contact } = await cq.maybeSingle()
    if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

    const ctx = await buildEntityContext('contact', contactId)
    let dealCtx = ''
    if (b.dealId) {
      const d = await buildEntityContext('deal', b.dealId)
      if (d) dealCtx = `\n\nrelated deal:\n${d.text}`
    }

    if (!aiConfigured()) {
      await logAIAction({ actorId: access.userId, actionType: 'draft_email', relatedType: 'contact', relatedId: contactId, status: 'not_configured' })
      return NextResponse.json({ configured: false, message: 'AI drafting is not switched on yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN.' })
    }

    const user = `${ctx?.text || `contact: ${contact.name}`}${dealCtx}\n\ninstruction: ${intent}`
    try {
      const r = await aiMessage({ system: SYSTEM, user, maxTokens: 500 })
      const m = r.text.match(/^\s*subject:\s*(.+?)\s*\n([\s\S]*)$/i)
      const subject = (m ? m[1] : `Message for ${contact.name}`).trim().slice(0, 200)
      const body = (m ? m[2] : r.text).trim()
      await logAIAction({
        actorId: access.userId, actionType: 'draft_email', relatedType: 'contact', relatedId: contactId,
        model: r.model, promptSummary: intent, output: `${subject}\n\n${body}`,
        status: 'ok', tokensIn: r.inputTokens, tokensOut: r.outputTokens,
      })
      return NextResponse.json({ configured: true, subject, body })
    } catch (aiErr) {
      await logAIAction({
        actorId: access.userId, actionType: 'draft_email', relatedType: 'contact', relatedId: contactId,
        status: 'error', error: aiErr instanceof Error ? aiErr.message : String(aiErr),
      })
      return NextResponse.json({ error: 'The AI service could not complete that request.' }, { status: 502 })
    }
  } catch (err) {
    logError('api.ai.draft-email', err)
    return NextResponse.json({ error: 'Could not draft the email.' }, { status: 500 })
  }
}
