import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = (p: string) => readFileSync(join(__dirname, '..', 'src', p), 'utf8')

test('card images use the resized copy for Supabase storage, and nothing else', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
  const { sizedImage } = await import('@/app/property-portal/_components/types')
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  expect(sizedImage('developments/a/b.jpeg')).toBe(`${base}/storage/v1/render/image/public/property-images/developments/a/b.jpeg?width=800&quality=75`)
  expect(sizedImage(`${base}/storage/v1/object/public/property-images/x.png`, 400)).toBe(`${base}/storage/v1/render/image/public/property-images/x.png?width=400&quality=75`)
  expect(sizedImage('/videos/night-skyline.jpg')).toBe('/videos/night-skyline.jpg')
  expect(sizedImage('https://cdn.example.com/p.jpg')).toBe('https://cdn.example.com/p.jpg')
  expect(sizedImage(null)).toBeNull()
})

test('pinch-zoom is allowed on the site (WCAG 1.4.4); only the mail app keeps its app viewport', () => {
  // The setting itself, not the comment explaining its removal.
  expect(src('app/layout.tsx')).not.toMatch(/maximumScale\s*:|userScalable\s*:/)
})

test('the icon font loads a single instance, not the 3.9 MB variable font', () => {
  const layout = src('app/layout.tsx')
  expect(layout).toContain('Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,200,0,0')
  // Every use of the font must be that same instance.
  expect(src('app/globals.css').match(/font-variation-settings:[^;]+/g)?.every((v) => v.includes("'wght' 200") && v.includes("'FILL' 0"))).toBe(true)
})

test('the portal has a skip link to its content', () => {
  const layout = src('app/property-portal/layout.tsx')
  expect(layout).toContain('href="#pp-main"')
  expect(layout).toContain('id="pp-main"')
})

test('every filter dropdown on the search pages has an accessible name', () => {
  for (const f of ['app/property-portal/buy/BuyView.tsx', 'app/property-portal/rent/RentView.tsx', 'app/property-portal/listings/page.tsx', 'app/property-portal/off-plan/page.tsx']) {
    const code = src(f)
    // A <select> is fine inside a <label>; otherwise it needs aria-label.
    const unnamed = [...code.matchAll(/<select(?![^>]*aria-label)[^>]*>/g)].filter((m) => {
      const before = code.slice(Math.max(0, m.index! - 200), m.index!)
      return before.lastIndexOf('<label') <= before.lastIndexOf('</label>')
    })
    expect(unnamed.map((m) => `${f}: ${m[0].slice(0, 60)}`)).toEqual([])
  }
})
