import { test, expect } from '@playwright/test'
import { cleanSubmission, toSqft } from '@/lib/propertySubmissions'

const fd = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}
const contact = { full_name: 'Ayesha Khan', email: 'Ayesha@Example.com', phone: '+92 300 0000000' }

test.describe('submission validation', () => {
  test('an unknown path is refused', () => {
    expect(cleanSubmission(fd({ kind: 'publish-now', ...contact })).errors).toBeTruthy()
  })

  test('a complete sell submission is accepted and normalised', () => {
    const { data, errors } = cleanSubmission(fd({
      kind: 'sell', ...contact, country: 'Pakistan', city: '  Lahore ', property_type: 'house',
      bedrooms: '4', bathrooms: '3', size_value: '10', size_unit: 'marla',
      currency: 'pkr', expected_price: '45,000,000', timeline: 'Within 3 months',
      // Fields that do not belong to this path are ignored.
      expected_rent: '999', status: 'approved',
    }))
    expect(errors).toBeUndefined()
    expect(data!.row).toMatchObject({
      kind: 'sell', email: 'ayesha@example.com', city: 'Lahore', bedrooms: 4,
      size_unit: 'marla', currency: 'PKR', expected_price: 45000000, timeline: 'Within 3 months',
    })
    expect(data!.row.expected_rent).toBeUndefined()
    expect(data!.row.status).toBeUndefined() // status can never be set by the public
  })

  test('required fields and bad numbers are reported', () => {
    const { errors } = cleanSubmission(fd({ kind: 'let', full_name: '', email: 'nope', phone: '', bedrooms: 'three', property_type: 'castle' }))
    const text = errors!.join(' ')
    for (const expected of ['name', 'email', 'phone', 'country', 'city', 'property type', 'Bedrooms']) {
      expect(text.toLowerCase()).toContain(expected.toLowerCase())
    }
  })

  test('let keeps rental terms and defaults the period to monthly', () => {
    const { data } = cleanSubmission(fd({
      kind: 'let', ...contact, country: 'United Arab Emirates', city: 'Dubai', property_type: 'apartment',
      expected_rent: '120000', rent_period: 'yearly?', available_from: '2026-11-01', furnishing: 'furnished',
    }))
    expect(data!.row).toMatchObject({ expected_rent: 120000, rent_period: 'month', available_from: '2026-11-01', furnishing: 'furnished' })
  })

  test('development and partnership need their company details', () => {
    expect(cleanSubmission(fd({ kind: 'development', ...contact })).errors!.join(' ')).toContain('development name')
    const { data } = cleanSubmission(fd({ kind: 'partnership', ...contact, company: 'Acme Realty', partner_type: 'agent', website: 'acme.example' }))
    expect(data!.row).toMatchObject({ company: 'Acme Realty', partner_type: 'agent', website: 'https://acme.example' })
  })

  test('long input is bounded', () => {
    const { data } = cleanSubmission(fd({ kind: 'partnership', ...contact, company: 'x'.repeat(1000), partner_type: 'other', message: 'y'.repeat(20000) }))
    expect(String(data!.row.company).length).toBe(200)
    expect(String(data!.row.message).length).toBe(5000)
  })
})

test('sizes convert to ft² only when the unit is known', () => {
  expect(toSqft(1000, 'sq_ft')).toBe(1000)
  expect(toSqft(100, 'sq_m')).toBe(1076)
  expect(toSqft(10, 'marla')).toBe(2250)
  expect(toSqft(10, 'furlongs')).toBeNull()
  expect(toSqft(null, 'sq_ft')).toBeNull()
})
