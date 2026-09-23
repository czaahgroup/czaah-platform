import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { filterListings, SECTION_FILTER_PARAMS, type SearchSection } from '@/lib/listingSearch'
import { parseSearchPath, newSince, listedAt } from '@/lib/savedSearchAlerts'
import { cleanSearchPath } from '@/lib/buyerAccount'

const FX = { USD: 1, GBP: 0.8, PKR: 280, AED: 3.67 }
const L = (o: Record<string, unknown>) => ({ id: String(o.id), title: 't', location: '', city: 'Lahore', country: 'Pakistan', description: '', property_type: 'residential', listing_type: 'sale', price: 100000, currency: 'USD', bedrooms: 2, yield_percentage: null, ...o })
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort()
const P = (q: string) => new URLSearchParams(q)

const DATA = [
  L({ id: 'sale-cheap', price: 200000 }),
  L({ id: 'sale-pkr', price: 280_000_000, currency: 'PKR' }), // = $1M
  L({ id: 'offplan', listing_type: 'off_plan', price: 400000, bedrooms: 0 }),
  L({ id: 'rent-month', listing_type: 'rent', price: 1500, currency: 'GBP', furnishing: 'furnished' }), // $1,875/mo
  L({ id: 'rent-year', listing_type: 'lease', price: 24000, rent_period: 'year', property_type: 'commercial', city: 'London', country: 'United Kingdom' }), // $2,000/mo
  L({ id: 'plot', property_type: 'land', bedrooms: null, plot_size: 5, plot_size_unit: 'marla', corner_plot: true, development_name: 'Citi Canal Enclave' }),
  L({ id: 'yield', price: 900000, yield_percentage: 6, city: 'Dubai', country: 'United Arab Emirates', property_type: 'commercial' }),
]

test('buy: sales and off-plan only, with stage, price band in USD, beds', () => {
  expect(ids(filterListings(DATA, 'buy', P(''), { fxPerUsd: FX }))).toEqual(['offplan', 'plot', 'sale-cheap', 'sale-pkr', 'yield'])
  expect(ids(filterListings(DATA, 'buy', P('stage=off_plan'), { fxPerUsd: FX }))).toEqual(['offplan'])
  expect(ids(filterListings(DATA, 'buy', P('price=500000-1000000'), { fxPerUsd: FX }))).toEqual(['sale-pkr', 'yield'])
  expect(ids(filterListings(DATA, 'buy', P('beds=1'), { fxPerUsd: FX }))).toEqual(['sale-cheap', 'sale-pkr', 'yield'])
  expect(ids(filterListings(DATA, 'buy', P('market=dubai'), { fxPerUsd: FX }))).toEqual(['yield'])
})

test('buy/rent: location from the path', () => {
  const loc = { country: { name: 'Pakistan' }, city: { name: 'Lahore' } }
  expect(ids(filterListings(DATA, 'buy', P(''), { fxPerUsd: FX, loc }))).toEqual(['offplan', 'plot', 'sale-cheap', 'sale-pkr'])
  expect(ids(filterListings(DATA, 'rent', P(''), { fxPerUsd: FX, loc: { country: { name: 'United Kingdom' }, city: null } }))).toEqual(['rent-year'])
})

test('rent: tenancies only, monthly-equivalent USD bands, furnishing', () => {
  expect(ids(filterListings(DATA, 'rent', P(''), { fxPerUsd: FX }))).toEqual(['rent-month', 'rent-year'])
  expect(ids(filterListings(DATA, 'rent', P('price=0-1900'), { fxPerUsd: FX }))).toEqual(['rent-month'])
  expect(ids(filterListings(DATA, 'rent', P('furnishing=furnished'), { fxPerUsd: FX }))).toEqual(['rent-month'])
})

test('listings: yield, listing type, rent vs sale bands, plots, development search', () => {
  expect(ids(filterListings(DATA, 'listings', P('with_yield=1'), { fxPerUsd: FX }))).toEqual(['yield'])
  expect(ids(filterListings(DATA, 'listings', P('listing_type=rent'), { fxPerUsd: FX }))).toEqual(['rent-month', 'rent-year'])
  // A sale band never matches a rent.
  expect(ids(filterListings(DATA, 'listings', P('price=0-300000'), { fxPerUsd: FX }))).toEqual(['plot', 'sale-cheap'])
  expect(ids(filterListings(DATA, 'listings', P('type=land&corner=1'), { fxPerUsd: FX }))).toEqual(['plot'])
  expect(ids(filterListings(DATA, 'listings', P('search=canal'), { fxPerUsd: FX }))).toEqual(['plot'])
  // Buy's text search does not look at the development name (as before).
  expect(ids(filterListings(DATA, 'buy', P('search=canal'), { fxPerUsd: FX }))).toEqual([])
})

test('off-plan: off-plan only; bedrooms are not a filter there', () => {
  expect(ids(filterListings(DATA, 'off-plan', P('beds=3'), { fxPerUsd: FX }))).toEqual(['offplan'])
})

test('saved paths parse back into section, location and filters', () => {
  expect(parseSearchPath('/property-portal/buy/pakistan/lahore?type=land')).toMatchObject({ section: 'buy', countrySlug: 'pakistan', citySlug: 'lahore' })
  expect(parseSearchPath('/property-portal/listings?with_yield=1')!.params.get('with_yield')).toBe('1')
  expect(parseSearchPath('/property-portal/listings/pakistan')).toBeNull()
  expect(parseSearchPath('/admin/users')).toBeNull()
  // Everything the Save button can store, the alert job can read.
  for (const p of ['/property-portal/buy', '/property-portal/rent/uk?beds=2', '/property-portal/off-plan?type=residential']) {
    expect(cleanSearchPath(p)).toBe(p)
    expect(parseSearchPath(p)).not.toBeNull()
  }
})

test('only listings live since the last alert are new', () => {
  const s = { last_alerted_at: '2026-09-20T07:00:00Z', created_at: '2026-09-01T00:00:00Z' }
  const rows = [
    { id: 'old', created_at: '2026-09-10T00:00:00Z', approved_at: null },
    { id: 'new', created_at: '2026-09-21T00:00:00Z', approved_at: null },
    { id: 'approved-late', created_at: '2026-09-10T00:00:00Z', approved_at: '2026-09-22T00:00:00Z' },
  ]
  expect(ids(newSince(rows, s))).toEqual(['approved-late', 'new'])
  expect(ids(newSince(rows, { last_alerted_at: null, created_at: '2026-09-15T00:00:00Z' }))).toEqual(['approved-late', 'new'])
  expect(listedAt({ created_at: null, approved_at: null })).toBe(0)
})

test('every filter a search page reads is known to the shared matcher', () => {
  const DISPLAY_ONLY = new Set(['sort', 'page', 'ccy', 'q'])
  const pages: [SearchSection, string][] = [
    ['buy', 'app/property-portal/buy/BuyView.tsx'],
    ['rent', 'app/property-portal/rent/RentView.tsx'],
    ['listings', 'app/property-portal/listings/page.tsx'],
    ['off-plan', 'app/property-portal/off-plan/page.tsx'],
  ]
  for (const [section, file] of pages) {
    const code = readFileSync(join(__dirname, '..', 'src', file), 'utf8')
    expect(code).toContain(`filterListings(all, '${section}'`)
    const read = [...code.matchAll(/params\.get\('([a-z_]+)'\)/g)].map((m) => m[1])
    const unknown = read.filter((k) => !DISPLAY_ONLY.has(k) && !SECTION_FILTER_PARAMS[section].includes(k))
    expect(unknown.map((k) => `${file}: ${k}`)).toEqual([])
  }
})

test('alert routes are reachable by the scheduler, and only with the secret', () => {
  const mw = readFileSync(join(__dirname, '..', 'src/middleware.ts'), 'utf8')
  expect(mw).toContain("pathname === '/api/property-account/alerts' ||")
  const route = readFileSync(join(__dirname, '..', 'src/app/api/property-account/alerts/route.ts'), 'utf8')
  expect(route).toContain("`Bearer ${secret}`")
  expect(route).not.toMatch(/export async function GET/)
})
