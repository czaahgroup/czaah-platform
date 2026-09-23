import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanVerification, REQUIRED_CHECKS, VERIFICATION_CHECKS } from '@/lib/verification'
import { normaliseHomeLayout, validateHomeLayout, DEFAULT_HOME_LAYOUT, HOME_SECTIONS } from '@/lib/homeLayout'

const ID = '1b2c3d4e-0000-4000-8000-000000000001'
const allRequired = Object.fromEntries(REQUIRED_CHECKS.map((k) => [k, true]))

test.describe('verification', () => {
  test('verifying needs every required check and a note', () => {
    expect(cleanVerification({ target: 'listing', id: ID, verified: true, checks: allRequired, notes: 'Title deed ref 123 seen' })).toMatchObject({ verified: true })
    expect('error' in cleanVerification({ target: 'listing', id: ID, verified: true, checks: { ...allRequired, ownership: false }, notes: 'x' })).toBe(true)
    expect('error' in cleanVerification({ target: 'listing', id: ID, verified: true, checks: allRequired, notes: '  ' })).toBe(true)
    // Truthy-but-not-true values don't count as a completed check.
    expect('error' in cleanVerification({ target: 'listing', id: ID, verified: true, checks: { identity: 'yes', ownership: 1, details: true }, notes: 'x' })).toBe(true)
  })

  test('removing verification needs no checks; bad targets are refused', () => {
    expect(cleanVerification({ target: 'development', id: ID, verified: false, notes: 'Documents expired' })).toMatchObject({ verified: false, checks: null })
    expect('error' in cleanVerification({ target: 'developer', id: ID, verified: false })).toBe(true)
    expect('error' in cleanVerification({ target: 'listing', id: 'x', verified: false })).toBe(true)
  })

  test('the About page explains exactly the required checks', () => {
    const about = readFileSync(join(__dirname, '..', 'src/app/property-portal/about/page.tsx'), 'utf8')
    expect(about).toContain('VERIFICATION_CHECKS.filter((c) => c.required)')
    expect(VERIFICATION_CHECKS.filter((c) => c.required).length).toBeGreaterThanOrEqual(3)
  })

  test('general edit routes can no longer set verified', () => {
    const src = (p: string) => readFileSync(join(__dirname, '..', 'src', p), 'utf8')
    expect(src('lib/developments.ts')).not.toContain("bool('verified', 'verified')")
    expect(src('app/api/admin/developments/[id]/route.ts')).not.toContain("bool('verified', 'verified')")
    expect(src('app/api/admin/developments/route.ts')).not.toMatch(/verified:\s*!!body\.verified/)
  })
})

test.describe('home layout', () => {
  test('a missing or broken layout falls back to the shipped order', () => {
    expect(normaliseHomeLayout(null)).toEqual(DEFAULT_HOME_LAYOUT)
    expect(normaliseHomeLayout({ sections: 'nope' })).toEqual(DEFAULT_HOME_LAYOUT)
    expect(DEFAULT_HOME_LAYOUT.map((s) => s.key)).toEqual(HOME_SECTIONS.map((s) => s.key))
  })

  test('stored order is kept; unknown and duplicate keys dropped; new sections appended', () => {
    const out = normaliseHomeLayout({ sections: [{ key: 'cta', visible: false }, { key: 'bogus' }, { key: 'markets' }, { key: 'cta' }] })
    expect(out.slice(0, 2)).toEqual([{ key: 'cta', visible: false }, { key: 'markets', visible: true }])
    expect(out).toHaveLength(HOME_SECTIONS.length)
    expect(new Set(out.map((s) => s.key)).size).toBe(HOME_SECTIONS.length)
  })

  test('the admin cannot hide every section', () => {
    expect(validateHomeLayout({ sections: HOME_SECTIONS.map((s) => ({ key: s.key, visible: false })) }).error).toBeTruthy()
    expect(validateHomeLayout({ sections: [{ key: 'markets', visible: true }] }).sections).toHaveLength(HOME_SECTIONS.length)
  })

  test('every configurable section is rendered by the home page', () => {
    const home = readFileSync(join(__dirname, '..', 'src/app/property-portal/page.tsx'), 'utf8')
    for (const s of HOME_SECTIONS) expect(home).toMatch(new RegExp(`\\n    ${s.key}: \\(`))
  })
})
