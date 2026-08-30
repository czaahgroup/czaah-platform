import { test, expect } from '@playwright/test'

/**
 * Regression guard for the sector directory filters. These were wired as
 * onClick={() => fn(this)} — `this` is undefined in a module, so every filter
 * button threw. Fixed 2026-08-30; this locks it in.
 */

type Case = {
  path: string
  cardSel: string
  filterSel: string
  hiddenBy: 'display' | 'class'
  searchId?: string
  searchTerm?: string
}

const cases: Case[] = [
  { path: '/sectors/agriculture', cardSel: '.crop-card', filterSel: '.crop-filter[data-filter="rice"]', hiddenBy: 'display', searchId: 'cropSearchInput', searchTerm: 'mango' },
  { path: '/sectors/textiles', cardSel: '.textile-card', filterSel: '.textile-filter[data-filter="denim"]', hiddenBy: 'class' },
  { path: '/sectors/technology', cardSel: '.it-card', filterSel: '.it-filter[data-filter="ai"]', hiddenBy: 'class' },
]

for (const c of cases) {
  test(`${c.path} — filter narrows the directory`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(c.path, { waitUntil: 'domcontentloaded' })

    const cards = page.locator(c.cardSel)
    await cards.first().waitFor({ state: 'attached', timeout: 15_000 })
    await page.waitForTimeout(400)
    const total = await cards.count()
    expect(total).toBeGreaterThan(2)

    await page.locator(c.filterSel).click()
    await page.waitForTimeout(300)

    const visible =
      c.hiddenBy === 'display'
        ? await cards.evaluateAll((els) => els.filter((e) => (e as HTMLElement).style.display !== 'none').length)
        : await cards.evaluateAll((els) => els.filter((e) => !e.classList.contains('hidden')).length)

    expect(visible).toBeGreaterThan(0)
    expect(visible).toBeLessThan(total)
    expect(errors).toEqual([])

    if (c.searchId && c.searchTerm) {
      await page.locator(`#${c.searchId}`).fill(c.searchTerm)
      await page.waitForTimeout(300)
      const afterSearch = await cards.evaluateAll((els) => els.filter((e) => (e as HTMLElement).style.display !== 'none').length)
      expect(afterSearch).toBeGreaterThan(0)
    }
  })
}
