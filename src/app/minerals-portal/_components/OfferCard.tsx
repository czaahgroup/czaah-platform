import Link from 'next/link'
import { CATEGORY_LABEL, OFFER_TYPE_LABEL, mineralImage, offerPrice, offerQuantity, type PublicOffer } from '@/lib/minerals'

// Server-safe: no hooks, so the catalogue is in the HTML a crawler receives.
// Only what the offer states is shown — an empty field leaves no placeholder.
export function OfferCard({ offer }: { offer: PublicOffer }) {
  const image = mineralImage(offer.images?.[0])
  const facts = [
    offer.grade,
    offerQuantity(offer.quantity_available, offer.quantity_unit),
    [offer.incoterm, offer.loading_port].filter(Boolean).join(' ') || null,
  ].filter(Boolean) as string[]

  return (
    <article className="relative bg-surface-container border border-outline-variant/15 flex flex-col hover:border-primary/40 transition-colors">
      <div className="aspect-[16/10] bg-surface-container-high overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30" aria-hidden="true">
            <span className="material-symbols-outlined text-5xl">diamond</span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex gap-2 flex-wrap text-[11px] uppercase tracking-[0.08em]">
          <span className="px-2 py-0.5 bg-primary/15 text-primary">{OFFER_TYPE_LABEL[offer.offer_type]}</span>
          <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant">{CATEGORY_LABEL[offer.category] || offer.category}</span>
          {offer.verified && <span className="px-2 py-0.5 bg-green-500/15 text-green-400" title="CZAAH has seen the assay report or licence for this offer">Verified</span>}
        </div>
        <h3 className="text-base font-semibold text-on-surface leading-snug">
          {/* The link is stretched over the card, so the whole card is one tap target. */}
          <Link href={`/minerals-portal/offers/${offer.id}`} className="after:absolute after:inset-0 hover:text-primary">{offer.title}</Link>
        </h3>
        <p className="text-sm text-on-surface-variant">
          {offer.commodity} · {[offer.origin_region, offer.origin_country].filter(Boolean).join(', ')}
        </p>
        {facts.length > 0 && <p className="text-sm text-on-surface-variant">{facts.join(' · ')}</p>}
        <p className="text-primary font-semibold mt-auto pt-2">{offerPrice(offer) || 'Price on request'}</p>
      </div>
    </article>
  )
}
