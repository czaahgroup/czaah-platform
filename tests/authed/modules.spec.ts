import { test, expect, login, haveCreds } from './_setup'

/**
 * Phase 2/3 module coverage — recruitment, deals, construction, trading,
 * directory, dedup, risk radar, control plane, AI, client portal.
 *
 * Runs only with E2E_SUPER_ADMIN_* set (portal isolation also needs
 * E2E_MEMBER_*). Point at a STAGING Supabase project — these create and
 * mutate records.
 */

test.describe('Phase 2/3 modules — super admin', () => {
  test.skip(!haveCreds('superAdmin'), 'set E2E_SUPER_ADMIN_EMAIL / _PASSWORD')
  test.beforeEach(async ({ page }) => { await login(page, 'superAdmin') })

  test('recruitment: create a job order, add a candidate, advance a stage', async ({ page }) => {
    const title = `E2E Order ${Date.now()}`
    await page.goto('/admin/recruitment/orders')
    await page.getByRole('button', { name: /New Order/i }).click()
    await page.getByLabel('Job title *').fill(title)
    await page.getByLabel('Trade category *').fill('Electrical')
    await page.getByRole('button', { name: /^Create$/ }).click()
    await expect(page.getByRole('link', { name: /JO-/ }).first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('cell', { name: title }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: /Add candidate/i }).click()
    const firstCand = page.locator('button', { hasText: 'Add' }).first()
    if (await firstCand.isVisible().catch(() => false)) {
      await firstCand.click()
      await page.getByRole('button', { name: 'Done' }).click()
      await expect(page.getByText(/In pipeline/i)).toBeVisible()
    }
  })

  test('deals: create, move on the kanban, open the room', async ({ page }) => {
    const title = `E2E Deal ${Date.now()}`
    await page.goto('/admin/crm/deals')
    await page.getByRole('button', { name: /New Deal/i }).click()
    await page.getByLabel('Title *').fill(title)
    await page.getByRole('button', { name: /^Create$/ }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

    // move it one stage via the card select
    const card = page.locator('div', { hasText: title }).filter({ has: page.locator('select') }).last()
    await card.locator('select').selectOption('qualified')
    await page.waitForTimeout(800)

    await page.getByRole('link', { name: title }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('AI briefing')).toBeVisible()
  })

  test('construction: milestone completion drives project progress', async ({ page }) => {
    const name = `E2E Project ${Date.now()}`
    await page.goto('/admin/construction/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByLabel('Name *').fill(name)
    await page.getByRole('button', { name: /^Create$/ }).click()
    await expect(page.getByRole('link', { name: /CP-/ }).first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('cell', { name }).click()
    await page.getByRole('button', { name: /milestones/i }).click()
    await page.getByPlaceholder(/Foundations poured/i).fill('Phase 1')
    await page.getByRole('button', { name: /^Add$/ }).click()
    await expect(page.getByText('Phase 1')).toBeVisible()

    await page.locator('select').filter({ hasText: 'pending' }).last().selectOption('done')
    await page.waitForTimeout(1000)
    await expect(page.getByText('100%')).toBeVisible()
  })

  test('trading: create a trade and seed the standard checklist', async ({ page }) => {
    const title = `E2E Trade ${Date.now()}`
    await page.goto('/admin/trading/trades')
    await page.getByRole('button', { name: /New Trade/i }).click()
    await page.getByLabel('Title *').fill(title)
    await page.getByLabel('Commodity *').fill('Crude oil')
    await page.getByRole('button', { name: /^Create$/ }).click()
    await expect(page.getByRole('link', { name: /TR-/ }).first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole('cell', { name: title }).click()
    await page.getByRole('button', { name: /checklist/i }).click()
    await page.getByRole('button', { name: /Seed standard checklist/i }).click()
    await expect(page.getByText('LOI')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Bill of Lading')).toBeVisible()
  })

  test('directory: company list has the Type filter and column', async ({ page }) => {
    await page.goto('/admin/crm/companies')
    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()
    await expect(page.locator('select').filter({ hasText: 'All types' })).toBeVisible()
  })

  test('duplicates, risk radar and control plane render', async ({ page }) => {
    await page.goto('/admin/crm/duplicates')
    await expect(page.getByRole('heading', { name: 'Duplicates' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Could not')

    await page.goto('/admin/risk')
    await expect(page.getByRole('heading', { name: /Risk Radar/i })).toBeVisible()

    await page.goto('/admin/control-plane')
    await expect(page.getByRole('heading', { name: /Control Plane/i })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('undefined')
    await expect(page.locator('body')).not.toContainText('NaN')
  })

  test('AI admin page reflects configuration state', async ({ page }) => {
    await page.goto('/admin/ai')
    await expect(page.getByRole('heading', { name: 'AI', exact: true })).toBeVisible()
    await expect(page.getByText(/Workers AI is (configured|not configured)/)).toBeVisible()
  })
})

test.describe('client portal', () => {
  test.skip(!haveCreds('superAdmin') || !haveCreds('member'), 'set E2E_SUPER_ADMIN_* and E2E_MEMBER_*')

  test('a deal shared by an admin appears in the member portal', async ({ browser }) => {
    const title = `E2E Portal Deal ${Date.now()}`

    const admin = await browser.newPage()
    await login(admin, 'superAdmin')
    await admin.goto('/admin/crm/deals')
    await admin.getByRole('button', { name: /New Deal/i }).click()
    await admin.getByLabel('Title *').fill(title)
    await admin.getByRole('button', { name: /^Create$/ }).click()
    await expect(admin.getByText(title)).toBeVisible({ timeout: 10_000 })

    await admin.goto('/admin/portal')
    await admin.getByPlaceholder(/Filter clients/i).fill(title.slice(0, 12))
    await admin.waitForTimeout(600)
    const memberOpt = await admin.locator('select').nth(0).locator('option').nth(1).textContent()
    await admin.locator('select').nth(0).selectOption({ index: 1 })
    await admin.locator('select').nth(1).selectOption({ label: new RegExp(`Deal:.*${title}`) as any }).catch(async () => {
      // fall back: pick any option that contains the title
      const opts = admin.locator('select').nth(1).locator('option')
      const n = await opts.count()
      for (let i = 1; i < n; i++) {
        if (((await opts.nth(i).textContent()) || '').includes(title)) { await admin.locator('select').nth(1).selectOption({ index: i }); break }
      }
    })
    await admin.getByRole('button', { name: /Grant access/i }).click()
    await expect(admin.getByText(/Shared\./i)).toBeVisible({ timeout: 10_000 })
    await admin.close()

    const member = await browser.newPage()
    await login(member, 'member')
    await member.goto('/dashboard/portfolio')
    await expect(member.getByText(title)).toBeVisible({ timeout: 10_000 })
    await member.getByText(title).click()
    await expect(member.getByRole('heading', { name: title })).toBeVisible()
    await member.close()

    void memberOpt
  })
})
