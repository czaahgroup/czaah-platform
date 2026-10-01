import type { SupabaseClient } from '@supabase/supabase-js'
import { insertUnit } from '@/lib/developments'
import { slugify } from '@/lib/plots'
import { logError } from '@/lib/logError'
import type { CleanNewDeveloper, CleanUnit } from '@/lib/partnerDevelopments'

/**
 * Server-side writes shared by the partner development routes.
 */

/**
 * Adds a developer a partner proposed, unless one with that name already
 * exists (then the existing one is simply used). A proposed developer is
 * inactive — not shown on the portal — until an admin switches it on in
 * Admin → Developers.
 */
export async function proposeDeveloper(
  supabase: SupabaseClient,
  userId: string,
  dev: CleanNewDeveloper & { logo_url?: string | null },
): Promise<{ created: boolean; name: string; error?: string }> {
  const pattern = dev.name.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data: existing } = await supabase.from('property_developers').select('name').ilike('name', pattern).maybeSingle()
  if (existing) return { created: false, name: existing.name }

  const base = slugify(dev.name) || 'developer'
  for (let n = 1; n <= 20; n++) {
    const { error } = await supabase.from('property_developers').insert({
      name: dev.name,
      slug: n === 1 ? base : `${base}-${n}`,
      website: dev.website,
      description: dev.description,
      logo_url: dev.logo_url || null,
      active: false,
      verification_status: 'pending',
      created_by: userId,
    })
    if (!error) return { created: true, name: dev.name }
    // 23505 = the slug (or, in a race, the name) is taken; try the next slug.
    if (error.code !== '23505') {
      logError('lib.partnerDevelopmentStore', error, { step: 'propose-developer' })
      return { created: false, name: dev.name, error: error.message }
    }
  }
  return { created: false, name: dev.name, error: 'Could not add the developer.' }
}

/** Replaces a project's units (and their payment plans) with the submitted set. */
export async function replaceUnits(
  supabase: SupabaseClient,
  developmentId: string,
  units: CleanUnit[],
  currency: string,
): Promise<{ error?: string; warnings: string[] }> {
  // Plans and instalments cascade from the unit.
  const { error: clearError } = await supabase.from('development_units').delete().eq('development_id', developmentId)
  if (clearError) return { error: clearError.message, warnings: [] }

  const warnings: string[] = []
  for (let i = 0; i < units.length; i++) {
    const result = await insertUnit(supabase, developmentId, units[i], i, currency)
    if (result.error) return { error: `Unit ${i + 1}: ${result.error}`, warnings }
    if (result.warning) warnings.push(`${units[i].title}: ${result.warning}`)
  }
  return { warnings }
}
