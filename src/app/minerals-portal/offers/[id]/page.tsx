import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadPublicOffer } from '@/lib/mineralStore'
import { CATEGORY_LABEL, OFFER_TYPE_LABEL, mineralImage, offerPrice, offerQuantity } from '@/lib/minerals'
import { RfqForm } from '../../_components/RfqForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const offer = await loadPublicOffer(id)
  if (!offer) return { title: 'Offer not found', robots: { index: false } }
  const where = [offer.origin_region, offer.origin_country].filter(Boolean).join(', ')
  return {
    title: offer.title,
    description: `${offer.commodity} — ${OFFER_TYPE_LABEL[offer.offer_type].toLowerCase()}, ${where}. Request a quote through CZAAH Minerals.`,
    alternates: { canonical: `/offers/${offer.id}` },
  }
}

export default async function OfferPage({ params }: Props) {
  const { id } = await params
  const offer = await loadPublicOffer(id)
  if (offer === null) notFound()
  if (offer === undefined) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-16">
        <p className="text-on-surface-variant">This offer could not be loaded just now. Please try again shortly.</p>
      </div>
    )
  }

  const supply = offer.offer_type === 'supply'
  const images = (offer.images || []).map(mineralImage).filter(Boolean) as string[]
  const facts = ([
    ['Mineral', offer.commodity],
    ['Category', CATEGORY_LABEL[offer.category] || offer.category],
    ['Form', offer.form],
    ['Grade / specification', offer.grade],
    ['Origin', [offer.origin_region, offer.origin_country].filter(Boolean).join(', ')],
    [supply ? 'Quantity available' : 'Estimated quantity', offerQuantity(offer.quantity_available, offer.quantity_unit)],
    ['Minimum order', offerQuantity(offer.min_order, offer.quantity_unit)],
    ['Supply capacity', offer.supply_capacity],
    ['Delivery terms', offer.incoterm],
    ['Loading port', offer.loading_port],
    ['Packaging', offer.packaging],
  ] as [string, string | null][]).filter(([, v]) => v)

  // What the seller says they hold. Shown as their statement, never as fact.
  const stated = [offer.has_assay_report && 'an assay / test report', offer.has_export_licence && 'the mining lease or export licence'].filter(Boolean) as string[]

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10">
      <p className="text-xs text-on-surface-variant mb-3">
        <Link href="/minerals-portal" className="hover:text-primary">Home</Link> / <Link href="/minerals-portal/offers" className="hover:text-primary">Offers</Link> / {offer.reference}
      </p>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
        <div>
          <div className="flex gap-2 flex-wrap text-[11px] uppercase tracking-[0.08em] mb-3">
            <span className="px-2 py-0.5 bg-primary/15 text-primary">{OFFER_TYPE_LABEL[offer.offer_type]}</span>
            {offer.verified && <Link href="/minerals-portal#verified" className="px-2 py-0.5 bg-green-500/15 text-green-400">Verified</Link>}
            <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant">{offer.reference}</span>
          </div>
          <h1 className="cinzel-text text-3xl sm:text-4xl font-semibold leading-tight mb-3">{offer.title}</h1>
          <p className="text-2xl text-primary font-semibold mb-6">{offerPrice(offer) || 'Price on request'}</p>

          {images.length > 0 && (
            <div className="grid gap-3 grid-cols-2 mb-8">
              {images.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={i === 0 ? offer.title : ''} loading={i === 0 ? 'eager' : 'lazy'} className={`w-full object-cover bg-surface-container-high ${i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`} />
              ))}
            </div>
          )}

          <dl className="grid sm:grid-cols-2 border-t border-outline-variant/20 mb-8">
            {facts.map(([k, v]) => (
              <div key={k} className="border-b border-outline-variant/20 py-3 pr-4">
                <dt className="text-xs uppercase tracking-[0.05em] text-on-surface-variant">{k}</dt>
                <dd className="text-on-surface mt-1">{v}</dd>
              </div>
            ))}
          </dl>

          {offer.description && (
            <section className="mb-8">
              <h2 className="cinzel-text text-xl mb-3">Description</h2>
              <p className="text-on-surface-variant leading-relaxed whitespace-pre-line">{offer.description}</p>
            </section>
          )}

          <section className="border border-outline-variant/20 p-5">
            <h2 className="text-base font-semibold mb-2">Documents and checks</h2>
            <p className="text-on-surface-variant leading-relaxed">
              {offer.verified
                ? 'Verified: CZAAH has seen the assay report or the lease or licence for this offer.'
                : stated.length
                  ? `The seller states that they hold ${stated.join(' and ')}. CZAAH has not yet verified this offer.`
                  : 'CZAAH has not verified this offer. Grade and quantity are as stated by the seller.'}{' '}
              Buyers should carry out their own inspection and due diligence before committing.
            </p>
          </section>
        </div>

        <div className="lg:sticky lg:top-24">
          <RfqForm offer={{ id: offer.id, title: offer.title, reference: offer.reference, quantity_unit: offer.quantity_unit, supply }} />
        </div>
      </div>
    </div>
  )
}
