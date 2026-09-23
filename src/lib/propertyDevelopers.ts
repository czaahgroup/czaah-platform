import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { DEVELOPMENT_COLUMNS, UNIT_COLUMNS } from '@/lib/developments'
import { allowedCountries } from '@/lib/propertyLocations'

/**
 * Developers (brief §10) and their projects, for the public portal. Server
 * only (service role). Only active developers and published projects in
 * active markets are ever returned; verification notes are never selected.
 */

const PUBLIC_DEVELOPER_COLUMNS = 'id, name, slug, logo_url, description, website, verification_status, active'

export interface PublicDeveloper {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  website: string | null
  verification_status: string
  countries: { id: string; name: string; slug: string }[]
  project_count: number
}

export interface ProjectRow {
  id: string
  name: string
  slug: string
  developer_name: string | null
  developer_id: string | null
  city: string | null
  country: string | null
  featured_image: string | null
  gallery: string[] | null
  currency: string | null
  development_status: string | null
  possession_status: string | null
  development_units?: { id: string; total_price: number | null; currency: string | null; plot_size: number | null; plot_size_unit: string | null; availability_status: string | null }[]
  has_payment_plan?: boolean
}

/** Published projects in active markets, optionally for one developer / country. */
export async function loadProjects(opts: { developerId?: string; country?: string } = {}): Promise<ProjectRow[]> {
  try {
    const supabase = createAdminClient()
    const markets = await allowedCountries(opts.country ? [opts.country] : null)
    let q = supabase
      .from('developments')
      .select(`${DEVELOPMENT_COLUMNS}, development_units(${UNIT_COLUMNS})`)
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
    if (markets) q = q.in('country', markets.length ? markets : ['__none__'])
    if (opts.developerId) q = q.eq('developer_id', opts.developerId)
    const { data, error } = await q
    if (error) {
      logError('lib.propertyDevelopers.projects', new Error(error.message))
      return []
    }
    const rows = (data || []) as unknown as ProjectRow[]
    const unitIds = rows.flatMap((d) => (d.development_units || []).map((u) => u.id))
    const planned = new Set<string>()
    if (unitIds.length) {
      const { data: plans } = await supabase.from('property_payment_plans').select('development_unit_id').in('development_unit_id', unitIds)
      for (const p of plans || []) if (p.development_unit_id) planned.add(p.development_unit_id)
    }
    return rows.map((d) => ({ ...d, has_payment_plan: (d.development_units || []).some((u) => planned.has(u.id)) }))
  } catch (err) {
    logError('lib.propertyDevelopers.projects', err)
    return []
  }
}

async function attach(devs: Record<string, unknown>[]): Promise<PublicDeveloper[]> {
  if (!devs.length) return []
  const supabase = createAdminClient()
  const ids = devs.map((d) => d.id as string)
  const [links, projects] = await Promise.all([
    supabase.from('property_developer_countries').select('developer_id, property_countries(id, name, slug, active)').in('developer_id', ids),
    loadProjects(),
  ])
  return devs.map((d) => ({
    ...(d as unknown as PublicDeveloper),
    countries: (links.data || [])
      .filter((l) => l.developer_id === d.id)
      .map((l) => l.property_countries as unknown as { id: string; name: string; slug: string; active: boolean })
      .filter((c) => c && c.active)
      .map(({ id, name, slug }) => ({ id, name, slug })),
    project_count: projects.filter((p) => p.developer_id === d.id).length,
  }))
}

export async function loadDevelopers(): Promise<PublicDeveloper[]> {
  try {
    const { data, error } = await createAdminClient()
      .from('property_developers')
      .select(PUBLIC_DEVELOPER_COLUMNS)
      .eq('active', true)
      .order('name')
    if (error) throw new Error(error.message)
    return attach(data || [])
  } catch (err) {
    logError('lib.propertyDevelopers.list', err)
    return []
  }
}

/** `undefined` = lookup failed (don't 404); `null` = no such active developer. */
export async function loadDeveloper(slug: string): Promise<PublicDeveloper | null | undefined> {
  try {
    const { data, error } = await createAdminClient()
      .from('property_developers')
      .select(PUBLIC_DEVELOPER_COLUMNS)
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()
    if (error) return undefined
    if (!data) return null
    return (await attach([data]))[0]
  } catch {
    return undefined
  }
}
