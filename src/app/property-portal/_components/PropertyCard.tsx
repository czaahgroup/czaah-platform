'use client';

import Link from 'next/link';
import { LiveProperty, LISTING_META, formatPrice, isNewListing, isRental, sizedImage, fallbackToOriginal } from './types';
import { useCurrencyPref, useWishlist } from './usePortalPrefs';
import { yieldLabel } from '@/lib/marketFields';
import { track } from './analytics';

const TYPE_LABEL: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  mixed_use: 'Mixed use',
  land: 'Land',
};

// Photograph on top, facts underneath. Only what the listing actually states
// is shown: a missing bedroom count or size leaves no gap and no placeholder.
// The title link is stretched over the whole card, so the card is one tap
// target; the save button sits above it.
export function PropertyCard({
  prop,
  displayCurrency,
}: {
  prop: LiveProperty;
  displayCurrency?: string;
}) {
  const meta = LISTING_META[prop.listing_type] || { label: prop.listing_type, className: 'status-for-sale' };
  const imageSrc = sizedImage(prop.images?.[0]);
  const href = `/property-portal/${prop.id}`;
  const { has, toggle, ready } = useWishlist();
  const { currency } = useCurrencyPref();
  // An explicit ?ccy= on the page wins; otherwise fall back to the visitor's
  // saved preference from the nav.
  const shownCurrency = displayCurrency || currency || undefined;
  const saved = ready && has(prop.id);

  const specs = [
    prop.bedrooms != null ? (prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} bed`) : null,
    prop.bathrooms != null ? `${prop.bathrooms} bath` : null,
    prop.area_sqft != null ? `${prop.area_sqft.toLocaleString('en-GB')} ft²` : null,
    prop.property_type ? TYPE_LABEL[prop.property_type] || prop.property_type.replace('_', ' ') : null,
  ].filter(Boolean) as string[];

  // Sourced extras only — each is shown exactly as recorded on the listing.
  const completion = prop.completion_date ? new Date(prop.completion_date) : null;
  const notes = [
    prop.yield_percentage != null ? `${prop.yield_percentage}% ${yieldLabel(prop.yield_source).toLowerCase()}` : null,
    completion && !Number.isNaN(completion.getTime())
      ? `Completion ${completion.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short', year: 'numeric' })}`
      : null,
    prop.has_payment_plan ? 'Payment plan' : null,
    prop.developer_name ? `By ${prop.developer_name}` : null,
  ].filter(Boolean) as string[];

  const place = [prop.location, prop.city, prop.country].filter(Boolean).join(', ');

  return (
    <article className="pp-pcard">
      <div className="pp-pcard-media">
        {imageSrc ? (
          <img src={imageSrc} alt="" loading="lazy" decoding="async" onError={fallbackToOriginal} />
        ) : (
          <div className="pp-pcard-noimg" aria-hidden="true">&#8962;</div>
        )}
        <div className="pp-pcard-flags">
          <span className={`pp-pcard-flag ${meta.className}`}>{meta.label}</span>
          {isNewListing(prop) && <span className="pp-pcard-flag is-new">New</span>}
          {/* Set only through Admin → Verification, with its checks recorded. */}
          {prop.verified && <span className="pp-pcard-flag is-verified" title="Checked by CZAAH — see About us">Verified</span>}
        </div>
      </div>

      <div className="pp-pcard-body">
        <p className="pp-pcard-price">
          {prop.price && !isRental(prop) && prop.listing_type === 'off_plan' ? <small>From </small> : null}
          {formatPrice(prop, shownCurrency)}
        </p>
        <h3 className="pp-pcard-title">
          <Link href={href} className="pp-pcard-link">{prop.title}</Link>
        </h3>
        {place && <p className="pp-pcard-place">{place}</p>}
        {specs.length > 0 && (
          <ul className="pp-pcard-specs">
            {specs.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
        {notes.length > 0 && (
          <ul className="pp-pcard-notes">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
        <span className="pp-pcard-cta" aria-hidden="true">View property <i>→</i></span>
      </div>

      <button
        type="button"
        className={`pp-pcard-save${saved ? ' is-saved' : ''}`}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${prop.title} from saved` : `Save ${prop.title}`}
        title={saved ? 'Remove from saved' : 'Save this property'}
        onClick={() => { if (!saved) track('property_save', { listing_id: prop.id }); toggle(prop.id); }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 20s-7-4.6-7-9.3A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
        </svg>
      </button>
    </article>
  );
}
