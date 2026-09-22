import { test, expect } from '@playwright/test'
import { mergeSection, validateSection, PORTAL_DEFAULTS } from '@/lib/portalContent'

/**
 * The safety property this whole content layer rests on: a stored row can only
 * ever override, never break. Anything missing, malformed or the wrong type
 * falls back to what the site shipped with, so no admin edit can produce a
 * blank page.
 */

test.describe('content merging falls back rather than breaking', () => {
  const defaults = PORTAL_DEFAULTS.settings

  test('an empty or absent row keeps the defaults', () => {
    expect(mergeSection(defaults, null)).toEqual(defaults)
    expect(mergeSection(defaults, undefined)).toEqual(defaults)
    expect(mergeSection(defaults, {})).toEqual(defaults)
  })

  test('a partial row only overrides what it sets', () => {
    const merged = mergeSection(defaults, { countries: ['Pakistan'] })
    expect(merged.countries).toEqual(['Pakistan'])
    // Everything else still comes from the default.
    expect(merged.currencies).toEqual(defaults.currencies)
    expect(merged.fxPerUsd).toEqual(defaults.fxPerUsd)
  })

  test('a wrongly-typed value is ignored, not written through', () => {
    const merged = mergeSection(defaults, {
      countries: 'Pakistan',           // string where an array belongs
      acquisitionCostEnabled: 'yes',   // string where a boolean belongs
      currencies: ['GBP'],             // this one is fine
    })
    expect(merged.countries).toEqual(defaults.countries)
    expect(merged.acquisitionCostEnabled).toBe(false)
    expect(merged.currencies).toEqual(['GBP'])
  })

  test('unknown keys cannot sneak into the shape', () => {
    const merged = mergeSection(defaults, { somethingElse: 'x' }) as Record<string, unknown>
    expect(merged.somethingElse).toBeUndefined()
  })

  test('a null value never blanks a default', () => {
    const merged = mergeSection(defaults, { countries: null, currencies: null })
    expect(merged.countries).toEqual(defaults.countries)
    expect(merged.currencies).toEqual(defaults.currencies)
  })

  test('the shipped hero reel is not empty', () => {
    // An empty reel would render a black hero; the fallback must have clips.
    expect(PORTAL_DEFAULTS.home.heroReel.length).toBeGreaterThan(0)
    for (const clip of PORTAL_DEFAULTS.home.heroReel) {
      expect(clip.video).toBeTruthy()
      expect(clip.poster).toBeTruthy()
    }
  })

  test('acquisition costs ship switched off', () => {
    // They publish unverified tax figures; turning them on is a deliberate act.
    expect(PORTAL_DEFAULTS.settings.acquisitionCostEnabled).toBe(false)
  })
})

test.describe('settings validation', () => {
  test('an empty country list is refused', () => {
    const errors = validateSection('settings', { countries: [], currencies: ['USD'], fxPerUsd: { USD: 1 } })
    expect(errors.join(' ')).toContain('At least one country')
  })

  test('a currency without a usable rate is refused', () => {
    const errors = validateSection('settings', {
      countries: ['Pakistan'],
      currencies: ['USD', 'PKR'],
      fxPerUsd: { USD: 1, PKR: 0 },
    })
    expect(errors.join(' ')).toContain('PKR needs an exchange rate')
  })

  test('valid settings pass', () => {
    expect(
      validateSection('settings', {
        countries: ['Pakistan'],
        currencies: ['USD', 'PKR'],
        fxPerUsd: { USD: 1, PKR: 278 },
      })
    ).toEqual([])
  })

  test('a malformed office email is refused', () => {
    expect(validateSection('offices', { email: 'not-an-email' }).join(' ')).toContain('not a valid address')
    expect(validateSection('offices', { email: 'info@czaah.com' })).toEqual([])
  })
})
