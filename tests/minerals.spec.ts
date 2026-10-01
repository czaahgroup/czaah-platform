import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanOffer, cleanRfq, mineralActionResult, offerPrice, offerQuantity, isMineralSector, PUBLIC_OFFER_COLUMNS } from '@/lib/minerals'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

const offer = (over: Record<string, unknown> = {}) => ({
  offerType: 'supply', title: ' Chromite lump ore ', commodity: 'Chromite', category: 'base_metal', grade: 'Cr2O3 42–46%',
  originCountry: 'Pakistan', originRegion: 'Balochistan', quantityAvailable: '5,000', quantityUnit: 'MT', minOrder: '500',
  priceAmount: '320', priceCurrency: 'USD', incoterm: 'fob', loadingPort: 'Karachi', hasAssayReport: true, ...over,
})

test.describe('CZAAH Minerals', () => {
  test('an offer is cleaned and keeps only what a seller may state', () => {
    const { offer: o, problems } = cleanOffer(offer({ status: 'approved', verified: true, partner_id: 'x', reference: 'MIN-1' }))
    expect(problems).toEqual([])
    expect(o).toMatchObject({
      offer_type: 'supply', title: 'Chromite lump ore', category: 'base_metal', quantity_available: 5000, quantity_unit: 'MT',
      min_order: 500, price_amount: 320, price_currency: 'USD', incoterm: 'FOB', loading_port: 'Karachi', has_assay_report: true, has_export_licence: false,
    })
    for (const key of ['status', 'verified', 'partner_id', 'reference', 'approved_by']) expect(o).not.toHaveProperty(key)
  })

  test('missing basics and bad figures are refused', () => {
    expect(cleanOffer({}).problems).toHaveLength(4)
    expect(cleanOffer(offer({ category: 'unobtainium' })).problems).toEqual(['Choose a category.'])
    expect(cleanOffer(offer({ priceAmount: 'cheap' })).problems).toEqual(['Price must be a number.'])
    // Zero is "not stated", not a row the table would reject.
    expect(cleanOffer(offer({ priceAmount: '0', quantityAvailable: 0 })).offer).toMatchObject({ price_amount: null, quantity_available: null })
    // A truthy string is not a ticked box.
    expect(cleanOffer(offer({ hasAssayReport: 'yes' })).offer!.has_assay_report).toBe(false)
  })

  test('trade terms only apply to a mineral that is for sale', () => {
    const jv = cleanOffer(offer({ offerType: 'joint_venture' })).offer!
    expect(jv).toMatchObject({ offer_type: 'joint_venture', min_order: null, incoterm: null, loading_port: null, supply_capacity: null })
    expect(offerPrice({ price_amount: 320, price_currency: 'USD', quantity_unit: 'MT', offer_type: 'supply' })).toBe('USD 320 / MT')
    expect(offerPrice({ price_amount: 2500000, price_currency: 'USD', quantity_unit: 'MT', offer_type: 'licence' })).toBe('USD 2,500,000')
    expect(offerPrice({ price_amount: null, price_currency: 'USD', quantity_unit: 'MT', offer_type: 'supply' })).toBeNull()
    expect(offerQuantity(5000, 'MT')).toBe('5,000 MT')
  })

  test('a request needs a name, an email and something to quote', () => {
    expect(cleanRfq({ email: 'a@b.co' }).error).toBeTruthy()
    expect(cleanRfq({ name: 'Sam', email: 'nope' }).error).toBeTruthy()
    expect(cleanRfq({ name: 'Sam', email: 'a@b.co' }).error).toContain('which mineral')
    const { rfq } = cleanRfq({ name: ' Sam ', email: 'A@B.co', commodity: 'Chromite', quantity: '500', quantity_unit: 'MT', incoterm: 'cif', source_page: 'https://evil.example/x' })
    expect(rfq).toMatchObject({ name: 'Sam', email: 'a@b.co', commodity: 'Chromite', quantity: 500, quantity_unit: 'MT', incoterm: 'CIF', offer_id: null, source_page: null })
    expect(cleanRfq({ name: 'Sam', email: 'a@b.co', offer_id: 'not-a-uuid', message: 'hello' }).rfq!.offer_id).toBeNull()
  })

  test('coming off the site is immediate; going on always needs approval', () => {
    expect(mineralActionResult('mark_sold', 'approved')).toEqual({ status: 'sold' })
    expect(mineralActionResult('withdraw', 'pending')).toEqual({ status: 'inactive' })
    expect(mineralActionResult('relist', 'sold')).toEqual({ status: 'pending' })
    for (const action of ['mark_sold', 'withdraw', 'relist', 'approve']) {
      for (const from of ['pending', 'approved', 'rejected', 'sold', 'inactive']) {
        expect(mineralActionResult(action, from).status).not.toBe('approved')
      }
    }
  })

  test('the public never receives the seller or CZAAH\'s notes', () => {
    for (const hidden of ['partner_id', 'verification_notes', 'rejection_notes', 'approved_by', 'verified_by', 'status']) {
      expect(PUBLIC_OFFER_COLUMNS.split(',').map((c) => c.trim())).not.toContain(hidden)
    }
    const store = read('src/lib/mineralStore.ts')
    expect(store.match(/\.eq\('status', 'approved'\)/g)).toHaveLength(2)
  })

  test('partners are gated by the Minerals sector, and can never publish or verify', () => {
    expect(isMineralSector('Minerals & Mining')).toBe(true)
    expect(isMineralSector('Real Estate')).toBe(false)
    for (const route of ['minerals/route.ts', 'minerals/[id]/route.ts']) expect(read(`src/app/api/partner/${route}`)).toContain('requireMineralPartner(request)')
    const create = read('src/app/api/partner/minerals/route.ts')
    expect(create).toContain("status: 'pending'")
    expect(create).toContain('verified: false')
    const edit = read('src/app/api/partner/minerals/[id]/route.ts')
    expect(edit).toContain('offer.partner_id !== auth.userId')
    // Editing a live offer sends it back for approval and clears Verified.
    expect(edit).toMatch(/review \? \{ status: 'pending'[^}]*verified: false/)
    expect(read('src/app/partner-network/layout.tsx')).toContain('mineral|mining')
  })

  test('verifying needs a record of what was checked', () => {
    const route = read('src/app/api/admin/minerals/[id]/route.ts')
    expect(route).toContain('Record what you checked')
    expect(route).toContain('requireAdmin(request)')
  })

  test('the site is routed, crawlable and its request route is public', () => {
    const mw = read('src/middleware.ts')
    expect(mw).toContain("host === 'minerals.czaah.com'")
    expect(mw).toContain("pathname === '/api/mineral-rfqs' ||")
    expect(read('wrangler.jsonc')).toContain('"pattern": "minerals.czaah.com"')
    expect(read('src/app/robots.ts')).toContain('https://minerals.czaah.com/sitemap.xml')
    // No <nav> element: the group site's global nav rule would pin it over the page.
    for (const f of ['layout.tsx', 'page.tsx', 'offers/page.tsx', 'offers/[id]/page.tsx', 'request/page.tsx']) {
      expect(read(`src/app/minerals-portal/${f}`)).not.toMatch(/<nav[\s>]/)
    }
  })

  test('copy makes no claim CZAAH has not checked', () => {
    const pages = ['layout.tsx', 'page.tsx', 'offers/page.tsx', 'offers/[id]/page.tsx', 'request/page.tsx', '_components/OfferCard.tsx', '_components/RfqForm.tsx']
      .map((f) => read(`src/app/minerals-portal/${f}`)).join('\n')
    for (const banned of [/guarantee/i, /\bcertified\b/i, /world[- ]class/i, /\$\s?1 trillion/i, /risk[- ]free/i, /proven reserves/i]) {
      expect(pages).not.toMatch(banned)
    }
    expect(pages).toContain('as stated by the seller')
  })
})
