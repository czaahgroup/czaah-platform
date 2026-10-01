import Link from 'next/link'
import type { Metadata } from 'next'
import { loadPublicOffers } from '@/lib/mineralStore'
import { MINERAL_CATEGORIES, CATEGORY_LABEL } from '@/lib/minerals'
import { OfferCard } from '../_components/OfferCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mineral offers',
  description: 'Minerals for sale, joint ventures, licences and investment opportunities listed through CZAAH. Request a quote on any offer.',
  alternates: { canonical: '/offers' },
}

const TYPES = [
  { value: '', label: 'All offers' },
  { value: 'supply', label: 'For sale' },
  { value: 'opportunity', label: 'JV, licences & investment' },
]

const fieldClass = 'bg-surface-container-lowest border border-outline-variant/30 px-3 py-3 text-base text-on-surface w-full focus:border-primary outline-none'

// A plain GET form: the filters work without any JavaScript and every
// filtered view has its own address.
export default async function OffersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string).trim().slice(0, 80) : '')
  const type = one('type')
  const category = MINERAL_CATEGORIES.some((c) => c.value === one('category')) ? one('category') : ''
  const q = one('q').toLowerCase()

  const offers = await loadPublicOffers()
  const shown = (offers || []).filter((o) => {
    if (type === 'supply' && o.offer_type !== 'supply') return false
    if (type === 'opportunity' && o.offer_type === 'supply') return false
    if (category && o.category !== category) return false
    if (q && ![o.title, o.commodity, o.grade, o.origin_country, o.origin_region, o.form].some((v) => v?.toLowerCase().includes(q))) return false
    return true
  })
  const filtered = !!(type || category || q)

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10">
      <p className="text-xs text-on-surface-variant mb-3"><Link href="/minerals-portal" className="hover:text-primary">Home</Link> / Offers</p>
      <h1 className="cinzel-text text-3xl sm:text-4xl font-semibold mb-6">
        Mineral <span className="text-primary">offers</span>{category ? ` — ${CATEGORY_LABEL[category]}` : ''}
      </h1>

      <form method="get" action="/minerals-portal/offers" className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] mb-6">
        <input name="q" defaultValue={one('q')} aria-label="Search by mineral, grade or origin" placeholder="Search mineral, grade or origin…" className={fieldClass} />
        <select name="type" defaultValue={type} aria-label="Kind of offer" className={fieldClass}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select name="category" defaultValue={category} aria-label="Category" className={fieldClass}>
          <option value="">Any category</option>
          {MINERAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button type="submit" className="liquid-gold-bg text-on-primary px-6 py-3 font-bold tracking-[0.12em] uppercase text-sm">Search</button>
      </form>

      <p className="text-sm text-on-surface-variant mb-5">
        {offers === null ? 'Unavailable' : `${shown.length} ${shown.length === 1 ? 'offer' : 'offers'}`}
        {filtered && <> · <Link href="/minerals-portal/offers" className="text-primary underline">Clear filters</Link></>}
      </p>

      {offers === null ? (
        <p className="text-on-surface-variant">The offers could not be loaded just now. Please try again shortly.</p>
      ) : shown.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant/15 p-8 text-center">
          <p className="text-on-surface mb-2">{filtered ? 'No offers match these filters.' : 'Offers are being prepared.'}</p>
          <p className="text-on-surface-variant mb-5">Tell us which mineral, grade and quantity you need and we will come back to you.</p>
          <Link href="/minerals-portal/request" className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm inline-block">Request a mineral</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}
    </div>
  )
}
