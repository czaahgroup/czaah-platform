import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildInvestmentEnquiry, type InvestmentForm } from '@/app/property-portal/_components/InvestmentEnquiry'
import { investmentCategories } from '@/app/property-portal/investments/categories'
import { cleanLead } from '@/lib/propertyLeads'

const FORM: InvestmentForm = {
  name: ' Sam ', email: 'sam@example.com ', phone: '', currency: 'AED', budget: '1500000', country: 'United Arab Emirates', city: 'Dubai',
  property_type: 'apartment', funding: 'Cash', purpose: 'Rental income', timeline: 'Within 3 months', message: '',
}

test('an investment enquiry carries every answer as a structured lead', () => {
  const p = buildInvestmentEnquiry(FORM)
  expect(p).toMatchObject({
    kind: 'investment_enquiry', name: 'Sam', email: 'sam@example.com',
    budget_amount: 1500000, budget_currency: 'AED', country: 'United Arab Emirates', city: 'Dubai',
    property_type: 'Apartment / flat', funding: 'Cash', purpose: 'Rental income', timeline: 'Within 3 months',
  })
  expect(p.phone).toBeUndefined()
  // It passes the server's own validation unchanged.
  const { data, error } = cleanLead(p)
  expect(error).toBeUndefined()
  expect(data).toMatchObject({ kind: 'investment_enquiry', budget_amount: 1500000, budget_currency: 'AED', city: 'Dubai' })
})

test('blank answers are left out, never made up', () => {
  const p = buildInvestmentEnquiry({ ...FORM, budget: 'abc', country: '', city: '', property_type: '', funding: '', purpose: '', timeline: '' })
  expect(p.budget_amount).toBeUndefined()
  expect(p.budget_currency).toBeUndefined()
  expect(p.country).toBeUndefined()
  expect(p.property_type).toBeUndefined()
  expect(cleanLead(p).data).toMatchObject({ budget_amount: null, country: null, property_type: null })
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
