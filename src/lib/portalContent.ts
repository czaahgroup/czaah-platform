import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { CURRENCIES, FX_PER_USD } from '@/lib/currencies'
// The shipped office list is the default, imported rather than copied so the
// two cannot drift.
import { OFFICES, PORTAL_EMAIL } from '@/app/property-portal/_components/offices'
import { DESTINATIONS } from '@/app/property-portal/_components/destinations'
import { INSIGHTS } from '@/app/property-portal/_components/insights-data'

/**
 * Editable content and settings for property.czaah.com.
 *
 * The rule here is that the database only ever *overrides*. Every section has a
 * default below — the values the site shipped with — and a stored row is merged
 * over it. An empty table, a missing key, a malformed row or a failed request
 * therefore all render exactly what the site rendered before any of this
 * existed. Nothing an editor does in the admin panel can leave a blank page.
 */

export type PortalContentKey = 'settings' | 'home' | 'offices' | 'destinations' | 'insights'
export const PORTAL_CONTENT_KEYS: PortalContentKey[] = [
  'settings',
  'home',
  'offices',
  'destinations',
  'insights',
]

export interface PortalSettings {
  /** Countries whose approved listings appear on the portal. */
  countries: string[]
  /** Currencies offered in the display-currency switcher. */
  currencies: string[]
  /** Units of each currency per 1 USD. Approximate, for comparison only. */
  fxPerUsd: Record<string, number>
  /**
   * Per-jurisdiction acquisition costs on detail pages. Off until a qualified
   * adviser has signed off the rates — see acquisitionCosts.ts.
   */
  acquisitionCostEnabled: boolean
}

export interface HeroClip {
  key: string
  label: string
  video: string
  poster: string
}

export interface HomeContent {
  /** Clips for the home hero, in order. */
  heroReel: HeroClip[]
}

export interface OfficesContent {
  offices: { city: string; role: string; lines: string[] }[]
  email: string
}

export const PORTAL_DEFAULTS = {
  settings: {
    countries: ['Pakistan', 'United Kingdom', 'United Arab Emirates'],
    currencies: CURRENCIES,
    fxPerUsd: FX_PER_USD,
    acquisitionCostEnabled: false,
  } as PortalSettings,
  home: {
    // The reel the site shipped with. Editing the list in admin replaces it;
    // clearing it falls back to these rather than leaving the hero blank.
    heroReel: [
      { key: 'night-skyline', label: 'City at night', video: '/videos/night-skyline.mp4', poster: '/videos/night-skyline.jpg' },
      { key: 'dubai-villa-daynight', label: 'Dubai', video: '/videos/dubai-villa-daynight.mp4', poster: '/videos/dubai-villa-daynight.jpg' },
      { key: 'night-river', label: 'City at night', video: '/videos/night-river.mp4', poster: '/videos/night-river.jpg' },
      { key: 'dubai-villa', label: 'Dubai', video: '/videos/dubai-villa.mp4', poster: '/videos/dubai-villa.jpg' },
      { key: 'night-towers', label: 'City at night', video: '/videos/night-towers.mp4', poster: '/videos/night-towers.jpg' },
      { key: 'dubai-playground', label: 'Dubai', video: '/videos/dubai-playground.mp4', poster: '/videos/dubai-playground.jpg' },
    ],
  } as HomeContent,
  offices: {
    offices: OFFICES,
    email: PORTAL_EMAIL,
  } as OfficesContent,
  destinations: DESTINATIONS as unknown,
  insights: INSIGHTS as unknown,
}

export type PortalContent = {
  settings: PortalSettings
  home: HomeContent
  offices: OfficesContent
  destinations: unknown
  insights: unknown
}

/**
 * Merges a stored row over a default.
 *
 * Only keys the default knows about are taken, and only when the stored value
 * is the same shape. A row written by an older admin build, or hand-edited into
 * a wrong type, falls back key by key rather than breaking the page.
 */
export function mergeSection<T>(fallback: T, stored: unknown): T {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return fallback
  if (!fallback || typeof fallback !== 'object') return (stored as T) ?? fallback

  const out = { ...(fallback as Record<string, unknown>) }
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!(key in out)) continue
    const current = out[key]
    if (value == null) continue
    if (Array.isArray(current) && !Array.isArray(value)) continue
    if (!Array.isArray(current) && typeof current !== typeof value) continue
    out[key] = value
  }
  return out as T
}

/** Reads every section, merged over the defaults. Never throws. */
export async function loadPortalContent(): Promise<PortalContent> {
  const defaults: PortalContent = {
    settings: PORTAL_DEFAULTS.settings,
    home: PORTAL_DEFAULTS.home,
    offices: PORTAL_DEFAULTS.offices,
    destinations: PORTAL_DEFAULTS.destinations,
    insights: PORTAL_DEFAULTS.insights,
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('portal_content').select('key, data')
    if (error || !data) return defaults

    const stored = new Map(data.map((row) => [row.key as PortalContentKey, row.data]))

    return {
      settings: mergeSection(defaults.settings, stored.get('settings')),
      home: mergeSection(defaults.home, stored.get('home')),
      offices: mergeSection(defaults.offices, stored.get('offices')),
      // These two are whole documents rather than objects with known keys, so
      // they are taken as-is or not at all.
      destinations: stored.get('destinations') ?? defaults.destinations,
      insights: stored.get('insights') ?? defaults.insights,
    }
  } catch (err) {
    // A portal that renders its shipped content beats a portal that 500s.
    logError('lib.portalContent.load', err)
    return defaults
  }
}

/** Validation for what an admin submits. Returns problems, empty when valid. */
export function validateSection(key: PortalContentKey, data: unknown): string[] {
  const errors: string[] = []

  // destinations and insights are stored as plain arrays.
  if (key === 'destinations' || key === 'insights') {
    if (!Array.isArray(data)) return ['This section must be a list.']
    if (data.length === 0) {
      return ['The list is empty. Remove the override instead — Reset to default restores the shipped entries.']
    }
    const seen = new Set<string>()
    data.forEach((raw, i) => {
      const item = (raw || {}) as Record<string, unknown>
      const id = String((key === 'destinations' ? item.slug : item.id) || '').trim()
      const title = String((key === 'destinations' ? item.city : item.title) || '').trim()
      const idField = key === 'destinations' ? 'slug' : 'id'
      const titleField = key === 'destinations' ? 'city' : 'title'
      if (!id) errors.push(`Entry ${i + 1} needs a ${idField}.`)
      else if (seen.has(id)) errors.push(`"${id}" is used twice — each entry needs its own ${idField}.`)
      else seen.add(id)
      if (!title) errors.push(`Entry ${i + 1} needs a ${titleField}.`)
    })
    return errors
  }

  if (!data || typeof data !== 'object') return ['Content must be an object.']
  const value = data as Record<string, unknown>

  if (key === 'settings') {
    const countries = value.countries
    if (!Array.isArray(countries) || countries.length === 0) {
      errors.push('At least one country is required, or the portal would list nothing.')
    }
    const currencies = value.currencies
    if (!Array.isArray(currencies) || currencies.length === 0) {
      errors.push('At least one currency is required.')
    }
    const fx = value.fxPerUsd as Record<string, unknown> | undefined
    if (fx && typeof fx === 'object') {
      for (const ccy of (currencies as string[]) || []) {
        const rate = Number(fx[ccy])
        if (!Number.isFinite(rate) || rate <= 0) {
          errors.push(`${ccy} needs an exchange rate greater than zero, or prices cannot be converted.`)
        }
      }
    }
  }

  if (key === 'offices') {
    const email = String(value.email || '')
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('Contact email is not a valid address.')
  }

  return errors
}
