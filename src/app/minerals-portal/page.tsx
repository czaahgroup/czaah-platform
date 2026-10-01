import Link from 'next/link'
import { loadPublicOffers } from '@/lib/mineralStore'
import { MINERAL_CATEGORIES } from '@/lib/minerals'
import { OfferCard } from './_components/OfferCard'
import { RfqForm } from './_components/RfqForm'

// Offers change when an admin approves one, so the page is rendered per request.
export const dynamic = 'force-dynamic'

const STEPS = [
  { n: '1', title: 'Browse or ask', text: 'Look through the offers listed here, or tell us which mineral, grade and quantity you need.' },
  { n: '2', title: 'Request a quote', text: 'Send your quantity, destination and delivery terms. Your request goes to CZAAH.' },
  { n: '3', title: 'We come back to you', text: 'CZAAH replies with availability and terms. Nothing is agreed until it is confirmed in writing.' },
]

export default async function MineralsHome() {
  const offers = await loadPublicOffers()
  const latest = (offers || []).slice(0, 6)
  // Only categories that actually have an offer are linked.
  const live = MINERAL_CATEGORIES.filter((c) => (offers || []).some((o) => o.category === c.value))

  return (
    <>
      <section className="border-b border-outline-variant/15 bg-surface-container-lowest">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">CZAAH Minerals</p>
          <h1 className="cinzel-text text-4xl sm:text-6xl font-semibold leading-[1.1] mb-6 max-w-3xl">
            Mineral supply, <span className="text-primary">one accountable partner.</span>
          </h1>
          <p className="text-on-surface-variant text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
            Browse minerals for sale, joint ventures and licences listed through CZAAH, and request a quote.
            Every offer is reviewed by CZAAH before it is published.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/minerals-portal/offers" className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm inline-block">Browse offers</Link>
            <Link href="/minerals-portal/request" className="border border-primary/50 text-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm inline-block">Request a mineral</Link>
          </div>
          <p className="text-on-surface-variant mt-8">
            New to Pakistan&rsquo;s minerals? Read the <Link href="/minerals-portal/resources" className="text-primary underline">guide by type and province</Link>.
          </p>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <h2 className="cinzel-text text-2xl sm:text-3xl font-semibold">Latest <span className="text-primary">offers</span></h2>
          {latest.length > 0 && <Link href="/minerals-portal/offers" className="text-sm text-primary hover:underline">View all {offers!.length} →</Link>}
        </div>
        {offers === null ? (
          <p className="text-on-surface-variant">The offers could not be loaded just now. Please try again shortly, or <Link href="/minerals-portal/request" className="text-primary underline">send us your requirement</Link>.</p>
        ) : latest.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant/15 p-8 text-center">
            <p className="text-on-surface mb-2">Offers are being prepared.</p>
            <p className="text-on-surface-variant mb-5">Tell us which mineral, grade and quantity you need and we will come back to you.</p>
            <Link href="/minerals-portal/request" className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm inline-block">Request a mineral</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        )}
        {live.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-8">
            {live.map((c) => (
              <Link key={c.value} href={`/minerals-portal/offers?category=${c.value}`} className="text-sm px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary">{c.label}</Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-outline-variant/15 bg-surface-container-lowest">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14">
          <h2 className="cinzel-text text-2xl sm:text-3xl font-semibold mb-8">How it <span className="text-primary">works</span></h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="border border-outline-variant/15 p-6">
                <span className="cinzel-text text-3xl text-primary block mb-3">{s.n}</span>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 border border-outline-variant/15 p-6 max-w-3xl" id="verified">
            <h3 className="text-lg font-semibold mb-2">What &ldquo;Verified&rdquo; means</h3>
            <p className="text-on-surface-variant leading-relaxed">
              An offer marked Verified is one where CZAAH has seen the assay report or the lease or licence the seller relies on.
              On every other offer, the grade, quantity and documents are as stated by the seller. Buyers should always carry out
              their own inspection and due diligence before committing.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-[900px] mx-auto px-4 sm:px-8 py-14" id="request">
        <RfqForm />
      </section>
    </>
  )
}
