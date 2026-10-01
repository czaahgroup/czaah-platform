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
    for (const f of ['layout.tsx', 'page.tsx', 'offers/page.tsx', 'offers/[id]/page.tsx', 'request/page.tsx', 'resources/page.tsx', 'about/page.tsx']) {
      expect(read(`src/app/minerals-portal/${f}`)).not.toMatch(/<nav[\s>]/)
    }
  })

  test('copy makes no claim CZAAH has not checked', () => {
    const pages = ['layout.tsx', 'page.tsx', 'offers/page.tsx', 'offers/[id]/page.tsx', 'request/page.tsx', 'resources/page.tsx', 'about/page.tsx', '_components/OfferCard.tsx', '_components/RfqForm.tsx']
      .map((f) => read(`src/app/minerals-portal/${f}`)).join('\n') + read('src/app/sectors/minerals/page.tsx')
    for (const banned of [/guarantee/i, /\bcertified\b/i, /world[- ]class/i, /\$\s?1 ?(trillion|T\+)/i, /risk[- ]free/i, /proven reserves/i, /investment[- ]ready/i, /verified investment/i, /untapped/i, /unprecedented/i]) {
      expect(pages).not.toMatch(banned)
    }
    expect(pages).toContain('as stated by the seller')
  })
})

test.describe('guide to Pakistan\'s minerals', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MINERAL_RESOURCES, PROVINCES } = require('@/app/minerals-portal/_components/resources') as typeof import('@/app/minerals-portal/_components/resources')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MINERAL_CATEGORIES } = require('@/lib/minerals') as typeof import('@/lib/minerals')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { existsSync } = require('fs') as typeof import('fs')

  test('all 21 minerals came across, each with a real image, category and province', () => {
    expect(MINERAL_RESOURCES).toHaveLength(21)
    expect(new Set(MINERAL_RESOURCES.map((r) => r.slug)).size).toBe(21)
    for (const r of MINERAL_RESOURCES) {
      expect(MINERAL_CATEGORIES.map((c) => c.value), r.name).toContain(r.category)
      expect(PROVINCES, r.name).toContain(r.province)
      expect(existsSync(join(__dirname, '..', 'public', r.image)), `${r.name}: ${r.image}`).toBe(true)
    }
  })

  test('the guide rates nothing and promises nothing', () => {
    const text = MINERAL_RESOURCES.map((r) => `${r.name} ${r.description} ${r.uses} ${r.places}`).join('\n')
    for (const banned of [/world[- ]class/i, /world'?s (largest|finest|second)/i, /\bfinest\b/i, /premium/i, /tier 1/i, /exceptional/i, /massive/i, /untapped/i, /upside/i, /opportunit/i, /investment/i, /unprecedented/i, /\bboom\b/i, /\d+ ?%/]) {
      expect(text).not.toMatch(banned)
    }
  })

  test('a figure only appears with a named source beside it', () => {
    for (const r of MINERAL_RESOURCES) {
      const hasFigure = /\d[\d,.]* ?(million|billion|tonnes|ounces|km)/i.test(r.description)
      if (hasFigure) {
        expect(r.source, `${r.name} states a figure`).toBeTruthy()
        expect(r.source!.url).toMatch(/^https:\/\//)
      }
    }
    // The three that carry figures today.
    expect(MINERAL_RESOURCES.filter((r) => r.source).map((r) => r.slug)).toEqual(['copper', 'gold', 'coal-thar'])
  })

  test('the group page no longer carries the directory or a price panel', () => {
    const page = read('src/app/sectors/minerals/page.tsx')
    expect(page).toContain('https://minerals.czaah.com')
    for (const gone of ['mn-panel', 'METALS_API_KEY', 'Live Metal Prices', 'FALLBACK_PRICES']) expect(page).not.toContain(gone)
  })
})
