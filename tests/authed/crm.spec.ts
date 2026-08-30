import { test, expect, login, haveCreds } from './_setup'

/**
 * CRM workflow coverage. Runs only when E2E_SUPER_ADMIN_* (and, for the
 * isolation test, E2E_PARTNER_A_* / E2E_PARTNER_B_*) are set.
 *
 * Point these at a STAGING Supabase project — these create and delete records.
 */

test.describe('CRM — super admin', () => {
  test.skip(!haveCreds('superAdmin'), 'set E2E_SUPER_ADMIN_EMAIL / _PASSWORD')

  test.beforeEach(async ({ page }) => { await login(page, 'superAdmin') })

  test('dashboard loads with real numbers', async ({ page }) => {
    await page.goto('/admin/crm/dashboard')
    await expect(page.getByRole('heading', { name: /CRM Overview/i })).toBeVisible()
    await expect(page.getByText(/^Clients$/)).toBeVisible()
    // KPI values render as numbers, not "undefined"/"NaN"
    await expect(page.locator('body')).not.toContainText('undefined')
    await expect(page.locator('body')).not.toContainText('NaN')
  })

  test('contacts list loads and filters', async ({ page }) => {
    await page.goto('/admin/crm/contacts')
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('select').first().selectOption('client')
    await page.waitForTimeout(600)
    // still a valid table (or an empty-state), never an error
    await expect(page.locator('body')).not.toContainText('Could not load')
  })

  test('create a contact, add a note and a task, see them on the timeline', async ({ page }) => {
    const name = `E2E Contact ${Date.now()}`
    await page.goto('/admin/crm/contacts')
    await page.getByRole('button', { name: /New Contact/i }).click()
    await page.locator('input').first().fill(name)
    await page.getByRole('button', { name: /^Create$/ }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()

    await page.getByRole('button', { name: 'notes' }).click()
    await page.locator('textarea').fill('First contact made by phone.')
    await page.getByRole('button', { name: /Add note/i }).click()
    await expect(page.getByText('First contact made by phone.')).toBeVisible()

    await page.getByRole('button', { name: 'tasks' }).click()
    await page.getByPlaceholder(/Add a task/i).fill('Send proposal')
    await page.getByRole('button', { name: /^Add$/ }).click()
    await expect(page.getByText('Send proposal')).toBeVisible()

    await page.getByRole('button', { name: 'activity' }).click()
    await expect(page.getByText(/note added|contact created/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('lead board and pipeline render', async ({ page }) => {
    await page.goto('/admin/crm/leads')
    await expect(page.getByRole('heading', { name: /Lead Board/i })).toBeVisible()
    await page.goto('/admin/crm/pipeline')
    await expect(page.getByRole('heading', { name: /Pipeline/i })).toBeVisible()
  })

  test('task board loads', async ({ page }) => {
    await page.goto('/admin/crm/tasks')
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Could not load')
  })
})

test.describe('CRM — partner isolation', () => {
  test.skip(!haveCreds('partnerA') || !haveCreds('partnerB'), 'set E2E_PARTNER_A_* and E2E_PARTNER_B_*')

  test("partner A's contact is invisible to partner B", async ({ browser }) => {
    const secret = `Isolation ${Date.now()}`

    const a = await browser.newPage()
    await login(a, 'partnerA')
    await a.goto('/partner-network/crm')
    await a.locator('input').first().fill(secret)
    await a.getByRole('button', { name: /^Add$/ }).click()
    await expect(a.getByText(secret)).toBeVisible({ timeout: 10_000 })
    await a.close()

    const b = await browser.newPage()
    await login(b, 'partnerB')
    await b.goto('/partner-network/crm')
    await b.waitForTimeout(1500)
    await expect(b.getByText(secret)).toHaveCount(0)
    // and the API directly
    const res = await b.request.get('/api/crm/contacts?q=Isolation')
    const json = await res.json()
    expect((json.data || []).some((c: { name: string }) => c.name === secret)).toBe(false)
    await b.close()
  })
})
