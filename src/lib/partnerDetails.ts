/**
 * The partner details a super admin may edit from Admin → Partners: name,
 * email, phone and company. Only keys that were sent are returned, so a
 * partial edit leaves the rest alone. Pure module.
 */

import { escapeHtml } from '@/lib/escapeHtml'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface PartnerDetails {
  full_name?: string
  email?: string
  phone?: string | null
  company_name?: string | null
}

export function cleanPartnerDetails(input: unknown): { data?: PartnerDetails; error?: string } {
  if (!input || typeof input !== 'object') return { error: 'Nothing to change.' }
  const body = input as Record<string, unknown>
  const data: PartnerDetails = {}
  const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

  if (body.fullName !== undefined) {
    const name = text(body.fullName, 120)
    if (!name) return { error: 'A name is required.' }
    data.full_name = name
  }
  if (body.email !== undefined) {
    const email = text(body.email, 254).toLowerCase()
    if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' }
    data.email = email
  }
  if (body.phone !== undefined) {
    const phone = text(body.phone, 40)
    if (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone)) return { error: 'Enter a valid phone number, or leave it empty.' }
    data.phone = phone || null
  }
  if (body.companyName !== undefined) data.company_name = text(body.companyName, 160) || null

  if (!Object.keys(data).length) return { error: 'Nothing to change.' }
  return { data }
}

/**
 * The notice sent when an admin changes a partner's sign-in email — one to
 * the address that stopped working, one to the address that now works. The
 * old address is told so that a change the partner did not expect is noticed.
 */
export function emailChangeNotice(to: 'old' | 'new', p: { name: string; oldEmail: string; newEmail: string }): { subject: string; html: string } {
  const name = escapeHtml(p.name || 'Partner')
  const oldEmail = escapeHtml(p.oldEmail)
  const newEmail = escapeHtml(p.newEmail)
  const body = to === 'new'
    ? `
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">Dear ${name},</p>
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        The sign-in email for your CZAAH Partner Network account is now <strong style="color: #fff;">${newEmail}</strong>
        (it was ${oldEmail}). Your password has not changed.
      </p>
      <a href="https://czaah.com/login" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">Sign in &rarr;</a>`
    : `
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">Dear ${name},</p>
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">
        The sign-in email for your CZAAH Partner Network account was changed from this address to
        <strong style="color: #fff;">${newEmail}</strong>. This address can no longer be used to sign in. Your password has not changed.
      </p>`
  return {
    subject: 'Your CZAAH Partner Network sign-in email has changed',
    html: `
    <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">PARTNER NETWORK</p>
      </div>
      <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
        <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">Sign-in email changed</h2>${body}
        <p style="color: rgba(255,255,255,0.5); line-height: 1.6; font-size: 13px; margin-top: 24px;">
          This change was made by CZAAH. If you were not expecting it, please contact us at
          <a href="mailto:info@czaah.com" style="color: #C9A84C;">info@czaah.com</a>.
        </p>
      </div>
    </div>`,
  }
}
