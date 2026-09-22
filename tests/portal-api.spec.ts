import { test, expect } from '@playwright/test'

/**
 * The portal's data endpoints, checked for real rows rather than just a 200.
 *
 * These exist because a column that does not exist on the table was once added
 * to the listings SELECT. Every listing page — home, buy, rent, listings,
 * off-plan — renders "Listings are temporarily unavailable" when this endpoint
 * fails, and nothing in the suite noticed: the page tests only asserted that
 * the page rendered, which it does, complete with the error state.
 */

test('public properties endpoint returns listings', async ({ request }) => {
  const res = await request.get('/api/public/properties')
  expect(res.status(), 'listings endpoint should not error').toBe(200)

  const json = await res.json()
  expect(json.error, `endpoint returned an error: ${json.error}`).toBeUndefined()
  expect(Array.isArray(json.data)).toBe(true)
  // There is live inventory; an empty array means a filter or query broke.
  expect(json.data.length).toBeGreaterThan(0)

  // The columns the cards and detail pages actually read.
  const listing = json.data[0]
  for (const field of ['id', 'title', 'property_type', 'listing_type', 'currency', 'city']) {
    expect(listing, `listing is missing ${field}`).toHaveProperty(field)
  }
})

test('public properties endpoint honours the country filter', async ({ request }) => {
  const res = await request.get('/api/public/properties?countries=Pakistan')
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(json.error).toBeUndefined()
  for (const listing of json.data) expect(listing.country).toBe('Pakistan')
})

test('public developments endpoint responds', async ({ request }) => {
  const res = await request.get('/api/public/developments')
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(json.error, `endpoint returned an error: ${json.error}`).toBeUndefined()
  expect(Array.isArray(json.data)).toBe(true)
})

test('an unknown development is a 404, not an error', async ({ request }) => {
  const res = await request.get('/api/public/developments/no-such-development')
  expect(res.status()).toBe(404)
})

test('media upload urls are admin-only', async ({ request }) => {
  const res = await request.post('/api/admin/media/upload-url', {
    data: { filename: 'x.mp4', contentType: 'video/mp4' },
  })
  expect(res.status(), 'signed upload URLs must not be issued to anonymous callers').toBe(401)
})
