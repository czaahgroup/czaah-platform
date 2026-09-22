/**
 * Seeds the Citi Canal Enclave development (Gujranwala, Pakistan).
 *
 *   node scripts/seed-citi-canal-enclave.mjs [--publish] [--image <path>]
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Requires the 20260922000000_plots_and_developments migration to be applied.
 *
 * Safe to re-run: it upserts on the slug and replaces the variants and their
 * payment plans rather than piling up duplicates.
 *
 * It REFUSES to publish if a payment plan does not reconcile with its
 * advertised total price. Advertised figures are never adjusted to fit — the
 * script reports the discrepancy and leaves the development as a draft for an
 * admin to resolve.
 */

import { readFileSync, existsSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const env = {}
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      let value = match[2].trim()
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      if (!(match[1] in env)) env[match[1]] = value
    }
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).')
  process.exit(1)
}

const args = process.argv.slice(2)
const PUBLISH = args.includes('--publish')
const imageFlag = args.indexOf('--image')
const IMAGE_PATH = imageFlag >= 0 ? args[imageFlag + 1] : null

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── the development, exactly as advertised ───────────────────────────────
const SLUG = 'citi-canal-enclave'

const DEVELOPMENT = {
  name: 'Citi Canal Enclave',
  slug: SLUG,
  developer_name: 'Citi Housing',
  // Set the marketing agency in the admin panel — none is assumed here.
  marketing_agent: null,
  description:
    'A canal-front residential plot development in Gujranwala by Citi Housing — a gated, ' +
    'secure community with wide roads, green spaces and modern amenities, released on ' +
    'instalment payment plans and aimed at investors and self-build owners alike.',
  country: 'Pakistan',
  province_state: 'Punjab',
  city: 'Gujranwala',
  currency: 'PKR',
  development_status: 'launched',
  features: [
    'Canal front location',
    'Gated & secure community',
    'Wide roads & green spaces',
    'Modern amenities',
    'Investment-focused development',
  ],
  featured: true,
  verified: false,
}

// Instalment schedules transcribed from the advertisement. Nothing here is
// rounded, inferred or balanced — if it does not add up, that is reported.
const VARIANTS = [
  {
    title: '5 Marla',
    plot_size: 5,
    plot_size_unit: 'marla',
    plot_category: 'residential',
    total_price: 6_950_000,
    down_payment: 1_400_000,
    installments: [
      { n: 1, amount: 500_000, additional: 0, month: 3 },
      { n: 2, amount: 500_000, additional: 0, month: 6 },
      { n: 3, amount: 500_000, additional: 0, month: 9 },
      { n: 4, amount: 500_000, additional: 750_000, month: 12, note: 'Additional payment after 1 year' },
      { n: 5, amount: 500_000, additional: 0, month: 15 },
      { n: 6, amount: 500_000, additional: 0, month: 18 },
      { n: 7, amount: 500_000, additional: 0, month: 21 },
      { n: 8, amount: 500_000, additional: 800_000, month: 24, note: 'Additional payment after 2 years' },
    ],
  },
  {
    title: '10 Marla',
    plot_size: 10,
    plot_size_unit: 'marla',
    plot_category: 'residential',
    total_price: 12_950_000,
    down_payment: 2_600_000,
    installments: [
      { n: 1, amount: 1_000_000, additional: 0, month: 3 },
      { n: 2, amount: 1_000_000, additional: 0, month: 6 },
      { n: 3, amount: 1_000_000, additional: 0, month: 9 },
      { n: 4, amount: 2_000_000, additional: 0, month: 12 },
      { n: 5, amount: 1_000_000, additional: 0, month: 15 },
      { n: 6, amount: 1_000_000, additional: 0, month: 18 },
      { n: 7, amount: 1_000_000, additional: 0, month: 21 },
      { n: 8, amount: 2_350_000, additional: 0, month: 24 },
    ],
  },
]

// ── arithmetic check, before anything is written ─────────────────────────
function reconcile(variant) {
  const installmentTotal = variant.installments.reduce((s, r) => s + r.amount, 0)
  const additionalTotal = variant.installments.reduce((s, r) => s + r.additional, 0)
  const scheduled = variant.down_payment + installmentTotal + additionalTotal
  return {
    scheduled,
    advertised: variant.total_price,
    difference: scheduled - variant.total_price,
    reconciles: scheduled === variant.total_price,
    installmentTotal,
    additionalTotal,
  }
}

const pkr = (n) => `PKR ${n.toLocaleString()}`

console.log(`\nCiti Canal Enclave — payment plan check\n${'─'.repeat(52)}`)
let allReconcile = true
for (const v of VARIANTS) {
  const r = reconcile(v)
  allReconcile = allReconcile && r.reconciles
  console.log(
    `${v.title.padEnd(9)} down ${pkr(v.down_payment).padEnd(18)} ` +
      `instalments ${pkr(r.installmentTotal).padEnd(18)} additional ${pkr(r.additionalTotal).padEnd(18)}`
  )
  console.log(
    `${' '.repeat(10)}schedule ${pkr(r.scheduled)} vs advertised ${pkr(r.advertised)} → ` +
      (r.reconciles ? 'reconciles' : `MISMATCH of ${pkr(Math.abs(r.difference))}`)
  )
}
console.log('─'.repeat(52))

if (!allReconcile) {
  console.error(
    '\nAt least one payment plan does not equal its advertised total price.\n' +
      'No figure has been changed. The development will be seeded as a DRAFT so an\n' +
      'admin can check the advert before anything is published.\n'
  )
}

const publish = PUBLISH && allReconcile

// ── upload the advert image, if one was supplied ─────────────────────────
async function uploadImage() {
  if (!IMAGE_PATH) return null
  const path = resolve(IMAGE_PATH)
  if (!existsSync(path)) {
    console.error(`\nImage not found: ${path} — continuing without it.`)
    return null
  }
  const ext = (extname(path) || '.jpg').slice(1).toLowerCase()
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const storagePath = `developments/${SLUG}/${Date.now()}_${basename(path)}`
  const { error } = await supabase.storage
    .from('platform-files')
    .upload(storagePath, readFileSync(path), { contentType, upsert: true })
  if (error) {
    console.error(`\nImage upload failed: ${error.message} — continuing without it.`)
    return null
  }
  console.log(`\nUploaded advert → ${storagePath}`)
  return storagePath
}

// ── seed ─────────────────────────────────────────────────────────────────
async function main() {
  const featuredImage = await uploadImage()

  const { data: existing } = await supabase.from('developments').select('id, featured_image').eq('slug', SLUG).maybeSingle()

  const row = {
    ...DEVELOPMENT,
    status: publish ? 'published' : 'draft',
    // Keep an image already on the record if this run did not supply one.
    featured_image: featuredImage || existing?.featured_image || null,
  }

  let developmentId
  if (existing) {
    const { error } = await supabase.from('developments').update(row).eq('id', existing.id)
    if (error) throw new Error(`Updating the development failed: ${error.message}`)
    developmentId = existing.id
    console.log(`Updated existing development ${developmentId}`)
  } else {
    const { data, error } = await supabase.from('developments').insert(row).select('id').single()
    if (error) throw new Error(`Creating the development failed: ${error.message}`)
    developmentId = data.id
    console.log(`Created development ${developmentId}`)
  }

  // Replace the variants wholesale — plans and instalments cascade away with
  // them, so a re-run cannot leave a stale schedule attached.
  await supabase.from('development_units').delete().eq('development_id', developmentId)

  for (const [i, v] of VARIANTS.entries()) {
    const { data: unit, error: unitError } = await supabase
      .from('development_units')
      .insert({
        development_id: developmentId,
        title: v.title,
        property_type: 'land',
        property_subtype: 'plot',
        plot_size: v.plot_size,
        plot_size_unit: v.plot_size_unit,
        plot_category: v.plot_category,
        total_price: v.total_price,
        currency: 'PKR',
        availability_status: 'available',
        display_order: i + 1,
      })
      .select('id')
      .single()

    if (unitError) throw new Error(`Creating ${v.title} failed: ${unitError.message}`)

    const { data: plan, error: planError } = await supabase
      .from('property_payment_plans')
      .insert({
        development_unit_id: unit.id,
        name: `${v.title} payment plan`,
        total_price: v.total_price,
        down_payment: v.down_payment,
        currency: 'PKR',
        duration_months: 24,
      })
      .select('id')
      .single()

    if (planError) throw new Error(`Creating the ${v.title} plan failed: ${planError.message}`)

    const rows = v.installments.map((r, j) => ({
      payment_plan_id: plan.id,
      installment_number: r.n,
      label: `Instalment ${r.n}`,
      amount: r.amount,
      additional_amount: r.additional,
      due_after_months: r.month,
      display_order: j + 1,
      notes: r.note || null,
    }))

    const { error: rowError } = await supabase.from('property_payment_installments').insert(rows)
    if (rowError) throw new Error(`Creating ${v.title} instalments failed: ${rowError.message}`)

    console.log(`  ${v.title}: ${rows.length} instalments, ${pkr(v.total_price)}`)
  }

  console.log(
    `\nDone. Status: ${row.status.toUpperCase()}.` +
      (publish
        ? `\nLive at https://property.czaah.com/property-portal/developments/${SLUG}`
        : `\nRe-run with --publish once you are happy with it${allReconcile ? '' : ' and the figures reconcile'}.`) +
      (featuredImage ? '' : '\nNo advert image was attached — pass --image <path>, or upload it in the admin panel.')
  )
}

main().catch((err) => {
  console.error(`\n${err.message}`)
  process.exit(1)
})
