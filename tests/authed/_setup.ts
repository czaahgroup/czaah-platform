import { test as base, expect, Page } from '@playwright/test'

/**
 * Authenticated test fixtures. These specs only run when the credential env
 * vars are set (see tests/README.md) — otherwise every test is skipped, so
 * the suite is safe to keep in CI before staging is wired.
 */
const CREDS = {
  superAdmin: { email: process.env.E2E_SUPER_ADMIN_EMAIL, password: process.env.E2E_SUPER_ADMIN_PASSWORD },
  partnerA: { email: process.env.E2E_PARTNER_A_EMAIL, password: process.env.E2E_PARTNER_A_PASSWORD },
  partnerB: { email: process.env.E2E_PARTNER_B_EMAIL, password: process.env.E2E_PARTNER_B_PASSWORD },
}

export const haveCreds = (role: keyof typeof CREDS) => !!(CREDS[role].email && CREDS[role].password)

export async function login(page: Page, role: keyof typeof CREDS) {
  const c = CREDS[role]
  if (!c.email || !c.password) throw new Error(`missing E2E creds for ${role}`)
  await page.goto('/login')
  await page.locator('input[type="email"], input[name="email"]').fill(c.email)
  await page.locator('input[type="password"]').fill(c.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 })
}

export const test = base
export { expect }
