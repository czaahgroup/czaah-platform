'use client';

import Link from 'next/link';
import { LiveProperty, LISTING_META, resolveImage, formatPrice, isNewListing } from './types';
import { useCurrencyPref, useWishlist } from './usePortalPrefs';

// Image-led portrait card: the photograph IS the card, with the detail laid
// over a gradient at its foot. Replaces the old image-plus-white-body layout,
// which spent half its height on chrome and two buttons the whole card could
// do on its own.
export function PropertyCard({
  prop,
  displayCurrency,
}: {
  prop: LiveProperty;
  displayCurrency?: string;
}) {
  const meta = LISTING_META[prop.listing_type] || { label: prop.listing_type, className: 'status-for-sale' };
  const imageSrc = resolveImage(prop.images?.[0]);
  const href = `/property-portal/${prop.id}`;
  const { has, toggle, ready } = useWishlist();
  const { currency } = useCurrencyPref();
  // An explicit ?ccy= on the page wins; otherwise fall back to the visitor's
  // saved preference from the nav.
  const shownCurrency = displayCurrency || currency || undefined;
  const saved = ready && has(prop.id);

  // A compact "3 bed, Commercial" line, the way a developer states stock.
  const summary = [
    prop.bedrooms != null ? (prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} BR`) : null,
    prop.area_sqft != null ? `${prop.area_sqft.toLocaleString()} ft²` : null,
    prop.property_type ? prop.property_type.replace('_', ' ') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <article className="pp-card">
      {/* The whole card is the link; the save button sits above it. */}
      <Link href={href} className="pp-card-link" aria-label={prop.title}>
        {imageSrc ? (
          <img className="pp-card-img" src={imageSrc} alt="" loading="lazy" />
        ) : (
          <div className="pp-card-img pp-card-img--empty">&#8962;</div>
        )}

        <div className="pp-card-flags">
          <span className={`pp-card-status ${meta.className}`}>{meta.label}</span>
          {isNewListing(prop) && <span className="pp-card-new">New</span>}
        </div>

        <div className="pp-card-overlay">
          <h3 className="pp-card-title">{prop.title}</h3>
          <p className="pp-card-place">
            {prop.location}
            {prop.city ? `, ${prop.city}` : ''}
            {prop.country ? `, ${prop.country}` : ''}
          </p>
          <p className="pp-card-price">
            {prop.price ? 'From ' : ''}
            {formatPrice(prop, shownCurrency)}
          </p>
          {summary && <p className="pp-card-summary">{summary}</p>}
          {prop.yield_percentage != null && (
            <p className="pp-card-yield">{prop.yield_percentage}% yield</p>
          )}
        </div>
      </Link>

      <button
        type="button"
        className={`pp-card-save${saved ? ' is-saved' : ''}`}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${prop.title} from saved` : `Save ${prop.title}`}
        title={saved ? 'Remove from saved' : 'Save this property'}
        onClick={() => toggle(prop.id)}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 20s-7-4.6-7-9.3A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
        </svg>
      </button>
    </article>
  );
}
