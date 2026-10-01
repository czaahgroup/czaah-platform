import { test, expect } from '@playwright/test'
import { buildLocationTree, type LocationRows } from '@/lib/propertyLocations'
import { groupForMap, listingPoint, pinPrice, precisionNote, validCoords } from '@/lib/listingMap'

const base = { display_order: 0, active: true }
const rows: LocationRows = {
  regions: [{ ...base, id: 'r', name: 'Europe', slug: 'europe', description: null }],
  countries: [{ ...base, id: 'gb', region_id: 'r', country_code: 'GB', name: 'United Kingdom', slug: 'uk', currency: 'GBP', tagline: null, description: null, image_url: null }],
  cities: [
    // Postgres numerics arrive as strings.
    { ...base, id: 'lon', country_id: 'gb', name: 'London', slug: 'london', tagline: null, blurb: null, image_url: null, latitude: '51.50745', longitude: '-0.12777' },
    { ...base, id: 'man', country_id: 'gb', name: 'Manchester', slug: 'manchester', tagline: null, blurb: null, image_url: null },
  ],
  areas: [
    { ...base, id: 'cw', city_id: 'lon', name: 'Canary Wharf', slug: 'canary-wharf', postcode_prefix: 'E14', latitude: 51.5049, longitude: -0.019 },
    { ...base, id: 'ne', city_id: 'lon', name: 'Nine Elms', slug: 'nine-elms', postcode_prefix: null },
  ],
}
const tree = buildLocationTree(rows)
const listing = (over: Record<string, unknown>) => ({ id: 'x', country: 'United Kingdom', city: 'London', location: 'Canary Wharf', ...over })

test.describe('listing map positions', () => {
  test('the tree carries centre points as numbers, or nulls', () => {
    const london = tree[0].countries[0].cities.find((c) => c.slug === 'london')!
    expect([london.lat, london.lng]).toEqual([51.50745, -0.12777])
    expect(london.areas.find((a) => a.slug === 'nine-elms')).toMatchObject({ lat: null, lng: null })
  })

  test('own coordinates win and are exact', () => {
    expect(listingPoint(listing({ latitude: '51.5', longitude: '-0.02' }), tree)).toMatchObject({ lat: 51.5, lng: -0.02, precision: 'exact' })
  })

  test('falls back to the area, then the city, and says so', () => {
    const area = listingPoint(listing({}), tree)!
    expect(area).toMatchObject({ lat: 51.5049, precision: 'area', label: 'Canary Wharf, London' })
    expect(precisionNote(area)).toContain('Approximate')

    const city = listingPoint(listing({ location: 'Nine Elms' }), tree)!
    expect(city).toMatchObject({ lat: 51.50745, precision: 'city', label: 'London' })
    expect(listingPoint(listing({ location: 'canary wharf ', city: 'LONDON' }), tree)?.precision).toBe('area')
  })

  test('a listing nothing places is not put on the map', () => {
    expect(listingPoint(listing({ city: 'Manchester', location: null }), tree)).toBeNull()
    expect(listingPoint(listing({ country: 'France' }), tree)).toBeNull()
    expect(listingPoint(listing({}), null)).toBeNull()
  })

  test('rejects empty, half, zero and out-of-range coordinates', () => {
    expect(validCoords(null, 1)).toBeNull()
    expect(validCoords('', '')).toBeNull()
    expect(validCoords(0, 0)).toBeNull()
    expect(validCoords(91, 0)).toBeNull()
    expect(validCoords('abc', 2)).toBeNull()
    expect(validCoords('24.8', '67.02')).toEqual({ lat: 24.8, lng: 67.02 })
  })

  test('listings at the same point share one marker; exact ones stay separate', () => {
    const { groups, unplaced } = groupForMap([
      listing({ id: 'a' }),
      listing({ id: 'b' }),
      listing({ id: 'c', latitude: 51.5049, longitude: -0.019 }),
      listing({ id: 'd', city: 'Manchester' }),
    ], tree)
    expect(groups.map((g) => g.listings.map((l) => l.id))).toEqual([['a', 'b'], ['c']])
    expect(unplaced.map((l) => l.id)).toEqual(['d'])
  })

  test('pin prices are short', () => {
    expect(pinPrice(1250000, 'GBP')).toBe('GBP 1.25M')
    expect(pinPrice(85000000, 'PKR')).toBe('PKR 85M')
    expect(pinPrice(950000, 'AED')).toBe('AED 950K')
    expect(pinPrice(3200, 'GBP')).toBe('GBP 3,200')
    expect(pinPrice(2400000000, 'PKR')).toBe('PKR 2.4B')
    expect(pinPrice(null, 'GBP')).toBe('POA')
  })
})
