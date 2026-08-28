'use client';

import Link from 'next/link';
import { LiveProperty, LISTING_META, resolveImage, formatPrice } from './types';

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

  return (
    <div className="pp-card">
      <Link href={href} className="pp-card-img-wrap">
        {imageSrc ? (
          <img className="pp-card-img" src={imageSrc} alt={prop.title} loading="lazy" />
        ) : (
          <div className="pp-card-img pp-card-img--empty">&#8962;</div>
        )}
        <span className={`pp-card-status ${meta.className}`}>{meta.label}</span>
      </Link>
      <div className="pp-card-body">
        <div className="pp-card-tags">
          <span className="pp-card-type">{prop.property_type.replace('_', ' ')}</span>
          <span className="pp-card-loc">{prop.city}{prop.country ? `, ${prop.country}` : ''}</span>
        </div>
        <Link href={href} className="pp-card-title-link">
          <h3 className="pp-card-title">{prop.title}</h3>
        </Link>
        <p className="pp-card-place">{prop.location}</p>
        <div className="pp-card-specs">
          {prop.bedrooms != null && <span>{prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} bed`}</span>}
          {prop.bathrooms != null && <span>{prop.bathrooms} bath</span>}
          {prop.area_sqft != null && <span>{prop.area_sqft.toLocaleString()} ft&sup2;</span>}
          {prop.yield_percentage != null && <span>{prop.yield_percentage}% yield</span>}
        </div>
        <div className="pp-card-price-row">
          <span className="pp-card-price">{formatPrice(prop, displayCurrency)}</span>
        </div>
        <div className="pp-card-actions">
          <Link href={href} className="pp-card-btn pp-card-btn--ghost">View Details</Link>
          <Link
            href={`/contact?interest=${encodeURIComponent(prop.title)}#contact-form`}
            className="pp-card-btn pp-card-btn--gold"
          >
            Enquire
          </Link>
        </div>
      </div>
    </div>
  );
}
