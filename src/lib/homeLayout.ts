// Home page layout (Phase 10): the order and visibility of the sections under
// the hero, set in Admin → Homepage and stored as portal_content 'homeLayout'
// (kept apart from 'home' so the Portal Content hero editor can't overwrite it).
// Pure module — safe for the client bundle.

// Shipped order = the "Global Property. One Trusted Partner." home page
// (2026-10-01). Sections marked off: true are still available in Admin →
// Homepage but start hidden, so the page stays short and brand-led.
export const HOME_SECTIONS = [
  { key: 'featured', label: 'Featured properties', hint: 'Listings marked Featured below come first.' },
  { key: 'map', label: 'Explore on the map', hint: 'Every live listing as a pin. Hidden automatically when no listing can be placed.' },
  { key: 'markets', label: 'Explore global markets', hint: 'One card per active market (order: Admin → Locations).' },
  { key: 'sourcing', label: 'Personal property sourcing', hint: '"Can\u2019t find what you\u2019re looking for?" — leads to the property request form.' },
  { key: 'compare', label: 'Compare property markets', hint: 'Built from live listings; nothing is shown that the data does not support.' },
  { key: 'projects', label: 'Off-plan & new developments', hint: 'Published developments.' },
  { key: 'about', label: 'Why CZAAH Properties', hint: '' },
  { key: 'howItWorks', label: 'How it works', hint: 'Four steps.' },
  { key: 'insights', label: 'Insights & property guides', hint: '' },
  { key: 'owner', label: 'Sell / list your property', hint: 'Call to action for owners and developers.' },
  { key: 'cta', label: 'Speak to an advisor', hint: 'Closing call to action.' },
  { key: 'showcase', label: 'Latest projects showcase', hint: 'Full-screen panels of the newest listings with photos.', off: true },
  { key: 'investments', label: 'Investment opportunities', hint: 'Categories with live counts.', off: true },
  { key: 'destinations', label: 'Destinations', hint: 'City guides.', off: true },
  { key: 'whyInvest', label: 'Why invest', hint: 'Edited in Portal Content → Why invest.', off: true },
  { key: 'clients', label: 'Clients strip', hint: '', off: true },
  { key: 'testimonials', label: 'Testimonials', hint: 'Only shows when testimonials exist (Portal Content).', off: true },
  { key: 'stats', label: 'Stats band', hint: '', off: true },
] as const
export type HomeSectionKey = (typeof HOME_SECTIONS)[number]['key']
export interface HomeSectionSetting { key: HomeSectionKey; visible: boolean }

const KEYS = HOME_SECTIONS.map((s) => s.key) as HomeSectionKey[]
const startsVisible = (key: HomeSectionKey) => !(HOME_SECTIONS.find((s) => s.key === key) as { off?: boolean }).off
export const DEFAULT_HOME_LAYOUT: HomeSectionSetting[] = KEYS.map((key) => ({ key, visible: startsVisible(key) }))

/**
 * A stored layout, made safe: known keys only, each once, in the stored order;
 * any section added to the site since is appended with its shipped visibility,
 * so a new section never silently disappears. Anything unusable gives the default layout.
 */
export function normaliseHomeLayout(stored: unknown): HomeSectionSetting[] {
  const list = stored && typeof stored === 'object' && Array.isArray((stored as { sections?: unknown }).sections)
    ? (stored as { sections: unknown[] }).sections
    : null
  if (!list) return DEFAULT_HOME_LAYOUT
  const seen = new Set<string>()
  const out: HomeSectionSetting[] = []
  for (const raw of list) {
    const r = (raw || {}) as { key?: unknown; visible?: unknown }
    if (typeof r.key !== 'string' || !KEYS.includes(r.key as HomeSectionKey) || seen.has(r.key)) continue
    seen.add(r.key)
    out.push({ key: r.key as HomeSectionKey, visible: r.visible !== false })
  }
  for (const key of KEYS) if (!seen.has(key)) out.push({ key, visible: startsVisible(key) })
  return out
}

/** What the admin may save: the same rules, plus at least one visible section. */
export function validateHomeLayout(data: unknown): { sections?: HomeSectionSetting[]; error?: string } {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { sections?: unknown }).sections)) return { error: 'Send { sections: [...] }.' }
  const sections = normaliseHomeLayout(data)
  if (!sections.some((s) => s.visible)) return { error: 'At least one section must stay visible.' }
  return { sections }
}
