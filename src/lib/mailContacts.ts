/**
 * Contact directory helpers. `enrichEmails` cross-references an external
 * correspondent's address against CZAAH's own profile / partner records so the
 * contacts view can show a name, company and partner reference even before the
 * address has been manually annotated in `mail_contacts`.
 *
 * `supabase` is the service-role admin client from requireMailAccess.
 */

export type ContactEnrichment = {
  fullName?: string | null
  company?: string | null
  phone?: string | null
  country?: string | null
  website?: string | null
  role?: string | null
  partnerRef?: string | null
}

/** Lowercase + trim; returns '' for anything falsy or malformed. */
export function normEmail(value: unknown): string {
  const s = String(value || '').trim().toLowerCase()
  return s.includes('@') ? s : ''
}

export async function enrichEmails(
  supabase: any,
  emails: string[]
): Promise<Map<string, ContactEnrichment>> {
  const out = new Map<string, ContactEnrichment>()
  const wanted = [...new Set(emails.map(normEmail).filter(Boolean))]
  if (!wanted.length) return out

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, phone, country, company_website, role')
    .in('email', wanted)

  const profileByEmail = new Map<string, any>()
  for (const p of profiles || []) {
    const e = normEmail(p.email)
    if (e) profileByEmail.set(e, p)
  }

  const profileIds = [...profileByEmail.values()].map((p) => p.id)
  const partnerRefByProfile = new Map<string, string>()
  if (profileIds.length) {
    const { data: partners } = await supabase
      .from('partners')
      .select('profile_id, partner_id')
      .in('profile_id', profileIds)
    for (const row of partners || []) {
      if (row.profile_id && row.partner_id) partnerRefByProfile.set(row.profile_id, row.partner_id)
    }
  }

  for (const email of wanted) {
    const p = profileByEmail.get(email)
    if (!p) continue
    out.set(email, {
      fullName: p.full_name || null,
      company: p.company_name || null,
      phone: p.phone || null,
      country: p.country || null,
      website: p.company_website || null,
      role: p.role || null,
      partnerRef: partnerRefByProfile.get(p.id) || null,
    })
  }

  return out
}
