import { CURRENCIES } from '@/lib/currencies'
import { PLOT_CATEGORIES, POSSESSION_STATUSES, DEVELOPMENT_STATUSES, AVAILABILITY_STATUSES, PROPERTY_SUBTYPES, assetClassFor, isPlotSizeUnit } from '@/lib/plots'
import { cleanPaymentPlan, type CleanPlan } from '@/lib/listingEdits'
import type { UnitPayload } from '@/lib/developments'

/**
 * A development (new project) as a partner submits it from the Partner
 * Network: the project, the developer, and its units — each unit a plot size
 * or home type with a price and an optional payment plan.
 *
 * A partner's project is always stored as a draft; only an admin publishes
 * it. Pure module: validation shared by the API and its tests.
 */

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const inList = (v: unknown, list: { value: string }[]) => list.some((o) => o.value === v)

export interface CleanUnit extends UnitPayload {
  title: string
  paymentPlan: CleanPlan | null
}

export interface CleanDevelopment {
  name: string
  developer_name: string | null
  description: string | null
  country: string
  city: string
  area: string | null
  currency: string
  development_status: string | null
  possession_status: string | null
  features: string[]
}

export interface CleanNewDeveloper {
  name: string
  website: string | null
  description: string | null
}

/** How a partner reads a development's status. */
export const PROJECT_STATUS_LABEL: Record<string, string> = {
  draft: 'Awaiting approval',
  published: 'Live',
  archived: 'Withdrawn',
}

export const MAX_UNITS = 40

function number(v: unknown, label: string, problems: string[]): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) {
    problems.push(`${label} must be a number.`)
    return null
  }
  return n
}

/** One unit row from the form. A row with no title is a blank line and is skipped by the caller. */
export function cleanUnit(raw: unknown, index: number, currency: string): { unit: CleanUnit; problems: string[] } {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const problems: string[] = []
  const at = `Unit ${index + 1}`
  const title = text(b.title, 120)
  if (!title) problems.push(`${at}: give it a name, e.g. "5 Marla plot".`)

  const subtype = PROPERTY_SUBTYPES.some((s) => s.value === b.propertySubtype) ? (b.propertySubtype as string) : 'plot'
  const size = number(b.plotSize, `${at}: plot size`, problems)
  const unitOfSize = text(b.plotSizeUnit, 12)
  if (size != null && size > 0 && !isPlotSizeUnit(unitOfSize)) problems.push(`${at}: choose a plot size unit.`)
  const price = number(b.totalPrice, `${at}: price`, problems)

  const plan = cleanPaymentPlan(
    b.paymentPlan && typeof b.paymentPlan === 'object' ? { ...(b.paymentPlan as object), total_price: price } : null,
    currency,
  )
  problems.push(...plan.problems.map((p) => `${at}: ${p}`))

  return {
    unit: {
      title,
      propertySubtype: subtype,
      propertyType: assetClassFor(subtype) || 'land',
      plotSize: size && size > 0 ? size : null,
      plotSizeUnit: size && size > 0 && isPlotSizeUnit(unitOfSize) ? unitOfSize : null,
      plotCategory: inList(b.plotCategory, PLOT_CATEGORIES) ? (b.plotCategory as string) : null,
      bedrooms: number(b.bedrooms, `${at}: bedrooms`, problems),
      areaSqft: number(b.areaSqft, `${at}: area`, problems),
      // The table refuses a price of zero; "no price" is null.
      totalPrice: price && price > 0 ? price : null,
      currency,
      availabilityStatus: inList(b.availabilityStatus, AVAILABILITY_STATUSES) ? (b.availabilityStatus as string) : 'available',
      displayOrder: index + 1,
      paymentPlan: plan.plan,
    },
    problems,
  }
}

/** The project itself, its units and (optionally) a developer to add. */
export function cleanDevelopment(body: unknown): {
  development?: CleanDevelopment
  units?: CleanUnit[]
  newDeveloper?: CleanNewDeveloper | null
  problems: string[]
} {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const problems: string[] = []

  const name = text(b.name, 150)
  const country = text(b.country, 80)
  const city = text(b.city, 80)
  if (!name) problems.push('The project needs a name.')
  if (!country) problems.push('Choose a country.')
  if (!city) problems.push('Enter the city.')

  const currency = CURRENCIES.includes(b.currency as string) ? (b.currency as string) : 'PKR'

  // Either an existing developer's name, or the details of a new one.
  let newDeveloper: CleanNewDeveloper | null = null
  let developerName = text(b.developerName, 150) || null
  const nd = b.newDeveloper && typeof b.newDeveloper === 'object' ? (b.newDeveloper as Record<string, unknown>) : null
  if (nd && text(nd.name, 150)) {
    const website = text(nd.website, 300)
    newDeveloper = {
      name: text(nd.name, 150),
      website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
      description: text(nd.description, 4000) || null,
    }
    developerName = newDeveloper.name
  }

  const rows = Array.isArray(b.units) ? b.units : []
  if (rows.length > MAX_UNITS) problems.push(`A project can have up to ${MAX_UNITS} units.`)
  const units: CleanUnit[] = []
  rows.slice(0, MAX_UNITS).forEach((raw, i) => {
    const cleaned = cleanUnit(raw, i, currency)
    problems.push(...cleaned.problems)
    units.push(cleaned.unit)
  })

  const features = (Array.isArray(b.features) ? b.features : String(b.features ?? '').split(','))
    .map((f) => text(f, 60))
    .filter(Boolean)

  if (problems.length) return { problems }
  return {
    development: {
      name,
      developer_name: developerName,
      description: text(b.description, 6000) || null,
      country,
      city,
      area: text(b.area, 160) || null,
      currency,
      development_status: inList(b.developmentStatus, DEVELOPMENT_STATUSES) ? (b.developmentStatus as string) : null,
      possession_status: inList(b.possessionStatus, POSSESSION_STATUSES) ? (b.possessionStatus as string) : null,
      features: [...new Set(features)].slice(0, 40),
    },
    units,
    newDeveloper,
    problems,
  }
}

/** What an owner may do to a project's status. Publishing is never one of them. */
export type ProjectAction = 'withdraw' | 'resubmit' | 'edit_live'

export function projectActionResult(action: unknown, status: string): { status?: string; error?: string } {
  if (action === 'withdraw') {
    return status === 'published' || status === 'draft' ? { status: 'archived' } : { error: 'This project is already withdrawn.' }
  }
  if (action === 'resubmit') {
    return status === 'archived' ? { status: 'draft' } : { error: 'Only a withdrawn project can be sent again.' }
  }
  // A live project is taken off the site to be edited, then approved again.
  if (action === 'edit_live') {
    return status === 'published' ? { status: 'draft' } : { error: 'This project is not live.' }
  }
  return { error: 'Unknown action.' }
}
