/**
 * The partner details a super admin may edit from Admin → Partners: name,
 * email, phone and company. Only keys that were sent are returned, so a
 * partial edit leaves the rest alone. Pure module.
 */

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
