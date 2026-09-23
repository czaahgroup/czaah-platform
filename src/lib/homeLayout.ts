// Home page layout (Phase 10): the order and visibility of the sections under
// the hero, set in Admin → Homepage and stored as portal_content 'homeLayout'
// (kept apart from 'home' so the Portal Content hero editor can't overwrite it).
// Pure module — safe for the client bundle.

export const HOME_SECTIONS = [
  { key: 'markets', label: 'Featured markets', hint: 'One card per active market (order: Admin → Locations).' },
  { key: 'showcase', label: 'Latest projects showcase', hint: 'Full-screen panels of the newest listings with photos.' },
  { key: 'featured', label: 'Featured listings', hint: 'Listings marked Featured below come first.' },
  { key: 'projects', label: 'New & off-plan projects', hint: 'Published developments.' },
  { key: 'investments', label: 'Investment opportunities', hint: 'Categories with live counts.' },
  { key: 'destinations', label: 'Destinations', hint: 'City guides.' },
  { key: 'about', label: 'About CZAAH Properties', hint: '' },
  { key: 'whyInvest', label: 'Why invest', hint: 'Edited in Portal Content → Why invest.' },
  { key: 'owner', label: 'Sell / let / list a development', hint: 'Calls to action for owners and developers.' },
  { key: 'clients', label: 'Clients strip', hint: '' },
  { key: 'testimonials', label: 'Testimonials', hint: 'Only shows when testimonials exist (Portal Content).' },
  { key: 'insights', label: 'Market insights', hint: '' },
  { key: 'stats', label: 'Stats band', hint: '' },
  { key: 'cta', label: 'Closing call to action', hint: '' },
] as const
export type HomeSectionKey = (typeof HOME_SECTIONS)[number]['key']
export interface HomeSectionSetting { key: HomeSectionKey; visible: boolean }

const KEYS = HOME_SECTIONS.map((s) => s.key) as HomeSectionKey[]
export const DEFAULT_HOME_LAYOUT: HomeSectionSetting[] = KEYS.map((key) => ({ key, visible: true }))

/**
 * A stored layout, made safe: known keys only, each once, in the stored order;
 * any section added to the site since is appended (visible), so a new section
 * never silently disappears. Anything unusable gives the default layout.
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
  for (const key of KEYS) if (!seen.has(key)) out.push({ key, visible: true })
  return out
}

/** What the admin may save: the same rules, plus at least one visible section. */
export function validateHomeLayout(data: unknown): { sections?: HomeSectionSetting[]; error?: string } {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { sections?: unknown }).sections)) return { error: 'Send { sections: [...] }.' }
  const sections = normaliseHomeLayout(data)
  if (!sections.some((s) => s.visible)) return { error: 'At least one section must stay visible.' }
  return { sections }
}
