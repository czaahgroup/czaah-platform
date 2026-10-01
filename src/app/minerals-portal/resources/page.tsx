import Link from 'next/link'
import type { Metadata } from 'next'
import { loadPublicOffers } from '@/lib/mineralStore'
import { MINERAL_CATEGORIES, CATEGORY_LABEL } from '@/lib/minerals'
import { MINERAL_RESOURCES, PROVINCES } from '../_components/resources'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pakistan’s minerals: a guide by type and province',
  description: 'Where Pakistan’s copper, gold, chromite, coal, salt, gemstones and marble occur, and what they are used for. A general guide from CZAAH Minerals.',
  alternates: { canonical: '/resources' },
}

const fieldClass = 'bg-surface-container-lowest border border-outline-variant/30 px-3 py-3 text-base text-on-surface w-full focus:border-primary outline-none'

// A plain GET form, like the offers page: filters work without JavaScript.
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string).trim().slice(0, 80) : '')
  const category = MINERAL_CATEGORIES.some((c) => c.value === one('category')) ? one('category') : ''
  const province = (PROVINCES as readonly string[]).includes(one('province')) ? one('province') : ''
  const q = one('q').toLowerCase()

  const shown = MINERAL_RESOURCES.filter((r) => {
    if (category && r.category !== category) return false
    if (province && r.province !== province) return false
    if (q && ![r.name, r.places, r.description, r.uses, r.province].some((v) => v.toLowerCase().includes(q))) return false
    return true
  })

  // How many live offers there are for each mineral, so the guide can point
  // at something real — or at the request form when there is nothing listed.
  const offers = (await loadPublicOffers()) || []
  const offersFor = (search: string) => offers.filter((o) => `${o.commodity} ${o.title}`.toLowerCase().includes(search)).length

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10">
      <p className="text-xs text-on-surface-variant mb-3"><Link href="/minerals-portal" className="hover:text-primary">Home</Link> / Resources</p>
      <h1 className="cinzel-text text-3xl sm:text-4xl font-semibold mb-3">Pakistan&rsquo;s <span className="text-primary">minerals</span></h1>
      <p className="text-on-surface-variant leading-relaxed max-w-3xl mb-6">
        A guide to what occurs where, and what it is used for. This is general information about the country&rsquo;s geology, not a list of
        things for sale: minerals and projects actually available through CZAAH are in the <Link href="/minerals-portal/offers" className="text-primary underline">offers</Link>.
      </p>

      <form method="get" action="/minerals-portal/resources" className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] mb-6">
        <input name="q" defaultValue={one('q')} aria-label="Search by mineral, district or use" placeholder="Search mineral, district or use…" className={fieldClass} />
        <select name="category" defaultValue={category} aria-label="Category" className={fieldClass}>
          <option value="">Any category</option>
          {MINERAL_CATEGORIES.filter((c) => c.value !== 'other').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select name="province" defaultValue={province} aria-label="Province" className={fieldClass}>
          <option value="">Any province</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="submit" className="liquid-gold-bg text-on-primary px-6 py-3 font-bold tracking-[0.12em] uppercase text-sm">Search</button>
      </form>

      <p className="text-sm text-on-surface-variant mb-5">
        {shown.length} {shown.length === 1 ? 'mineral' : 'minerals'}
        {(category || province || q) && <> · <Link href="/minerals-portal/resources" className="text-primary underline">Clear filters</Link></>}
      </p>

      {shown.length === 0 ? (
        <p className="text-on-surface-variant">Nothing in the guide matches. <Link href="/minerals-portal/request" className="text-primary underline">Tell us which mineral you need</Link>.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {shown.map((r) => {
            const live = offersFor(r.search)
            return (
              <article key={r.slug} id={r.slug} className="bg-surface-container border border-outline-variant/15 flex flex-col sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image} alt="" loading="lazy" decoding="async" className="w-full sm:w-44 h-44 sm:h-auto object-cover shrink-0 bg-surface-container-high" />
                <div className="p-5 flex flex-col gap-2 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold text-on-surface">{r.name}</h2>
                    <span className="text-xs text-on-surface-variant">{r.formula}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap text-[11px] uppercase tracking-[0.08em]">
                    <span className="px-2 py-0.5 bg-primary/15 text-primary">{CATEGORY_LABEL[r.category]}</span>
                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant">{r.province}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{r.description}</p>
                  <p className="text-sm text-on-surface-variant"><span className="text-on-surface">Where:</span> {r.places}</p>
                  <p className="text-sm text-on-surface-variant"><span className="text-on-surface">Used for:</span> {r.uses}</p>
                  {r.source && (
                    <p className="text-xs text-on-surface-variant">
                      Source: <a href={r.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{r.source.label}</a>
                    </p>
                  )}
                  <p className="mt-auto pt-2">
                    {live > 0 ? (
                      <Link href={`/minerals-portal/offers?q=${encodeURIComponent(r.search)}`} className="text-sm text-primary font-semibold hover:underline">
                        {live} {live === 1 ? 'offer' : 'offers'} for {r.name.toLowerCase()} →
                      </Link>
                    ) : (
                      <Link href={`/minerals-portal/request?mineral=${encodeURIComponent(r.name)}`} className="text-sm text-primary font-semibold hover:underline">
                        Request {r.name.toLowerCase()} →
                      </Link>
                    )}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
