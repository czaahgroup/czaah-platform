import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateSection, PORTAL_DEFAULTS } from '@/lib/portalContent'
import {
  groupWhyInvest,
  portalTestimonials,
  portalWhyInvest,
  WHY_INVEST_POINTS,
  TESTIMONIALS,
} from '@/app/property-portal/_components/portal-content'
import { DESTINATIONS } from '@/app/property-portal/_components/destinations'
import { INSIGHTS } from '@/app/property-portal/_components/insights-data'
import { seedPortalRuntime } from '@/app/property-portal/_components/portalRuntime'

/**
 * The 2026-09-23 claims review removed every figure, comparison and guarantee
 * the portal could not evidence (UK advertising rules require substantiation).
 * These tests stop that copy creeping back in through the shipped defaults or
 * the page sources. Anything an editor adds in /admin is their responsibility —
 * the admin screen carries the same rules as hints.
 */

const BANNED: [RegExp, string][] = [
  [/\d+(\.\d+)?\s?%/, 'a percentage figure'],
  [/tax[- ]free/i, '"tax-free"'],
  [/guarantee/i, 'a guarantee'],
  [/title[- ]verified/i, '"title-verified"'],
  // "record inflows", "a record $3.8bn" — not "a matter of public record".
  [/\ba record\b|\brecord (high|inflows?|levels?|growth|year|returns?)/i, 'a "record" claim'],
  [/regardless of which government/i, 'political-risk protection'],
  [/lower-risk/i, 'a risk comparison'],
]

function findClaims(label: string, text: string) {
  return BANNED.filter(([re]) => re.test(text)).map(([, what]) => `${label}: ${what}`)
}

test.describe('shipped portal copy makes no unevidenced claims', () => {
  test('why-invest, destinations, insights and testimonials', () => {
    const problems = [
      ...WHY_INVEST_POINTS.flatMap((p) => findClaims(`why-invest "${p.title}"`, `${p.title} ${p.body}`)),
      ...DESTINATIONS.flatMap((d) => findClaims(`destination ${d.slug}`, `${d.tagline} ${d.blurb}`)),
      ...INSIGHTS.flatMap((a) => findClaims(`insight ${a.id}`, `${a.title} ${a.excerpt}`)),
      ...TESTIMONIALS.flatMap((t, i) => findClaims(`testimonial ${i + 1}`, t.quote)),
    ]
    expect(problems).toEqual([])
  })

  test('page sources with inline copy', () => {
    const root = join(__dirname, '..', 'src', 'app', 'property-portal')
    // The allocator is left out: its percentages are computed from live listings
    // and carry their own disclaimer, and its tax notes quote statutory rates.
    const files = ['page.tsx', 'about/page.tsx', 'layout.tsx', 'destinations/[slug]/page.tsx', 'insights/page.tsx']
    const problems = files.flatMap((f) => {
      // Comments may name the banned phrases when explaining their removal.
      const code = readFileSync(join(root, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      return findClaims(f, code)
    })
    expect(problems).toEqual([])
  })

  test('testimonials ship empty until real, attributable ones are added', () => {
    expect(TESTIMONIALS).toEqual([])
    expect(PORTAL_DEFAULTS.testimonials).toEqual([])
  })
})

test.describe('why invest', () => {
  test('rows group by market in first-seen order and skip blanks', () => {
    const grouped = groupWhyInvest([
      { market: 'Dubai', title: 'A', body: 'a' },
      { market: 'London', title: 'B', body: 'b' },
      { market: 'Dubai', title: 'C', body: 'c' },
      { market: '', title: 'no market', body: '' },
      { market: 'London', title: '  ', body: 'no title' },
    ])
    expect(grouped.map((m) => m.market)).toEqual(['Dubai', 'London'])
    expect(grouped[0].points.map((p) => p.title)).toEqual(['A', 'C'])
    expect(grouped[1].points.map((p) => p.title)).toEqual(['B'])
  })

  test('the shipped reasons cover the three core markets', () => {
    expect(groupWhyInvest(WHY_INVEST_POINTS).map((m) => m.market)).toEqual(['London', 'Dubai', 'Pakistan'])
  })

  test('an empty list is refused; a row needs a market and a title', () => {
    expect(validateSection('whyInvest', []).length).toBeGreaterThan(0)
    expect(validateSection('whyInvest', [{ market: '', title: 'x' }]).join(' ')).toContain('market')
    expect(validateSection('whyInvest', [{ market: 'Dubai', title: '' }]).join(' ')).toContain('title')
    expect(validateSection('whyInvest', [{ market: 'Dubai', title: 'x', body: 'y' }])).toEqual([])
  })

  test('a stored list of unusable rows falls back to the shipped reasons', () => {
    seedPortalRuntime({ whyInvest: [{ market: '', title: '' }] } as never)
    expect(portalWhyInvest().length).toBe(3)
  })
})

test.describe('testimonials', () => {
  test('an empty list is allowed — it hides the section', () => {
    expect(validateSection('testimonials', [])).toEqual([])
  })

  test('a testimonial needs a quote and an author', () => {
    expect(validateSection('testimonials', [{ quote: '', author: 'x' }]).join(' ')).toContain('quote')
    expect(validateSection('testimonials', [{ quote: 'x', author: '' }]).join(' ')).toContain('author')
  })

  test('stored testimonials are used, and blank quotes dropped', () => {
    seedPortalRuntime({
      testimonials: [
        { quote: 'Real quote', author: 'A', role: 'B' },
        { quote: '   ', author: 'C', role: 'D' },
      ],
    } as never)
    expect(portalTestimonials().map((t) => t.quote)).toEqual(['Real quote'])
  })

  test('a stored empty list is honoured rather than replaced', () => {
    seedPortalRuntime({ testimonials: [] } as never)
    expect(portalTestimonials()).toEqual([])
  })
})
