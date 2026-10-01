import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { cleanLead, dealFromLead, LEAD_KINDS, LEAD_KIND_LABEL } from '@/lib/propertyLeads'
import { filterListings, marketKey, matchesMarketKey } from '@/lib/listingSearch'
import { DEFAULT_HOME_LAYOUT } from '@/lib/homeLayout'
import { joinPrice, splitPrice } from '@/app/property-portal/_components/PriceRange'
import { MARKET_GUIDES } from '@/app/property-portal/_components/marketGuides'

/**
 * The 2026-10-01 "Global Property. One Trusted Partner." brief: brand-led home
 * page, guided property sourcing, advisor requests, min/max price search.
 */

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const LISTING = '1b2c3d4e-0000-4000-8000-000000000001'

test.describe('lead types', () => {
  test('a sourcing request needs no listing and keeps its answers', () => {
    const d = cleanLead({
      kind: 'property_sourcing_request', name: 'Sam', email: 'sam@example.com', purpose: 'Investment',
      country: 'United Kingdom', city: 'London', area: 'Canary Wharf', open_to_recommendations: true,
      budget_amount: '750000', budget_currency: 'gbp', property_type: 'Apartment', bedrooms: '2', size: '900 ft²',
      timeline: '3–6 months', contact_method: 'WhatsApp', message: 'Near the river.',
    }).data!
    expect(d).toMatchObject({ kind: 'property_sourcing_request', listing_id: null, purpose: 'Investment', country: 'United Kingdom', city: 'London', budget_amount: 750000, budget_currency: 'GBP', timeline: '3–6 months', viewing_mode: null })
    for (const line of ['Near the river.', 'Area: Canary Wharf', 'Open to recommendations: Yes', 'Bedrooms: 2', 'Size: 900 ft²', 'Preferred contact: WhatsApp']) {
      expect(d.message).toContain(line)
    }
  })

  test('made-up goals, timelines and contact methods are dropped', () => {
    const d = cleanLead({ kind: 'property_sourcing_request', name: 'Sam', email: 'sam@example.com', purpose: 'Flip it', timeline: 'Yesterday', contact_method: 'Carrier pigeon' }).data!
    expect(d.purpose).toBeNull()
    expect(d.timeline).toBeNull()
    expect(d.message).toBeNull()
  })

  test('an advisor request needs only a name and an email', () => {
    expect(cleanLead({ kind: 'advisor_request', name: 'Sam', email: 'sam@example.com', purpose: 'Buying a property' }).data).toMatchObject({ kind: 'advisor_request', listing_id: null, purpose: 'Buying a property' })
    expect(cleanLead({ kind: 'advisor_request', name: 'Sam', email: 'nope' }).error).toMatch(/email/)
  })

  test('a viewing is in person unless video is chosen; other requests carry no viewing type', () => {
    const base = { kind: 'viewing_request', name: 'A', email: 'a@b.co', listing_id: LISTING }
    expect(cleanLead(base).data!.viewing_mode).toBe('in_person')
    expect(cleanLead({ ...base, viewing_mode: 'video' }).data!.viewing_mode).toBe('video')
    expect(cleanLead({ ...base, viewing_mode: 'hologram' }).data!.viewing_mode).toBe('in_person')
    expect(cleanLead({ ...base, kind: 'property_enquiry', viewing_mode: 'video' }).data!.viewing_mode).toBeNull()
  })

  test('a sourcing request to rent becomes a rental deal', () => {
    const lead = { kind: 'property_sourcing_request' as const, listing_title: null, name: 'Sam', reference: 'LEAD-1', purpose: 'Rent' }
    expect(dealFromLead(lead, null)).toMatchObject({ kind: 'property_rental', role: 'tenant', title: 'Property search — Sam' })
    expect(dealFromLead({ ...lead, purpose: 'Buy' }, null)).toMatchObject({ kind: 'property_sale', role: 'buyer' })
  })

  test('every lead type has a label and is allowed by the newest migration', () => {
    for (const k of LEAD_KINDS) expect(LEAD_KIND_LABEL[k]).toBeTruthy()
    const dir = join(root, 'supabase', 'migrations')
    const latest = readdirSync(dir).filter((f) => f.includes('lead_kinds')).sort().pop()!
    const sql = readFileSync(join(dir, latest), 'utf8')
    for (const k of LEAD_KINDS) expect(sql).toContain(`'${k}'`)
  })

  test('nothing tells a visitor their viewing is confirmed', () => {
    const src = read('src/app/property-portal/_components/PropertyActions.tsx')
    expect(src).toContain('Viewing request received')
    expect(src).not.toMatch(/Viewing (is )?confirmed/i)
  })
})

test.describe('search', () => {
  test('min and max price share the old price parameter', () => {
    expect(joinPrice('250000', '500000')).toBe('250000-500000')
    expect(joinPrice('500000', '')).toBe('500000-')
    expect(joinPrice('', '500000')).toBe('-500000')
    expect(joinPrice('', '')).toBe('')
    // The wrong way round is read as intended.
    expect(joinPrice('900000', '100000')).toBe('100000-900000')
    expect(splitPrice('0-250000')).toEqual(['', '250000'])
    expect(splitPrice('3000000-')).toEqual(['3000000', ''])
  })

  test('an open-ended price filters the same way a band does', () => {
    const data = [
      { id: 'a', listing_type: 'sale', price: 200_000, currency: 'USD' },
      { id: 'b', listing_type: 'sale', price: 800_000, currency: 'USD' },
    ]
    const ids = (q: string) => filterListings(data, 'buy', new URLSearchParams(q)).map((p) => p.id)
    expect(ids('price=500000-')).toEqual(['b'])
    expect(ids('price=-500000')).toEqual(['a'])
    expect(ids('price=100000-900000')).toEqual(['a', 'b'])
  })

  test('market tabs match any country or city, including the three old keys', () => {
    const london = { country: 'United Kingdom', city: 'London' }
    expect(marketKey('United Arab Emirates')).toBe('united-arab-emirates')
    expect(matchesMarketKey(london, 'london')).toBe(true)
    expect(matchesMarketKey(london, 'united-kingdom')).toBe(true)
    expect(matchesMarketKey(london, 'dubai')).toBe(false)
    expect(matchesMarketKey({ country: 'Pakistan', city: 'Lahore' }, 'pakistan')).toBe(true)
    expect(matchesMarketKey({ country: 'Saudi Arabia', city: 'Riyadh' }, 'saudi-arabia')).toBe(true)
    expect(matchesMarketKey(london, 'all')).toBe(true)
  })

  test('bathrooms narrow buy and rent results', () => {
    const data = [
      { id: 'a', listing_type: 'sale', bathrooms: 1 },
      { id: 'b', listing_type: 'sale', bathrooms: 3 },
      { id: 'c', listing_type: 'sale', bathrooms: null },
    ]
    expect(filterListings(data, 'buy', new URLSearchParams('baths=2')).map((p) => p.id)).toEqual(['b'])
  })
})

test.describe('brand', () => {
  test('the hero headline is the brand line, with no market in it', () => {
    const home = read('src/app/property-portal/HomeView.tsx')
    const h1 = home.match(/<h1>([\s\S]*?)<\/h1>/)![1].replace(/<[^>]+>/g, '')
    expect(h1).toBe('Global Property. One Trusted Partner.')
    expect(read('src/app/property-portal/layout.tsx')).toContain('Global Property. One Trusted Partner.')
  })

  test('the home page opens with the brief’s sections, in order', () => {
    expect(DEFAULT_HOME_LAYOUT.filter((s) => s.visible).map((s) => s.key)).toEqual([
      'featured', 'markets', 'sourcing', 'compare', 'projects', 'about', 'howItWorks', 'insights', 'owner', 'cta',
    ])
  })

  test('the brand is always "CZAAH Properties"', () => {
    const files = ['HomeView.tsx', 'layout.tsx', 'about/page.tsx', 'contact/page.tsx', 'find-a-property/page.tsx', '_components/HomeSections.tsx', '_components/PortalNav.tsx', '_components/SourcingForm.tsx']
    for (const f of files) {
      const src = read(`src/app/property-portal/${f}`)
      expect(src, f).not.toMatch(/CZAAH Property\b|Czaah Propert|CZAAH PROPERTY\b/)
    }
  })

  test('market guidance ships empty: nothing unverified is published', () => {
    expect(Object.keys(MARKET_GUIDES)).toEqual([])
  })
})
