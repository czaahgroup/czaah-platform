/**
 * Thin Cloudflare Workers AI wrapper for CZAAH Mail's AI actions
 * (draft / improve / translate / summarise). Edge-safe: plain fetch, no SDK.
 *
 * Uses the Workers AI REST API so it works identically in local dev and in
 * production (the platform deploys on Cloudflare via OpenNext). Needs:
 *   CLOUDFLARE_ACCOUNT_ID   — your Cloudflare account id
 *   CLOUDFLARE_AI_API_TOKEN — API token with the "Workers AI" permission
 *   MAIL_AI_MODEL           — optional model override
 *
 * Workers AI has a free daily allowance and does not train on inputs. Keep the
 * model in sync with the PRICE table in api/mail/dashboard/route.ts.
 */

const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export function aiConfigured(): boolean {
  return !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_AI_API_TOKEN
}

function model(): string {
  return process.env.MAIL_AI_MODEL || DEFAULT_MODEL
}

export async function aiMessage({
  system,
  user,
  maxTokens = 1600,
}: {
  system: string
  user: string
  maxTokens?: number
}): Promise<{ text: string; model: string; inputTokens: number; outputTokens: number }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_AI_API_TOKEN
  if (!accountId || !token) throw new Error('Workers AI is not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN).')

  const m = model()
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${m}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
      }),
    }
  )

  const json: any = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) {
    const msg = json?.errors?.[0]?.message || `Workers AI error (${res.status}).`
    throw new Error(msg)
  }

  const text = String(json?.result?.response || '').trim()
  if (!text) throw new Error('The AI returned an empty response.')

  const usage = json?.result?.usage || {}
  return {
    text,
    model: m,
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
  }
}

/** Flatten a stored message row to plain text for thread context. */
export function messageToPlain(msg: { body_text?: string | null; body_html?: string | null }): string {
  if (msg.body_text && msg.body_text.trim()) return msg.body_text.trim()
  if (!msg.body_html) return ''
  return msg.body_html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Wrap a plain-text AI result in minimal HTML when it came back without markup. */
export function textToHtml(text: string): string {
  return (text || '')
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
    .join('')
}
