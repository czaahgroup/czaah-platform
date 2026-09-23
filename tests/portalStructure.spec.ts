import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The root layout styles every <nav> as a fixed, full-width bar. Any other
 * <nav> in the portal is therefore pinned across the top of the page — which
 * has shipped twice (the development tab bar, then the location chips). In-page
 * link groups use <div role="navigation"> instead. Only the site header may be
 * a <nav>.
 */
test('only the portal header uses a <nav> element', () => {
  const root = join(__dirname, '..', 'src', 'app', 'property-portal')
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx$/.test(name) && name !== 'PortalNav.tsx') {
        const code = readFileSync(p, 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '')
        if (/<nav[\s>]/.test(code)) offenders.push(p.slice(root.length + 1))
      }
    }
  }
  walk(root)
  expect(offenders).toEqual([])
})
