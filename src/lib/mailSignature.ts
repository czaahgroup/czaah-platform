/**
 * Builds the branded CZAAH email signature used by SignatureModal's "Branded"
 * mode. The `czaah.com/favicon` marker in the logo URL is what SignatureModal
 * looks for to decide whether a stored signature is branded or custom — keep it.
 */

const LOGO_URL = 'https://czaah.com/favicon/czaah-shared.png'

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildCzaahSignature({
  name,
  title,
  phone,
  email,
}: {
  name?: string
  title?: string
  phone?: string
  email?: string
}): string {
  const rows: string[] = []
  if (name) rows.push(`<div style="font-weight:700;color:#111;font-size:14px">${esc(name)}</div>`)
  if (title) rows.push(`<div style="color:#555;font-size:12px">${esc(title)} &middot; CZAAH Group</div>`)

  const contact: string[] = []
  if (phone) contact.push(esc(phone))
  if (email) contact.push(`<a href="mailto:${esc(email)}" style="color:#8a6d1d;text-decoration:none">${esc(email)}</a>`)
  contact.push(`<a href="https://czaah.com" style="color:#8a6d1d;text-decoration:none">czaah.com</a>`)
  rows.push(`<div style="color:#666;font-size:12px;margin-top:4px">${contact.join(' &nbsp;|&nbsp; ')}</div>`)

  return (
    `<table cellpadding="0" cellspacing="0" style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;border-collapse:collapse">` +
    `<tr>` +
    `<td style="padding-right:14px;border-right:2px solid #c9a84c;vertical-align:middle">` +
    `<img src="${LOGO_URL}" alt="CZAAH" width="42" height="42" style="display:block">` +
    `</td>` +
    `<td style="padding-left:14px;vertical-align:middle">${rows.join('')}</td>` +
    `</tr>` +
    `</table>`
  )
}
