import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildInvestmentEnquiry, type InvestmentForm } from '@/app/property-portal/_components/InvestmentEnquiry'
import { investmentCategories } from '@/app/property-portal/investments/categories'

const FORM: InvestmentForm = {
  name: ' Sam ', email: 'sam@example.com ', phone: '', currency: 'AED', budget: '1500000', country: 'United Arab Emirates', city: 'Dubai',
  property_type: 'apartment', funding: 'Cash', purpose: 'Rental income', timeline: 'Within 3 months', message: '',
}

test('an investment enquiry carries every answer to the inbox', () => {
  const p = buildInvestmentEnquiry(FORM)
  expect(p.name).toBe('Sam')
  expect(p.email).toBe('sam@example.com')
  expect(p.phone).toBeUndefined()
  expect(p.interest).toBe('Investment enquiry — United Arab Emirates')
  expect(p.message).toContain('Budget: AED 1,500,000')
  expect(p.message).toContain('Preferred location: Dubai, United Arab Emirates')
  expect(p.message).toContain('Property type: Apartment / flat')
  expect(p.message).toContain('Funding: Cash')
  expect(p.message).toContain('Purpose: Rental income')
  expect(p.message).toContain('Timeline: Within 3 months')
  // /api/contact's limits.
  expect(p.interest.length).toBeLessThanOrEqual(200)
})

test('blank answers read as "not stated", never as made-up values', () => {
  const p = buildInvestmentEnquiry({ ...FORM, budget: 'abc', country: '', city: '', property_type: '', funding: '', purpose: '', timeline: '' })
  expect(p.interest).toBe('Investment enquiry — any market')
  expect(p.message).toContain('Budget: not stated')
  expect(p.message).toContain('Preferred location: open to suggestions')
  expect(p.message).toContain('Property type: any')
})

test('categories count only for-sale listings and hide empty ones', () => {
  const base = { id: 'x', title: 't', price: 1, currency: 'GBP', location: '', city: '', country: 'Pakistan', area_sqft: null, bedrooms: null, bathrooms: null, description: null, images: [], yield_percentage: null }
  const cats = investmentCategories([
    { ...base, property_type: 'residential', listing_type: 'sale' },
    { ...base, property_type: 'residential', listing_type: 'rent' },
    { ...base, property_type: 'commercial', listing_type: 'off_plan', yield_percentage: 6 },
  ] as never)
  const byName = Object.fromEntries(cats.map((c) => [c.t, c.n]))
  expect(byName).toEqual({ Residential: 1, Commercial: 1, 'Off-plan': 1, 'Income-producing': 1 })
})

test('/investments on property.czaah.com is the portal page, not the main site', () => {
  const mw = readFileSync(join(__dirname, '..', 'src', 'middleware.ts'), 'utf8')
  const shared = mw.slice(mw.indexOf('const sharedPaths'), mw.indexOf(']', mw.indexOf('const sharedPaths')))
  expect(shared).not.toContain("'/investments'")
})
