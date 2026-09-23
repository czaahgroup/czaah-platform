// Location-aware browsing: /buy/uk/london, /rent/uae/dubai …
//
// Reads the active tree from Admin → Locations (portalRuntime), so a market
// switched on there gets its pages and suggestions with no code change.
// Browser-safe: it only touches the runtime copy, never the database.
import type { CountryNode, CityNode, LocationTree } from '@/lib/propertyLocations';
import { portalLocations } from './portalRuntime';
import type { LiveProperty } from './types';

export type Section = 'buy' | 'rent';

export interface ResolvedLocation {
  country: CountryNode;
  city: CityNode | null;
}

/** Country by its slug or ISO code ("uk", "gb", "uae", "ae"). */
export function findCountry(tree: LocationTree | null, slug: string | undefined): CountryNode | null {
  if (!tree || !slug) return null;
  const s = slug.toLowerCase();
  for (const r of tree) {
    for (const c of r.countries) {
      if (c.slug === s || c.code.toLowerCase() === s) return c;
    }
  }
  return null;
}

/**
 * The location a /buy|/rent path names, or null when it names nothing that is
 * switched on. `undefined` slugs mean "no location" and resolve to null too.
 */
export function resolveLocation(
  tree: LocationTree | null,
  countrySlug?: string,
  citySlug?: string,
): ResolvedLocation | null {
  const country = findCountry(tree, countrySlug);
  if (!country) return null;
  if (!citySlug) return { country, city: null };
  const city = country.cities.find((c) => c.slug === citySlug.toLowerCase()) || null;
  return city ? { country, city } : null;
}

export function locationHref(section: Section, country?: CountryNode | null, city?: CityNode | null) {
  let path = `/property-portal/${section}`;
  if (country) path += `/${country.slug}`;
  if (country && city) path += `/${city.slug}`;
  return path;
}

/** Does this listing sit in the location? Compared by name, as listings store it. */
export function inLocation(p: Pick<LiveProperty, 'country' | 'city'>, loc: ResolvedLocation | null) {
  if (!loc) return true;
  if ((p.country || '').trim().toLowerCase() !== loc.country.name.toLowerCase()) return false;
  if (loc.city && (p.city || '').trim().toLowerCase() !== loc.city.name.toLowerCase()) return false;
  return true;
}

/** Country names that read with "the": "in the United Kingdom". */
function withArticle(country: string) {
  return /^(United |Netherlands$|Philippines$|Czech Republic$|Dominican Republic$|Bahamas$|Maldives$)/.test(country)
    ? `the ${country}`
    : country;
}

/** "London, United Kingdom", or "the United Kingdom" for a whole country. */
export function locationLabel(loc: ResolvedLocation | null) {
  if (!loc) return '';
  return loc.city ? `${loc.city.name}, ${loc.country.name}` : withArticle(loc.country.name);
}

// ── Suggestions for the location search box ─────────────────────────────

export interface Suggestion {
  kind: 'country' | 'city' | 'area' | 'development' | 'developer';
  /** What the visitor sees, e.g. "Dubai Marina". */
  label: string;
  /** Context, e.g. "Dubai, United Arab Emirates". */
  detail: string;
  countrySlug?: string;
  citySlug?: string;
  /** Free-text term applied as a search filter (areas, developers). */
  term?: string;
  /** Direct link (developments). */
  href?: string;
}

export interface DevelopmentLite {
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  developer_name?: string | null;
}

export function locationSuggestions(tree: LocationTree | null = portalLocations()): Suggestion[] {
  const out: Suggestion[] = [];
  for (const r of tree || []) {
    for (const c of r.countries) {
      out.push({ kind: 'country', label: c.name, detail: r.name, countrySlug: c.slug });
      for (const ci of c.cities) {
        out.push({ kind: 'city', label: ci.name, detail: c.name, countrySlug: c.slug, citySlug: ci.slug });
        for (const a of ci.areas) {
          out.push({ kind: 'area', label: a.name, detail: `${ci.name}, ${c.name}`, countrySlug: c.slug, citySlug: ci.slug, term: a.name });
        }
      }
    }
  }
  return out;
}

export function developmentSuggestions(devs: DevelopmentLite[]): Suggestion[] {
  const out: Suggestion[] = [];
  const developers = new Map<string, DevelopmentLite>();
  for (const d of devs) {
    out.push({
      kind: 'development',
      label: d.name,
      detail: [d.city, d.country].filter(Boolean).join(', ') || 'Development',
      href: `/property-portal/developments/${d.slug}`,
    });
    if (d.developer_name && !developers.has(d.developer_name.toLowerCase())) developers.set(d.developer_name.toLowerCase(), d);
  }
  for (const d of developers.values()) {
    out.push({ kind: 'developer', label: d.developer_name!, detail: 'Developer', term: d.developer_name! });
  }
  return out;
}

/**
 * Ranks suggestions for what was typed. Every word must match somewhere in
 * the label or its context ("dubai mar" → Dubai Marina); a label that starts
 * with the query ranks first, then word starts, then anything containing it.
 */
export function rankSuggestions(all: Suggestion[], query: string, limit = 8): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const kindOrder: Record<Suggestion['kind'], number> = { city: 0, area: 1, country: 2, development: 3, developer: 4 };
  const scored: { s: Suggestion; score: number }[] = [];
  for (const s of all) {
    const label = s.label.toLowerCase();
    const hay = `${label} ${s.detail.toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 3;
    if (label.startsWith(q)) score = 0;
    else if (label.split(/[\s,-]+/).some((w) => w.startsWith(words[words.length - 1])) && words.every((w) => hay.includes(w))) score = 1;
    else if (label.includes(q)) score = 2;
    scored.push({ s, score: score * 10 + kindOrder[s.kind] });
  }
  return scored.sort((a, b) => a.score - b.score || a.s.label.localeCompare(b.s.label)).slice(0, limit).map((x) => x.s);
}
