import { test, expect } from '@playwright/test'
import { buildLocationTree, activeCountryNames, type LocationRows } from '@/lib/propertyLocations'
import { seedPortalRuntime } from '@/app/property-portal/_components/portalRuntime'
import { portalCountries } from '@/app/property-portal/_components/types'
import { portalDestinations } from '@/app/property-portal/_components/destinations'

const base = { display_order: 0, active: true }
const rows = (): LocationRows => ({
  regions: [
    { ...base, id: 'r-eu', name: 'Europe', slug: 'europe', description: 'Expanding', display_order: 1 },
    { ...base, id: 'r-me', name: 'Middle East', slug: 'middle-east', description: null, display_order: 2 },
    { ...base, id: 'r-old', name: 'Retired', slug: 'retired', description: null, active: false },
  ],
  countries: [
    { ...base, id: 'c-gb', region_id: 'r-eu', country_code: 'GB', name: 'United Kingdom', slug: 'uk', currency: 'GBP', tagline: null, description: null, image_url: null },
    { ...base, id: 'c-ae', region_id: 'r-me', country_code: 'AE', name: 'United Arab Emirates', slug: 'uae', currency: 'AED', tagline: null, description: null, image_url: null },
    { ...base, id: 'c-qa', region_id: 'r-me', country_code: 'QA', name: 'Qatar', slug: 'qatar', currency: 'QAR', tagline: null, description: null, image_url: null, active: false },
    { ...base, id: 'c-x', region_id: 'r-old', country_code: 'XX', name: 'Under retired', slug: 'x', currency: 'USD', tagline: null, description: null, image_url: null },
  ],
  cities: [
    { ...base, id: 'ci-lon', country_id: 'c-gb', name: 'London', slug: 'london', tagline: 'DB tagline', blurb: null, image_url: null },
    { ...base, id: 'ci-man', country_id: 'c-gb', name: 'Manchester', slug: 'manchester', tagline: null, blurb: null, image_url: null, active: false },
    { ...base, id: 'ci-dxb', country_id: 'c-ae', name: 'Dubai', slug: 'dubai', tagline: null, blurb: null, image_url: null },
    { ...base, id: 'ci-doh', country_id: 'c-qa', name: 'Doha', slug: 'doha', tagline: null, blurb: null, image_url: null },
  ],
  areas: [
    { ...base, id: 'a-cw', city_id: 'ci-lon', name: 'Canary Wharf', slug: 'canary-wharf', postcode_prefix: 'E14' },
    { ...base, id: 'a-off', city_id: 'ci-lon', name: 'Hidden', slug: 'hidden', postcode_prefix: null, active: false },
  ],
})

test.describe('location tree', () => {
  test('only active nodes under active ancestors are shown', () => {
    const tree = buildLocationTree(rows())
    expect(tree.map((r) => r.slug)).toEqual(['europe', 'middle-east'])       // retired region gone
    expect(activeCountryNames(tree)).toEqual(['United Kingdom', 'United Arab Emirates']) // Qatar off
    const london = tree[0].countries[0].cities
    expect(london.map((c) => c.name)).toEqual(['London'])                    // Manchester off
    expect(london[0].areas.map((a) => a.name)).toEqual(['Canary Wharf'])     // hidden area off
  })

  test('a region with no active country is kept (for "coming soon" markets)', () => {
    const r = rows()
    r.countries = r.countries.filter((c) => c.region_id !== 'r-eu')
    const tree = buildLocationTree(r)
    const europe = tree.find((x) => x.slug === 'europe')!
    expect(europe.countries).toEqual([])
    expect(europe.description).toBe('Expanding')
  })
})

test.describe('the portal reads markets from Locations', () => {
  test('portalCountries follows the active countries', () => {
    seedPortalRuntime({ settings: { countries: ['Pakistan'] }, locations: buildLocationTree(rows()) } as never)
    expect(portalCountries()).toEqual(['United Kingdom', 'United Arab Emirates'])
  })

  test('without Locations it falls back to the settings list', () => {
    seedPortalRuntime({ settings: { countries: ['Pakistan'] }, locations: null } as never)
    expect(portalCountries()).toEqual(['Pakistan'])
  })

  test('destinations are the active cities, city copy first then editorial', () => {
    seedPortalRuntime({ settings: { countries: [] }, locations: buildLocationTree(rows()) } as never)
    const d = portalDestinations()
    expect(d.map((x) => x.slug)).toEqual(['london', 'dubai'])
    const london = d.find((x) => x.slug === 'london')!
    expect(london.tagline).toBe('DB tagline')               // the city's own copy wins
    expect(london.blurb).toContain('HM Land Registry')      // shipped editorial fills the gap
    expect(london.country).toBe('United Kingdom')
  })
})
