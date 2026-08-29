import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'
import { aiConfigured, aiMessage, messageToPlain, textToHtml } from '@/lib/mailAi'


const COMPANY = 'CZAAH Group'

export async function GET() {
  return NextResponse.json({ configured: aiConfigured() })
}

export async function POST(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error

  if (!aiConfigured()) {
    return NextResponse.json({ error: 'AI is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN.' }, { status: 503 })
  }

  const { action, threadId, text, targetLang, tone, instruction } = await request.json()

  // Resolve the acting mailbox (for signature voice + audit).
  let mailbox: any = null
  if (access.isSuperAdmin) {
    if (threadId) {
      const { data: t } = await access.supabase
        .from('mailbox_threads')
        .select('mailbox_id, partner_mailboxes(id, address, display_name)')
        .eq('id', threadId)
        .maybeSingle()
      mailbox = Array.isArray(t?.partner_mailboxes) ? t?.partner_mailboxes[0] : t?.partner_mailboxes
    }
  } else if (access.ownMailboxId) {
    const { data: m } = await access.supabase
      .from('partner_mailboxes')
      .select('id, address, display_name')
      .eq('id', access.ownMailboxId)
      .maybeSingle()
    mailbox = m
  }
  const senderName = mailbox?.display_name || mailbox?.address || 'the CZAAH team'

  // Optionally load thread context.
  let contextBlock = ''
  let threadRow: any = null
  if (threadId && (action === 'draft' || action === 'summarize')) {
    const { data: thread } = await access.supabase
      .from('mailbox_threads')
      .select('id, subject, external_address, mailbox_id')
      .eq('id', threadId)
      .maybeSingle()
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    if (!access.isSuperAdmin && thread.mailbox_id !== access.ownMailboxId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    threadRow = thread
    const { data: msgs } = await access.supabase
      .from('mailbox_messages')
      .select('direction, from_address, body_text, body_html, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(12)
    contextBlock = (msgs || [])
      .map((m) => `[${m.direction === 'outbound' ? senderName : m.from_address}] ${messageToPlain(m).slice(0, 2000)}`)
      .join('\n\n---\n\n')
  }

  let system = ''
  let user = ''
  let maxTokens = 1600

  if (action === 'draft') {
    system =
      `You draft professional business email replies for ${senderName} at ${COMPANY}. ` +
      `Match a courteous, concise, confident corporate tone. British English. ` +
      `Do not invent facts, figures, names, dates or commitments that are not in the thread — ` +
      `where a detail is needed but unknown, use a clear placeholder like [DATE] or [AMOUNT]. ` +
      `Return ONLY the reply body as clean HTML using <p>, <ul><li> and <strong> — no subject line, ` +
      `no greeting placeholders beyond a normal salutation, no signature (it is appended automatically).`
    user =
      (tone ? `Desired tone: ${tone}.\n` : '') +
      (instruction ? `Instruction from ${senderName}: ${instruction}\n\n` : '') +
      `Thread with ${threadRow?.external_address || 'the recipient'} — subject "${threadRow?.subject || ''}":\n\n${contextBlock}\n\n` +
      `Write ${senderName}'s next reply.`
  } else if (action === 'improve') {
    if (!String(text || '').trim()) return NextResponse.json({ error: 'Nothing to improve.' }, { status: 400 })
    system =
      `You polish business email drafts for ${COMPANY}. Improve clarity, grammar, flow and professionalism ` +
      `while preserving the author's meaning, intent and any specific facts/figures exactly. British English. ` +
      (tone ? `Target tone: ${tone}. ` : '') +
      `Return ONLY the revised body as clean HTML (<p>, <ul><li>, <strong>). No commentary.`
    user = `Draft to improve:\n\n${text}`
  } else if (action === 'translate') {
    if (!String(text || '').trim()) return NextResponse.json({ error: 'Nothing to translate.' }, { status: 400 })
    if (!String(targetLang || '').trim()) return NextResponse.json({ error: 'Target language required.' }, { status: 400 })
    system =
      `You are a professional translator for corporate correspondence. Translate the email body into ${targetLang}, ` +
      `preserving tone, formatting, names, numbers and any placeholders. Return ONLY the translated body as clean HTML. No notes.`
    user = text
    maxTokens = 2400
  } else if (action === 'summarize') {
    system =
      `Summarise this email thread for an internal CRM note: who the parties are, what was asked, what was agreed, ` +
      `and any open action items with owners. British English. Return 3–6 short bullet points as plain text (no HTML).`
    user = `Subject: ${threadRow?.subject || ''}\nCounterparty: ${threadRow?.external_address || ''}\n\n${contextBlock}`
    maxTokens = 700
  } else {
    return NextResponse.json({ error: 'Unknown AI action.' }, { status: 400 })
  }

  let result
  try {
    result = await aiMessage({ system, user, maxTokens })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI request failed.' }, { status: 502 })
  }

  // Best-effort audit log.
  access.supabase
    .from('mail_ai_events')
    .insert({
      mailbox_id: mailbox?.id || null,
      actor_id: access.userId,
      thread_id: threadId || null,
      action,
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
    })
    .then(() => {}, () => {})

  const isHtml = action !== 'summarize'
  const looksHtml = /<[a-z][\s\S]*>/i.test(result.text)
  return NextResponse.json({
    result: isHtml && !looksHtml ? textToHtml(result.text) : result.text,
    isHtml,
    model: result.model,
  })
}
