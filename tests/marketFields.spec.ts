import { test, expect } from '@playwright/test'
import {
  marketColumnsFromBody,
  marketFiltersFor,
  applyMarketFilters,
  filterOptions,
  yieldLabel,
} from '@/lib/marketFields'

test.describe('admin market fields', () => {
  test('insert writes every field, blanks as null', () => {
    const { columns, problems } = marketColumnsFromBody({ tenure: 'leasehold', leaseYearsRemaining: '125', councilTaxBand: 'd', serviceCharge: '2,400', groundRent: '' })
    expect(problems).toEqual([])
    expect(columns).toMatchObject({ tenure: 'leasehold', lease_years_remaining: 125, council_tax_band: 'D', service_charge: 2400, ground_rent: null, society: null })
  })

  test('update only writes what the payload carries — an older form never clears them', () => {
    const { columns } = marketColumnsFromBody({ society: 'DHA' }, 'update')
    expect(columns).toEqual({ society: 'DHA' })
  })

  test('bad values are reported, not silently dropped', () => {
    const { problems } = marketColumnsFromBody({ tenure: 'rented-ish', councilTaxBand: 'Z', serviceCharge: 'lots', yieldSource: 'guaranteed', completionDate: 'soon' })
    expect(problems).toHaveLength(5)
  })
})

test('a yield always carries its source', () => {
  expect(yieldLabel('developer_supplied')).toBe('Yield (developer-supplied)')
  expect(yieldLabel(null)).toBe('Yield (seller-stated)')
  expect(yieldLabel('made-up')).toBe('Yield (seller-stated)')
})

test.describe('portal market filters', () => {
  const listings = [
    { id: 1, tenure: 'freehold', council_tax_band: 'E', build_status: 'resale' },
    { id: 2, tenure: 'leasehold', council_tax_band: 'D', build_status: 'new_build' },
    { id: 3, developer_name: 'Emaar', completion_date: '2027-06-30', has_payment_plan: true, furnishing: 'unfurnished' },
    { id: 4, developer_name: 'emaar ', completion_date: '2028-01-01', has_payment_plan: false },
    { id: 5, society: 'DHA', phase: 'Phase 6', block: 'C', property_subtype: 'plot' },
    { id: 6, development_name: 'Citi Canal Enclave', property_subtype: 'plot' },
  ]

  test('each market has its own filters; unknown markets get none', () => {
    expect(marketFiltersFor('GB', 'buy').map((f) => f.param)).toEqual(['tenure', 'build', 'ctax'])
    expect(marketFiltersFor('GB', 'rent').map((f) => f.param)).toEqual(['ctax'])
    expect(marketFiltersFor('ae', 'buy').map((f) => f.param)).toEqual(['developer', 'completion', 'plan', 'furnished'])
    expect(marketFiltersFor('PK', 'buy').map((f) => f.param)).toEqual(['kind', 'society', 'phase', 'block'])
    expect(marketFiltersFor('FR', 'buy')).toEqual([])
    expect(marketFiltersFor(null, 'buy')).toEqual([])
  })

  test('filters narrow by their own rules', () => {
    const run = (code: string, q: string) =>
      applyMarketFilters(listings, marketFiltersFor(code, 'buy'), new URLSearchParams(q)).map((l) => l.id)
    expect(run('GB', 'tenure=leasehold')).toEqual([2])
    expect(run('GB', 'ctax=E&build=resale')).toEqual([1])
    expect(run('AE', 'developer=Emaar')).toEqual([3, 4])     // case / space insensitive
    expect(run('AE', 'completion=2027')).toEqual([3])
    expect(run('AE', 'plan=yes')).toEqual([3])
    expect(run('PK', 'society=Citi Canal Enclave')).toEqual([6]) // development name counts as society
    expect(run('PK', 'kind=plot&phase=Phase 6')).toEqual([5])
  })

  test('derived options come from live listings, deduplicated', () => {
    const dev = marketFiltersFor('AE', 'buy').find((f) => f.param === 'developer')!
    // "Emaar" and "emaar " are one developer, offered once.
    const devOptions = filterOptions(dev, listings)
    expect(devOptions).toHaveLength(1)
    expect(devOptions[0].v.toLowerCase()).toBe('emaar')
    // Fixed options are only offered when some listing matches them.
    const tenure = marketFiltersFor('GB', 'buy').find((f) => f.param === 'tenure')!
    expect(filterOptions(tenure, listings).map((o) => o.v)).toEqual(['freehold', 'leasehold'])
    expect(filterOptions(tenure, [])).toEqual([])
    const soc = marketFiltersFor('PK', 'buy').find((f) => f.param === 'society')!
    expect(filterOptions(soc, listings).map((o) => o.v)).toEqual(['Citi Canal Enclave', 'DHA'])
  })
})
