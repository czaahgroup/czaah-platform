import { PORTAL_DEFAULTS, type PortalContent, type PortalSettings, type HeroClip } from '@/lib/portalContent'

/**
 * Portal settings as mutable runtime state.
 *
 * The portal's countries, currencies and FX table are read from module scope by
 * pure helpers (convertPrice) and by hooks that run on first render, so a React
 * context alone would arrive too late — the listings request fires before any
 * effect could update it. The server layout seeds this synchronously before
 * children render, which means the first paint already has the stored values.
 *
 * It starts as the shipped defaults, so anything importing it before the seed —
 * a unit test, a component rendered outside the portal — still works.
 */
let runtime: PortalContent = {
  settings: PORTAL_DEFAULTS.settings,
  home: PORTAL_DEFAULTS.home,
  offices: PORTAL_DEFAULTS.offices,
  destinations: PORTAL_DEFAULTS.destinations,
  insights: PORTAL_DEFAULTS.insights,
}

export function seedPortalRuntime(content: PortalContent | null | undefined) {
  if (!content) return
  runtime = content
}

export function portalSettings(): PortalSettings {
  return runtime.settings
}

export function portalHeroReel(): HeroClip[] {
  const reel = runtime.home?.heroReel
  // An empty reel would mean a black hero; fall back to the shipped clips.
  return reel && reel.length ? reel : PORTAL_DEFAULTS.home.heroReel
}

export function portalOffices() {
  const offices = runtime.offices?.offices
  return offices && offices.length ? offices : PORTAL_DEFAULTS.offices.offices
}

export function portalEmail(): string {
  return runtime.offices?.email || PORTAL_DEFAULTS.offices.email
}
