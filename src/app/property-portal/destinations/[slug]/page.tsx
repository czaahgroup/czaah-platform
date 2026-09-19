'use client';
// @ts-nocheck

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PropertyCard } from '../../_components/PropertyCard';
import { useListings } from '../../_components/useListings';
import { resolveImage } from '../../_components/types';
import { destinationBySlug, slugForCity } from '../../_components/destinations';
import { WHY_INVEST } from '../../_components/portal-content';

export default function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const { all, loading, error, reload } = useListings();

  const dest = destinationBySlug(slug);

  const props = useMemo(
    () => all.filter((p) => slugForCity(p.city) === slug),
    [all, slug]
  );

  // Title-case an unknown slug so the page still reads properly for a city
  // that has listings but no editorial entry yet.
  const cityName =
    dest?.city ||
    props[0]?.city ||
    slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const country = dest?.country || props[0]?.country || '';

  const hero = useMemo(() => {
    const withImage = props.find((p) => resolveImage(p.images?.[0]));
    return withImage ? resolveImage(withImage.images[0]) : null;
  }, [props]);

  // Market-level reasons, matched by country so a Pakistan city inherits the
  // Pakistan case rather than showing nothing.
  const why = useMemo(() => {
    if (!country) return null;
    if (/united kingdom/i.test(country)) return WHY_INVEST.find((w) => w.market === 'London');
    if (/emirates/i.test(country)) return WHY_INVEST.find((w) => w.market === 'Dubai');
    if (/pakistan/i.test(country)) return WHY_INVEST.find((w) => w.market === 'Pakistan');
    return null;
  }, [country]);

  const notFound = !loading && !error && props.length === 0 && !dest;

  return (
    <main>
      {/* Hero */}
      <section className="pp-dest-hero">
        {hero && <div className="pp-dest-hero-img" style={{ backgroundImage: `url(${hero})` }} />}
        <div className="pp-container pp-dest-hero-body">
          <div className="pp-crumbs">
            <Link href="/property-portal">Home</Link> /{' '}
            <Link href="/property-portal/destinations">Destinations</Link> / {cityName}
          </div>
          {dest?.tagline && <div className="pp-eyebrow">{dest.tagline}</div>}
          <h1>
            {cityName}
            {country && <span className="pp-dest-hero-country">{country}</span>}
          </h1>
          {dest?.blurb && <p className="pp-hero-lede">{dest.blurb}</p>}
          <div className="pp-hero-stats">
            <div>
              <span>{loading ? '—' : error ? '—' : props.length}</span>
              <small>{props.length === 1 ? 'Live listing' : 'Live listings'}</small>
            </div>
            {!loading && !error && props.length > 0 && (
              <div>
                <span>{new Set(props.map((p) => p.property_type)).size}</span>
                <small>Asset types</small>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="pp-container">
        <section className="pp-section">
          <div className="pp-section-head">
            <div>
              <div className="pp-eyebrow">Available now</div>
              <h2 className="pp-h2">Properties in {cityName}</h2>
            </div>
            <Link href="/property-portal/listings" className="pp-link-arrow">
              All listings →
            </Link>
          </div>

          <div className="pp-grid">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="pp-skeleton" />)}

            {!loading && error && (
              <div className="pp-empty">
                We couldn&apos;t load these listings just now.{' '}
                <button type="button" className="pp-retry" onClick={reload}>Try again</button>
                <span className="pp-empty-detail">{error}</span>
              </div>
            )}

            {notFound && (
              <div className="pp-empty">
                We don&apos;t cover this destination.{' '}
                <Link href="/property-portal/destinations" className="pp-gold">
                  See where we operate
                </Link>
              </div>
            )}

            {!loading && !error && !notFound && props.length === 0 && (
              <div className="pp-empty">
                Nothing is live in {cityName} right now — we hold off-market stock here.{' '}
                <Link href="/property-portal/contact" className="pp-gold">Ask the desk →</Link>
              </div>
            )}

            {!loading && !error && props.map((p) => <PropertyCard key={p.id} prop={p} />)}
          </div>
        </section>

        {why && (
          <section className="pp-section pp-stats-band" style={{ borderRadius: 14 }}>
            <div className="pp-container">
              <h2 className="pp-h2" style={{ marginBottom: 30 }}>
                Why <span className="pp-gold">{why.market}</span>?
              </h2>
              <div className="pp-why-grid">
                {why.points.map((pt) => (
                  <div className="pp-why-tile" key={pt.title}>
                    <h3>{pt.title}</h3>
                    <p>{pt.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="pp-section--tight">
          <div className="pp-container" style={{ textAlign: 'center' }}>
            <h2 className="pp-h2" style={{ marginBottom: 12 }}>
              Looking for something specific in {cityName}?
            </h2>
            <p className="pp-section-lead" style={{ marginBottom: 24 }}>
              Not everything we hold is published. Tell the desk your brief and we&apos;ll come
              back with what fits.
            </p>
            <Link href="/property-portal/contact" className="pp-btn pp-btn--gold">
              Contact the desk
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
