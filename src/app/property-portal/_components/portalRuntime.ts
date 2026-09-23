import type { PortalContent, PortalSettings, HeroClip } from '@/lib/portalContent'
import { OFFICES, PORTAL_EMAIL } from './offices'

/**
 * Portal settings as mutable runtime state.
 *
 * The portal's countries, currencies and FX table are read from module scope by
 * pure helpers (convertPrice) and by hooks that run on first render, so a React
 * context alone would arrive too late — the listings request fires before any
 * effect could update it. The server layout seeds this synchronously before
 * children render, so the first paint already has the stored values.
 *
 * This module deliberately imports NOTHING from portalContent at runtime — the
 * type import above is erased. portalContent imports the shipped destinations
 * and insights for its defaults, and those modules import this one, so a value
 * import here would close the cycle and leave the defaults undefined at module
 * initialisation. Every getter therefore returns null when nothing is stored
 * and each caller supplies its own shipped fallback.
 */

const DEFAULT_HERO_REEL: HeroClip[] = [
  { key: 'night-skyline', label: 'City at night', video: '/videos/night-skyline.mp4', poster: '/videos/night-skyline.jpg' },
  { key: 'dubai-villa-daynight', label: 'Dubai', video: '/videos/dubai-villa-daynight.mp4', poster: '/videos/dubai-villa-daynight.jpg' },
  { key: 'night-river', label: 'City at night', video: '/videos/night-river.mp4', poster: '/videos/night-river.jpg' },
  { key: 'dubai-villa', label: 'Dubai', video: '/videos/dubai-villa.mp4', poster: '/videos/dubai-villa.jpg' },
  { key: 'night-towers', label: 'City at night', video: '/videos/night-towers.mp4', poster: '/videos/night-towers.jpg' },
  { key: 'dubai-playground', label: 'Dubai', video: '/videos/dubai-playground.mp4', poster: '/videos/dubai-playground.jpg' },
]

let runtime: PortalContent | null = null

export function seedPortalRuntime(content: PortalContent | null | undefined) {
  if (content) runtime = content
}

/** Null until the layout seeds it; callers fall back to their own defaults. */
export function portalSettings(): PortalSettings | null {
  return runtime?.settings ?? null
}

/** An empty reel would render a black hero, so fall back to the shipped clips. */
export function portalHeroReel(): HeroClip[] {
  const reel = runtime?.home?.heroReel
  return Array.isArray(reel) && reel.length ? reel : DEFAULT_HERO_REEL
}

export function portalOffices() {
  const offices = runtime?.offices?.offices
  return Array.isArray(offices) && offices.length ? offices : OFFICES
}

export function portalEmail(): string {
  return runtime?.offices?.email || PORTAL_EMAIL
}

/** Null when nothing is stored — destinations.ts supplies the shipped list. */
export function portalDestinations(): unknown[] | null {
  const list = runtime?.destinations as unknown[] | undefined
  return Array.isArray(list) && list.length ? list : null
}

export function portalInsights(): unknown[] | null {
  const list = runtime?.insights as unknown[] | undefined
  return Array.isArray(list) && list.length ? list : null
}

/** Null when nothing is stored — portal-content.ts supplies the shipped reasons. */
export function portalWhyInvest(): unknown[] | null {
  const list = runtime?.whyInvest as unknown[] | undefined
  return Array.isArray(list) && list.length ? list : null
}

/**
 * Null when nothing is stored. An empty stored list is returned as-is: an
 * editor may deliberately choose to show no testimonials.
 */
export function portalTestimonials(): unknown[] | null {
  const list = runtime?.testimonials as unknown[] | undefined
  return Array.isArray(list) ? list : null
}
