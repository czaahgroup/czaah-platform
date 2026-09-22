import { test, expect } from '@playwright/test'
import { reconcilePaymentPlan, buildSchedule, validatePaymentPlan } from '@/lib/paymentPlan'
import { plotSizeInSqFt, formatPlotSize, isPlotListing, validatePlotListing, assetClassFor, slugify } from '@/lib/plots'

/**
 * Pure arithmetic — no browser, no database. These exist because the one thing
 * we must never do is quietly rewrite a developer's advertised figures to make
 * them balance. The Citi Canal Enclave schedules below are the real ones off
 * the advert; both reconcile exactly, and the tests prove we'd notice if a
 * future edit broke that.
 */

const CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'PKR']

// 5 Marla — PKR 6,950,000
const FIVE_MARLA = {
  total_price: 6_950_000,
  down_payment: 1_400_000,
  currency: 'PKR',
  installments: [
    { installment_number: 1, amount: 500_000, additional_amount: 0, due_after_months: 3, display_order: 1 },
    { installment_number: 2, amount: 500_000, additional_amount: 0, due_after_months: 6, display_order: 2 },
    { installment_number: 3, amount: 500_000, additional_amount: 0, due_after_months: 9, display_order: 3 },
    { installment_number: 4, amount: 500_000, additional_amount: 750_000, due_after_months: 12, display_order: 4 },
    { installment_number: 5, amount: 500_000, additional_amount: 0, due_after_months: 15, display_order: 5 },
    { installment_number: 6, amount: 500_000, additional_amount: 0, due_after_months: 18, display_order: 6 },
    { installment_number: 7, amount: 500_000, additional_amount: 0, due_after_months: 21, display_order: 7 },
    { installment_number: 8, amount: 500_000, additional_amount: 800_000, due_after_months: 24, display_order: 8 },
  ],
}

// 10 Marla — PKR 12,950,000
const TEN_MARLA = {
  total_price: 12_950_000,
  down_payment: 2_600_000,
  currency: 'PKR',
  installments: [
    { installment_number: 1, amount: 1_000_000, additional_amount: 0, due_after_months: 3, display_order: 1 },
    { installment_number: 2, amount: 1_000_000, additional_amount: 0, due_after_months: 6, display_order: 2 },
    { installment_number: 3, amount: 1_000_000, additional_amount: 0, due_after_months: 9, display_order: 3 },
    { installment_number: 4, amount: 2_000_000, additional_amount: 0, due_after_months: 12, display_order: 4 },
    { installment_number: 5, amount: 1_000_000, additional_amount: 0, due_after_months: 15, display_order: 5 },
    { installment_number: 6, amount: 1_000_000, additional_amount: 0, due_after_months: 18, display_order: 6 },
    { installment_number: 7, amount: 1_000_000, additional_amount: 0, due_after_months: 21, display_order: 7 },
    { installment_number: 8, amount: 2_350_000, additional_amount: 0, due_after_months: 24, display_order: 8 },
  ],
}

test.describe('payment plan arithmetic', () => {
  test('Citi Canal Enclave 5 Marla reconciles exactly', () => {
    const r = reconcilePaymentPlan(FIVE_MARLA)
    expect(r.downPayment).toBe(1_400_000)
    expect(r.installmentTotal).toBe(4_000_000)
    expect(r.additionalTotal).toBe(1_550_000)
    expect(r.scheduledTotal).toBe(6_950_000)
    expect(r.difference).toBe(0)
    expect(r.reconciles).toBe(true)
    expect(r.warning).toBeNull()
  })

  test('Citi Canal Enclave 10 Marla reconciles exactly', () => {
    const r = reconcilePaymentPlan(TEN_MARLA)
    expect(r.downPayment).toBe(2_600_000)
    expect(r.installmentTotal).toBe(10_350_000)
    expect(r.scheduledTotal).toBe(12_950_000)
    expect(r.reconciles).toBe(true)
  })

  test('a short schedule is flagged, not silently corrected', () => {
    const r = reconcilePaymentPlan({ ...FIVE_MARLA, total_price: 7_000_000 })
    expect(r.reconciles).toBe(false)
    expect(r.difference).toBe(-50_000)
    expect(r.warning).toContain('Payment plan does not equal advertised total price')
    expect(r.warning).toContain('under by PKR 50,000')
    // The advertised figure is reported back untouched.
    expect(r.advertisedTotal).toBe(7_000_000)
    expect(r.scheduledTotal).toBe(6_950_000)
  })

  test('an over-long schedule reads as over, not under', () => {
    const r = reconcilePaymentPlan({ ...FIVE_MARLA, total_price: 6_900_000 })
    expect(r.difference).toBe(50_000)
    expect(r.warning).toContain('over by PKR 50,000')
  })

  test('no advertised total means nothing to contradict', () => {
    const r = reconcilePaymentPlan({ ...FIVE_MARLA, total_price: null })
    expect(r.reconciles).toBe(true)
    expect(r.warning).toBeNull()
    expect(r.scheduledTotal).toBe(6_950_000)
  })

  test('fractional amounts do not raise a false alarm', () => {
    const r = reconcilePaymentPlan({
      total_price: 100.3,
      down_payment: 0.1,
      currency: 'PKR',
      installments: [
        { amount: 0.2, additional_amount: 0 },
        { amount: 100, additional_amount: 0 },
      ],
    })
    expect(r.reconciles).toBe(true)
  })

  test('comma-formatted strings from a form are parsed', () => {
    const r = reconcilePaymentPlan({
      total_price: '6,950,000',
      down_payment: '1,400,000',
      currency: 'PKR',
      installments: [{ amount: '5,550,000', additional_amount: '0' }],
    })
    expect(r.scheduledTotal).toBe(6_950_000)
    expect(r.reconciles).toBe(true)
  })

  test('negative amounts are rejected', () => {
    const errors = validatePaymentPlan({
      total_price: -1,
      down_payment: -5,
      installments: [{ installment_number: 1, amount: -100, additional_amount: 0 }],
    })
    expect(errors.length).toBe(3)
    expect(errors.join(' ')).toContain('greater than zero')
  })

  test('schedule splits additional payments onto their own line', () => {
    const rows = buildSchedule(FIVE_MARLA)
    expect(rows[0].label).toBe('Down payment')
    expect(rows[0].timing).toBe('On booking')
    // 1 down payment + 8 instalments + 2 additional payments
    expect(rows.length).toBe(11)
    const additional = rows.filter((r) => r.kind === 'additional')
    expect(additional.map((a) => a.amount)).toEqual([750_000, 800_000])
    expect(additional[0].label).toBe('Additional payment after 1 year')
    expect(additional[1].label).toBe('Additional payment after 2 years')
    // Every row adds back up to the advertised price.
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(6_950_000)
  })
})

test.describe('plot sizing and validation', () => {
  test('marla and kanal convert on the Punjab standard', () => {
    expect(plotSizeInSqFt(5, 'marla')).toBe(1125)
    expect(plotSizeInSqFt(10, 'marla')).toBe(2250)
    expect(plotSizeInSqFt(1, 'kanal')).toBe(4500)
    expect(plotSizeInSqFt(1, 'acre')).toBe(43560)
    expect(plotSizeInSqFt(100, 'sq_yd')).toBe(900)
  })

  test('bad sizes convert to null rather than zero', () => {
    expect(plotSizeInSqFt(0, 'marla')).toBeNull()
    expect(plotSizeInSqFt(-5, 'marla')).toBeNull()
    expect(plotSizeInSqFt(5, 'furlong')).toBeNull()
    expect(plotSizeInSqFt(null, 'marla')).toBeNull()
  })

  test('sizes format the way the market says them', () => {
    expect(formatPlotSize(5, 'marla')).toBe('5 Marla')
    expect(formatPlotSize(2, 'kanal')).toBe('2 Kanal')
    expect(formatPlotSize(4500, 'sq_ft')).toBe('4,500 ft²')
    expect(formatPlotSize(null, 'marla')).toBeNull()
  })

  test('plots are recognised by subtype, and by legacy property_type', () => {
    expect(isPlotListing({ property_subtype: 'plot' })).toBe(true)
    expect(isPlotListing({ property_subtype: 'farm' })).toBe(true)
    expect(isPlotListing({ property_subtype: 'house' })).toBe(false)
    // Pre-existing rows have no subtype at all.
    expect(isPlotListing({ property_type: 'land' })).toBe(true)
    expect(isPlotListing({ property_type: 'residential' })).toBe(false)
    expect(isPlotListing(null)).toBe(false)
  })

  test('subtypes map onto the existing asset classes', () => {
    expect(assetClassFor('house')).toBe('residential')
    expect(assetClassFor('flat')).toBe('residential')
    expect(assetClassFor('room')).toBe('residential')
    expect(assetClassFor('commercial_unit')).toBe('commercial')
    expect(assetClassFor('plot')).toBe('land')
    expect(assetClassFor('farm')).toBe('land')
    expect(assetClassFor('new_development')).toBe('mixed_use')
    expect(assetClassFor('nonsense')).toBeNull()
  })

  test('a valid plot needs no bedrooms', () => {
    const errors = validatePlotListing({
      title: '5 Marla Residential Plot',
      country: 'Pakistan',
      city: 'Gujranwala',
      plotSize: 5,
      plotSizeUnit: 'marla',
      plotCategory: 'residential',
      price: 6_950_000,
      currency: 'PKR',
      images: ['properties/x.jpg'],
      supportedCurrencies: CURRENCIES,
    })
    expect(errors).toEqual([])
  })

  test('missing plot fields are named individually', () => {
    const errors = validatePlotListing({ supportedCurrencies: CURRENCIES })
    expect(errors).toContain('Title is required.')
    expect(errors).toContain('Country is required.')
    expect(errors).toContain('City is required.')
    expect(errors).toContain('Plot size is required.')
    expect(errors).toContain('Currency is required.')
    expect(errors).toContain('At least one image is required.')
  })

  test('a payment plan stands in for a headline price', () => {
    const base = {
      title: 'Plot', country: 'Pakistan', city: 'Gujranwala',
      plotSize: 5, plotSizeUnit: 'marla', plotCategory: 'residential',
      currency: 'PKR', images: ['a.jpg'], supportedCurrencies: CURRENCIES,
    }
    expect(validatePlotListing(base)).toContain('Price is required unless the listing carries a payment plan.')
    expect(validatePlotListing({ ...base, hasPaymentPlan: true })).toEqual([])
  })

  test('unsupported currency is rejected by name', () => {
    const errors = validatePlotListing({
      title: 'Plot', country: 'Pakistan', city: 'Gujranwala',
      plotSize: 5, plotSizeUnit: 'marla', plotCategory: 'residential',
      price: 1, currency: 'XYZ', images: ['a.jpg'], supportedCurrencies: CURRENCIES,
    })
    expect(errors.join(' ')).toContain('Currency XYZ is not supported')
  })

  test('slugs are url-safe and stable', () => {
    expect(slugify('Citi Canal Enclave')).toBe('citi-canal-enclave')
    expect(slugify('  Gold Mark — Phase 2 (New!)  ')).toBe('gold-mark-phase-2-new')
  })
})
