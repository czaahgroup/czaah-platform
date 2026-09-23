import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

/**
 * Whole-portal audit (Phase 11): WCAG 2.1 A/AA via axe at desktop and phone
 * size, horizontal overflow at 360–1440px, console errors, broken images and
 * broken internal links. Slow (~4 min), so it only runs when asked:
 *
 *   AUDIT_BASE_URL=http://127.0.0.1:3100 npx playwright test tests/portalAudit.spec.ts --project=chromium
 *
 * (a local `next start`, or https://czaah.com — the portal lives under
 * /property-portal on every host). The full report is written to
 * test-results/portal-audit.json.
 */
const BASE = process.env.AUDIT_BASE_URL || ''
const OUT = 'test-results/portal-audit.json'

test('portal audit', async ({ browser, request }) => {
  test.skip(!BASE, 'Set AUDIT_BASE_URL to run the portal audit.')
  test.setTimeout(900_000)
  const props = (await (await request.get(`${BASE}/api/public/properties?countries=Pakistan,United%20Kingdom,United%20Arab%20Emirates`)).json()).data
  const devs = (await (await request.get(`${BASE}/api/public/developments?countries=Pakistan,United%20Kingdom,United%20Arab%20Emirates`)).json()).data
  const sale = props.find((p: any) => p.listing_type !== 'rent' && p.images?.length) || props[0]
  const rent = props.find((p: any) => p.listing_type === 'rent')
  const pages = [
    '', '/buy', '/buy/pakistan', '/rent', '/listings', '/off-plan', '/investments', '/new-projects', '/developers',
    '/developers/citi-housing', `/developments/${devs[0]?.slug}`, `/${sale.id}`, rent ? `/${rent.id}` : null,
    '/sell', '/contact', '/about', '/destinations', '/account', '/saved',
  ].filter((p): p is string => p !== null)

  const report: any = { pages: {}, links: {} }
  const links = new Set<string>()
  for (const path of pages) {
    const entry: any = { axe: {}, overflow: {}, console: [], brokenImages: [], bytes: 0, requests: 0 }
    for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]] as const) {
      const ctx = await browser.newContext({ viewport: { width, height }, isMobile: label === 'mobile', hasTouch: label === 'mobile' })
      const page = await ctx.newPage()
      let bytes = 0, requests = 0
      page.on('response', async (r) => { requests++; const l = Number(r.headers()['content-length'] || 0); bytes += l })
      page.on('console', (m) => { if (m.type() === 'error') entry.console.push(`${label}: ${m.text().slice(0, 200)}`) })
      page.on('pageerror', (e) => entry.console.push(`${label} PAGEERROR: ${e.message.slice(0, 200)}`))
      await page.goto(`${BASE}/property-portal${path}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {})
      await page.waitForTimeout(1500)
      // Dismiss the cookie banner so it doesn't count against every page.
      await page.getByRole('button', { name: 'Accept' }).click({ timeout: 1000 }).catch(() => {})
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      entry.axe[label] = axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('').trim().slice(0, 160)) }))
      for (const w of label === 'mobile' ? [360, 390, 768] : [1024, 1440]) {
        await page.setViewportSize({ width: w, height: 900 })
        await page.waitForTimeout(300)
        const o = await page.evaluate(() => {
          const over = document.documentElement.scrollWidth - window.innerWidth
          const culprits: string[] = []
          if (over > 0) for (const el of Array.from(document.querySelectorAll('body *'))) {
            const r = el.getBoundingClientRect()
            if (r.right > window.innerWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') { culprits.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).split(' ')[0]} → ${Math.round(r.right)}`); if (culprits.length > 4) break }
          }
          return { over, culprits }
        })
        if (o.over > 0) entry.overflow[w] = o
      }
      entry.brokenImages.push(...(await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(0, 160)))).map((s) => `${label}: ${s}`))
      if (label === 'desktop') {
        entry.bytes = bytes; entry.requests = requests
        for (const href of await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''))) {
          if (href.startsWith('/') && !href.startsWith('//')) links.add(href.split('#')[0])
        }
        entry.lcp = await page.evaluate(() => new Promise((res) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => res(Math.round(v)), 500) }))
        entry.images = await page.evaluate(() => Array.from(document.images).filter((i) => i.naturalWidth > 0).map((i) => ({ src: i.currentSrc.slice(-70), natural: `${i.naturalWidth}x${i.naturalHeight}`, shown: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`, lazy: i.loading })).filter((i) => Number(i.natural.split('x')[0]) > 2 * Math.max(1, Number(i.shown.split('x')[0]))).slice(0, 8))
      }
      await ctx.close()
    }
    report.pages[path || '/'] = entry
  }
  for (const href of links) {
    const r = await request.get(`${BASE}${href}`, { maxRedirects: 0 }).catch(() => null)
    const s = r ? r.status() : 0
    if (s >= 400 || s === 0) report.links[href] = s
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync(OUT, JSON.stringify(report, null, 1))
  const problems = Object.entries(report.pages).flatMap(([p, e]: [string, any]) => [
    ...Object.entries(e.axe).flatMap(([vp, vs]: [string, any]) => vs.map((v: any) => `${p} (${vp}): ${v.id} ×${v.n}`)),
    ...Object.keys(e.overflow).map((w) => `${p}: sideways scroll at ${w}px`),
    ...e.console.map((c: string) => `${p}: console ${c}`),
    ...e.brokenImages.map((i: string) => `${p}: broken image ${i}`),
  ])
  problems.push(...Object.entries(report.links).map(([h, s]) => `broken link ${h} → ${s}`))
  expect(problems).toEqual([])
})
