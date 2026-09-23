import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanLead, dealFromLead, listingRef } from '@/lib/propertyLeads'
import { listingReference } from '@/app/property-portal/_components/PropertyActions'

const LISTING = '1b2c3d4e-0000-4000-8000-000000000001'
const TODAY = new Date('2026-09-23T12:00:00Z')

test('a property enquiry needs a name, a valid email and a listing', () => {
  expect(cleanLead({ kind: 'property_enquiry', name: 'A', email: 'a@b.co', listing_id: LISTING }).data).toMatchObject({ kind: 'property_enquiry', listing_id: LISTING })
  expect(cleanLead({ kind: 'property_enquiry', name: '', email: 'a@b.co', listing_id: LISTING }).error).toMatch(/name/)
  expect(cleanLead({ kind: 'property_enquiry', name: 'A', email: 'nope', listing_id: LISTING }).error).toMatch(/email/)
  expect(cleanLead({ kind: 'property_enquiry', name: 'A', email: 'a@b.co' }).error).toMatch(/property/)
  expect(cleanLead({ kind: 'property_enquiry', name: 'A', email: 'a@b.co', listing_id: 'not-a-uuid' }).error).toMatch(/property/)
  expect(cleanLead({ kind: 'spam', name: 'A', email: 'a@b.co' }).error).toBeTruthy()
})

test('viewing dates in the past and made-up time slots are dropped', () => {
  const base = { kind: 'viewing_request', name: 'A', email: 'a@b.co', listing_id: LISTING }
  expect(cleanLead({ ...base, preferred_date: '2026-09-30', preferred_slot: 'Morning (9–12)' }, TODAY).data).toMatchObject({ preferred_date: '2026-09-30', preferred_slot: 'Morning (9–12)' })
  expect(cleanLead({ ...base, preferred_date: '2026-09-23' }, TODAY).data!.preferred_date).toBe('2026-09-23')
  expect(cleanLead({ ...base, preferred_date: '2020-01-01', preferred_slot: 'Midnight' }, TODAY).data).toMatchObject({ preferred_date: null, preferred_slot: null })
  // A plain enquiry never carries viewing fields.
  expect(cleanLead({ ...base, kind: 'property_enquiry', preferred_date: '2026-09-30' }, TODAY).data!.preferred_date).toBeNull()
})

test('only safe values are kept', () => {
  const d = cleanLead({
    kind: 'investment_enquiry', name: 'A', email: 'A@B.CO', budget_amount: '-5', budget_currency: 'usd',
    source_page: 'https://evil.example/', message: 'x'.repeat(6000), role: 'super_admin',
  }).data!
  expect(d.email).toBe('a@b.co')
  expect(d.budget_amount).toBeNull()
  expect(d.budget_currency).toBeNull()
  expect(d.source_page).toBeNull()
  expect(d.message!.length).toBe(5000)
  expect(Object.keys(d)).not.toContain('role')
  expect(cleanLead({ kind: 'investment_enquiry', name: 'A', email: 'a@b.co', budget_amount: 250000, budget_currency: 'gbp', source_page: '//evil.example' }).data)
    .toMatchObject({ budget_amount: 250000, budget_currency: 'GBP', source_page: null })
})

test('the lead reference matches the one shown on the listing page', () => {
  expect(listingRef(LISTING)).toBe(listingReference(LISTING))
})

test('a qualified lead becomes the right kind of CRM deal', () => {
  const lead = { kind: 'property_enquiry' as const, listing_title: 'Flat in Lahore', name: 'Sam', reference: 'LEAD-1001' }
  expect(dealFromLead(lead, { listing_type: 'sale', price: 100000, currency: 'PKR' })).toMatchObject({ kind: 'property_sale', role: 'buyer', value_amount: 100000, currency: 'PKR', title: 'Flat in Lahore — Sam' })
  expect(dealFromLead(lead, { listing_type: 'rent', price: 900, currency: 'GBP' })).toMatchObject({ kind: 'property_rental', role: 'tenant' })
  expect(dealFromLead({ ...lead, kind: 'investment_enquiry', listing_title: null }, null)).toMatchObject({ kind: 'investment', role: 'investor', title: 'Property investment — Sam', value_amount: null })
})

test('portal forms post to the lead endpoint, which is public; admin and activity routes are not', () => {
  const root = join(__dirname, '..', 'src')
  expect(readFileSync(join(root, 'app/property-portal/_components/PropertyActions.tsx'), 'utf8')).toContain("fetch('/api/property-leads'")
  expect(readFileSync(join(root, 'app/property-portal/_components/InvestmentEnquiry.tsx'), 'utf8')).toContain("fetch('/api/property-leads'")
  const mw = readFileSync(join(root, 'middleware.ts'), 'utf8')
  expect(mw).toContain("pathname === '/api/property-leads' ||")
  expect(mw).not.toContain("'/api/admin/property-leads'")
  expect(mw).not.toContain("'/api/property-account/activity'")
})
