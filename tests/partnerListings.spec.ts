import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanListingEdit, changedOnly, editableOnly, ownerActionResult, describeValue, EDIT_COLUMNS } from '@/lib/listingEdits'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

test.describe('partner listing edits', () => {
  test('only what the form sends is cleaned, and bad values are refused', () => {
    expect(cleanListingEdit({ price: '250000' })).toEqual({ columns: { price: 250000 }, problems: [] })
    expect(cleanListingEdit({ title: '   ' }).problems).toEqual(['Title is required.'])
    expect(cleanListingEdit({ price: 'lots' }).problems).toEqual(['Price must be a number.'])
    expect(cleanListingEdit({ price: -5 }).problems).toHaveLength(1)
    expect(cleanListingEdit({ currency: 'XYZ', propertyType: 'castle', listingType: 'gift' }).problems).toHaveLength(3)
    expect(cleanListingEdit({ bedrooms: '', price: '' }).columns).toEqual({ bedrooms: null, price: null })
    expect(cleanListingEdit({ features: 'Parking, Gym, , Parking' }).columns.features).toEqual(['Parking', 'Gym'])
  })

  test('a partner cannot set the flags CZAAH owns', () => {
    const { columns } = cleanListingEdit({
      title: 'Flat', status: 'approved', verified: true, featured: true, approved: true,
      partner_id: 'someone-else', yieldPercentage: 12, latitude: 1, longitude: 2,
    })
    expect(Object.keys(columns)).toEqual(['title'])
    expect(editableOnly({ price: 1, status: 'approved', verified: true, featured: true })).toEqual({ price: 1 })
    for (const banned of ['status', 'verified', 'featured', 'approved', 'partner_id', 'yield_percentage']) {
      expect(EDIT_COLUMNS).not.toContain(banned)
    }
  })

  test('switching a rental to a sale clears its rental terms', () => {
    const { columns } = cleanListingEdit({ listingType: 'sale', rentPeriod: 'month', deposit: '5000' })
    expect(columns).toMatchObject({ listing_type: 'sale', rent_period: null, deposit: null, min_term_months: null })
  })

  test('a proposal holds only what actually differs', () => {
    const live = { title: 'Flat', price: 250000, bedrooms: null, features: ['Gym'], images: ['a.jpg'], description: null }
    expect(changedOnly({ title: 'Flat', price: 260000, bedrooms: null, features: ['Gym'], images: ['a.jpg'], description: '' }, live)).toEqual({ price: 260000 })
    expect(changedOnly({ price: '250000' as unknown as number }, live)).toEqual({})
    expect(changedOnly({ images: ['a.jpg', 'b.jpg'] }, live)).toEqual({ images: ['a.jpg', 'b.jpg'] })
    expect(changedOnly({ title: 'Flat', price: 250000 }, live)).toEqual({})
  })

  test('coming off the site is immediate; going on always needs approval', () => {
    expect(ownerActionResult('mark_sold', 'approved')).toEqual({ status: 'sold' })
    expect(ownerActionResult('mark_sold', 'pending').error).toBeTruthy()
    expect(ownerActionResult('withdraw', 'approved')).toEqual({ status: 'inactive' })
    expect(ownerActionResult('withdraw', 'sold').error).toBeTruthy()
    for (const from of ['sold', 'inactive', 'rejected']) expect(ownerActionResult('relist', from)).toEqual({ status: 'pending' })
    expect(ownerActionResult('relist', 'approved').error).toBeTruthy()
    // No action lets an owner make a listing live.
    for (const action of ['mark_sold', 'withdraw', 'relist', 'cancel_changes', 'approve']) {
      for (const from of ['pending', 'approved', 'rejected', 'sold', 'inactive']) {
        expect(ownerActionResult(action, from).status).not.toBe('approved')
      }
    }
  })

  test('values read sensibly in the admin before/after list', () => {
    expect(describeValue('price', 1250000)).toBe('1,250,000')
    expect(describeValue('images', ['a', 'b'])).toBe('2 photos')
    expect(describeValue('furnishing', 'part_furnished')).toBe('part furnished')
    expect(describeValue('bedrooms', null)).toBe('—')
  })

  test('every partner listing route uses the shared access check and stays owner-scoped', () => {
    for (const route of ['src/app/api/partner/properties/route.ts', 'src/app/api/partner/properties/[id]/route.ts']) {
      expect(read(route)).toContain('requireLister(request)')
    }
    // Photo uploads are shared with mineral partners.
    expect(read('src/app/api/partner/media/upload-url/route.ts')).toContain('requireUploader(request)')
    const one = read('src/app/api/partner/properties/[id]/route.ts')
    expect(one).toContain('listing.partner_id !== auth.userId')
    // An edit to a live listing is held, never written to the listing.
    expect(one).toMatch(/listing\.status === 'approved'[\s\S]*property_listing_changes'\)\.upsert/)
    // New listings from partners always start pending.
    expect(read('src/app/api/partner/properties/route.ts')).toContain("status: 'pending'")
  })

  test('the partner portal offers Properties under the rule the API enforces', () => {
    const rule = 'real estate|property'
    expect(read('src/app/partner-network/layout.tsx')).toContain(rule)
    expect(read('src/lib/partnerListingAuth.ts')).toContain(rule)
  })
})
