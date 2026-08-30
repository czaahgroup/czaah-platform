import { test, expect } from '@playwright/test'

/**
 * Smoke tests — no auth. These prove the site boots, public pages render, and
 * the auth wall is in place. They run on every push and block the build on red.
 */

const PUBLIC_PAGES = [
  '/',
  '/about',
  '/team',
  '/contact',
  '/process',
  '/insights',
  '/investments',
  '/faq',
  '/privacy',
  '/terms',
  '/services',
  '/sectors',
  '/services/business-setup',
  '/sectors/agriculture',
  '/sectors/technology',
  '/property-portal',
  '/login',
  '/register',
  '/webmail',
]

test.describe('public pages', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} renders without error`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(res?.status(), `${path} HTTP status`).toBeLessThan(400)

      // page has real content, not an error shell
      await expect(page.locator('body')).not.toBeEmpty()
      const text = (await page.locator('body').innerText()).toLowerCase()
      expect(text).not.toContain('application error')
      expect(text).not.toContain('internal server error')

      // give client hydration a beat, then check for thrown errors
      await page.waitForTimeout(500)
      const realErrors = errors.filter((e) => !/ResizeObserver|Lock broken/i.test(e))
      expect(realErrors, `${path} console errors`).toEqual([])
    })
  }
})

test('home page has navigation and CZAAH branding', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/CZAAH/i)
  await expect(page.locator('nav a').first()).toBeVisible()
  await expect(page.locator('footer')).toContainText(/CZAAH/i)
})

test('login page shows email and password fields', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('webmail page shows the sign-in form', async ({ page }) => {
  await page.goto('/webmail')
  await expect(page.getByText(/CZAAH\s*WEBMAIL/i)).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test.describe('auth wall', () => {
  for (const path of ['/admin', '/dashboard', '/partner-network', '/admin/mail/mailboxes', '/admin/crm/contacts', '/admin/recruitment/orders', '/admin/crm/deals', '/admin/construction/projects']) {
    test(`${path} redirects to login when signed out`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  for (const api of ['/api/mail/threads', '/api/crm/contacts', '/api/crm/companies', '/api/crm/timeline?type=contact&id=x', '/api/recruitment/orders', '/api/recruitment/overview', '/api/recruitment/candidates', '/api/deals', '/api/deals/lookup', '/api/construction/projects', '/api/construction/overview']) {
    test(`${api} returns 401 when signed out`, async ({ request }) => {
      const res = await request.get(api)
      expect(res.status()).toBe(401)
    })
  }
})

test('sitemap.xml is served as XML', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('xml')
  expect(await res.text()).toContain('<urlset')
})
