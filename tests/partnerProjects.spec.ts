import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanListingEdit, cleanPaymentPlan, planFromStored, describePlan, editableOnly, EDIT_COLUMNS } from '@/lib/listingEdits'
import { cleanDevelopment, cleanUnit, projectActionResult, MAX_UNITS } from '@/lib/partnerDevelopments'
import { reconcilePaymentPlan } from '@/lib/paymentPlan'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

test.describe('partner plots and payment plans', () => {
  test('plot details are cleaned, and the asset class follows the kind', () => {
    const { columns, problems } = cleanListingEdit({
      propertySubtype: 'plot', plotSize: '10', plotSizeUnit: 'marla', plotCategory: 'residential',
      block: ' C ', sector: '', plotNumber: '114', possessionStatus: 'balloted', cornerPlot: true, parkFacing: false,
    })
    expect(problems).toEqual([])
    expect(columns).toMatchObject({
      property_subtype: 'plot', property_type: 'land', plot_size: 10, plot_size_unit: 'marla', plot_category: 'residential',
      block: 'C', sector: null, plot_number: '114', possession_status: 'balloted', corner_plot: true, park_facing: false,
    })
    expect(cleanListingEdit({ plotSizeUnit: 'furlong' }).problems).toHaveLength(1)
    expect(cleanListingEdit({ plotCategory: 'beachfront' }).problems).toHaveLength(1)
    expect(cleanListingEdit({ plotSize: '0' }).problems).toHaveLength(1)
    // A truthy string is not "true": flags only come from a real checkbox.
    expect(cleanListingEdit({ cornerPlot: 'yes' }).columns.corner_plot).toBe(false)
  })

  test('a payment plan is kept exactly as typed', () => {
    const { plan, problems } = cleanPaymentPlan({
      total_price: '1,200,000', down_payment: '200000', currency: 'PKR', notes: ' Possession at 50% ',
      installments: [
        { label: 'Instalment 1', amount: '500000', due_after_months: '6' },
        { label: '', amount: '', due_after_months: '' },
        { label: 'Instalment 2', amount: '400000', due_after_months: '12' },
      ],
    })
    expect(problems).toEqual([])
    expect(plan).toMatchObject({ total_price: 1200000, down_payment: 200000, currency: 'PKR', duration_months: 12, notes: 'Possession at 50%' })
    expect(plan!.installments.map((r) => [r.installment_number, r.amount, r.due_after_months])).toEqual([[1, 500000, 6], [2, 400000, 12]])
    // 200k + 900k against 1.2m: reported to the admin, not corrected.
    expect(reconcilePaymentPlan(plan!).warning).toContain('under')
    expect(describePlan(plan)).toBe('Down payment PKR 200,000 + 2 instalments')
  })

  test('an empty plan is no plan; bad figures are refused', () => {
    expect(cleanPaymentPlan(null)).toEqual({ plan: null, problems: [] })
    expect(cleanPaymentPlan({ total_price: 500, installments: [] }).plan).toBeNull()
    expect(cleanPaymentPlan({ installments: [{ amount: 'lots' }] }).problems).toHaveLength(1)
    expect(cleanPaymentPlan({ down_payment: -5, installments: [{ amount: 10 }] }).problems.length).toBeGreaterThan(0)
    expect(cleanPaymentPlan({ installments: [{ amount: 10, due_after_months: -1 }] }).problems.length).toBeGreaterThan(0)
    expect(cleanPaymentPlan({ currency: 'XYZ', down_payment: 10 }, 'GBP').plan!.currency).toBe('GBP')
  })

  test('a stored plan compares equal to the same plan re-sent', () => {
    const { plan } = cleanPaymentPlan({ total_price: 100, down_payment: 40, currency: 'GBP', installments: [{ label: 'A', amount: 60, due_after_months: 3 }] })
    const stored = { name: 'Payment plan', total_price: '100', down_payment: '40', currency: 'GBP', duration_months: 3, notes: null,
      installments: [{ label: 'A', amount: '60', additional_amount: '0', due_after_months: 3 }] }
    expect(JSON.stringify(planFromStored(stored))).toBe(JSON.stringify(plan))
    expect(planFromStored(null)).toBeNull()
  })

  test('a payment plan is never written as a listing column', () => {
    expect(EDIT_COLUMNS).not.toContain('payment_plan')
    expect(editableOnly({ price: 1, payment_plan: { down_payment: 5 } })).toEqual({ price: 1 })
    expect(read('src/app/api/admin/properties/[id]/route.ts')).toContain("'payment_plan' in held")
  })
})

test.describe('partner projects', () => {
  const project = (over: Record<string, unknown> = {}) => ({
    name: ' Canal View ', country: 'Pakistan', city: 'Lahore', currency: 'PKR', developerName: 'Citi Housing',
    units: [{ title: '5 Marla plot', propertySubtype: 'plot', plotSize: '5', plotSizeUnit: 'marla', plotCategory: 'residential', totalPrice: '2500000',
      paymentPlan: { down_payment: '500000', installments: [{ amount: '2000000', due_after_months: 12 }] } }],
    ...over,
  })

  test('a project, its units and their plans are cleaned together', () => {
    const { development, units, newDeveloper, problems } = cleanDevelopment(project())
    expect(problems).toEqual([])
    expect(development).toMatchObject({ name: 'Canal View', country: 'Pakistan', city: 'Lahore', currency: 'PKR', developer_name: 'Citi Housing' })
    expect(newDeveloper).toBeNull()
    expect(units![0]).toMatchObject({ title: '5 Marla plot', propertyType: 'land', propertySubtype: 'plot', plotSize: 5, plotSizeUnit: 'marla', totalPrice: 2500000, availabilityStatus: 'available' })
    // The unit's price is the plan's total, whatever the form sent.
    expect(units![0].paymentPlan).toMatchObject({ total_price: 2500000, down_payment: 500000, currency: 'PKR' })
  })

  test('a partner cannot publish, feature or verify through the form', () => {
    const { development } = cleanDevelopment(project({ status: 'published', featured: true, verified: true, slug: 'x', created_by: 'someone' }))
    for (const key of ['status', 'featured', 'verified', 'slug', 'created_by']) expect(development).not.toHaveProperty(key)
    const route = read('src/app/api/partner/developments/route.ts')
    expect(route).toContain("status: 'draft'")
    expect(route).toContain('featured: false')
    expect(read('src/app/api/partner/developments/[id]/route.ts')).toContain('row.created_by !== auth.userId')
    for (const action of ['withdraw', 'resubmit', 'edit_live', 'publish']) {
      for (const from of ['draft', 'published', 'archived']) expect(projectActionResult(action, from).status).not.toBe('published')
    }
  })

  test('missing basics and bad units are reported', () => {
    expect(cleanDevelopment({}).problems).toHaveLength(3)
    expect(cleanDevelopment(project({ units: [{ title: '', totalPrice: 'x' }] })).problems.length).toBeGreaterThanOrEqual(2)
    expect(cleanDevelopment(project({ units: Array.from({ length: MAX_UNITS + 1 }, () => ({ title: 'u' })) })).problems[0]).toContain(String(MAX_UNITS))
    // A size needs a unit; a price of zero is "no price", not a row the table rejects.
    expect(cleanUnit({ title: 'A', plotSize: 5, plotSizeUnit: '' }, 0, 'PKR').problems).toHaveLength(1)
    expect(cleanUnit({ title: 'A', totalPrice: 0 }, 0, 'PKR').unit.totalPrice).toBeNull()
  })

  test('a new developer rides along with the project, hidden until approved', () => {
    const { development, newDeveloper } = cleanDevelopment(project({ developerName: 'ignored', newDeveloper: { name: ' Acme Homes ', website: 'acme.example' } }))
    expect(newDeveloper).toEqual({ name: 'Acme Homes', website: 'https://acme.example', description: null })
    expect(development!.developer_name).toBe('Acme Homes')
    const store = read('src/lib/partnerDevelopmentStore.ts')
    expect(store).toContain('active: false')
    expect(store).toContain("verification_status: 'pending'")
  })

  test('status actions', () => {
    expect(projectActionResult('withdraw', 'published')).toEqual({ status: 'archived' })
    expect(projectActionResult('resubmit', 'archived')).toEqual({ status: 'draft' })
    expect(projectActionResult('edit_live', 'published')).toEqual({ status: 'draft' })
    expect(projectActionResult('edit_live', 'draft').error).toBeTruthy()
    expect(projectActionResult('resubmit', 'draft').error).toBeTruthy()
  })

  test('every partner project route uses the shared access check', () => {
    for (const route of ['developments/route.ts', 'developments/[id]/route.ts', 'developers/route.ts']) {
      expect(read(`src/app/api/partner/${route}`)).toContain('requireLister(request)')
    }
  })
})
