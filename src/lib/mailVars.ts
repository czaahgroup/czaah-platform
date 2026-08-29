/**
 * Template variable substitution for CZAAH Mail.
 *
 * Templates (see TemplatesModal `VARS`) may contain these placeholders:
 *   {{recipient_name}}  {{recipient_email}}
 *   {{my_name}}         {{my_email}}
 *   {{subject}}         {{date}}
 *
 * `ctx` is the object MailAssist is handed by the composer / reply pane:
 *   { mailboxId, threadId?, recipientEmail?, subject?, myName?, myEmail? }
 */

export type MailVarContext = {
  mailboxId?: string
  threadId?: string
  recipientEmail?: string
  subject?: string
  myName?: string
  myEmail?: string
}

/** "jane.doe@acme.com" -> "Jane Doe" — best-effort display name from an address. */
function nameFromEmail(email?: string): string {
  if (!email) return ''
  const local = email.split('@')[0] || ''
  const words = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function resolveVars(text: string, ctx: MailVarContext = {}): string {
  if (!text) return ''

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const values: Record<string, string> = {
    recipient_name: nameFromEmail(ctx.recipientEmail),
    recipient_email: ctx.recipientEmail || '',
    my_name: ctx.myName || '',
    my_email: ctx.myEmail || '',
    subject: ctx.subject || '',
    date: today,
  }

  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const k = key.toLowerCase()
    return k in values ? values[k] : match
  })
}
