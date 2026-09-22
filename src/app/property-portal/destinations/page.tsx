'use client';
// @ts-nocheck

import Link from 'next/link';
import { useMemo } from 'react';
import { useListings } from '../_components/useListings';
import { resolveImage } from '../_components/types';
import { portalDestinations, destinationFor, slugForCity } from '../_components/destinations';

export default function DestinationsPage() {
  const { all, loading, error, reload } = useListings();

  // Build the grid from what's actually live, so a destination card never
  // promises properties that aren't there. Cities with listings but no
  // editorial entry still appear, just without a tagline.
  const cards = useMemo(() => {
    const byCity = new Map<string, typeof all>();
    all.forEach((p) => {
      if (!p.city) return;
      const key = p.city.trim();
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key)!.push(p);
    });

    const rows = [...byCity.entries()].map(([city, props]) => {
      const d = destinationFor(city);
      const withImage = props.find((p) => resolveImage(p.images?.[0]));
      return {
        slug: slugForCity(city)!,
        city,
        country: props[0]?.country || d?.country || '',
        tagline: d?.tagline || '',
        count: props.length,
        types: [...new Set(props.map((p) => p.property_type?.replace('_', ' ')).filter(Boolean))],
        image: withImage ? resolveImage(withImage.images[0]) : null,
      };
    });

    // Most stock first — the places worth exploring lead.
    return rows.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  }, [all]);

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Destinations
        </div>

        <div className="pp-listpage-head">
          <h1>
            Our <span className="pp-gold">destinations</span>
          </h1>
          <div className="pp-listpage-meta">
            <span>
              {loading ? 'Loading…' : error ? 'Unavailable' : `${cards.length} places`}
            </span>
          </div>
        </div>

        <p className="pp-section-lead" style={{ maxWidth: 740, marginBottom: 40 }}>
          CZAAH transacts in a deliberately short list of markets. Explore a place to see what
          we hold there, why it earns its position, and who covers it on the ground.
        </p>

        {loading && (
          <div className="pp-dest-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pp-skeleton" style={{ height: 300 }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="pp-empty">
            We couldn&apos;t load destinations just now.{' '}
            <button type="button" className="pp-retry" onClick={reload}>Try again</button>
            <span className="pp-empty-detail">{error}</span>
          </div>
        )}

        {!loading && !error && cards.length === 0 && (
          <div className="pp-empty">No live listings right now — check back shortly.</div>
        )}

        {!loading && !error && cards.length > 0 && (
          <div className="pp-dest-grid">
            {cards.map((c) => (
              <Link
                href={`/property-portal/destinations/${c.slug}`}
                className="pp-dest"
                key={c.slug}
              >
                <div className="pp-dest-img">
                  {c.image ? (
                    <img src={c.image} alt={c.city} loading="lazy" />
                  ) : (
                    <div className="pp-card-img--empty">⌂</div>
                  )}
                  <span className="pp-dest-count">
                    {c.count} {c.count === 1 ? 'property' : 'properties'}
                  </span>
                </div>
                <div className="pp-dest-body">
                  <h2>{c.city}</h2>
                  <span className="pp-dest-country">{c.country}</span>
                  {c.tagline && <p className="pp-dest-tagline">{c.tagline}</p>}
                  {c.types.length > 0 && (
                    <span className="pp-dest-types">{c.types.join(' · ')}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Places CZAAH covers that have no live stock right now — shown so the
            reach is visible without implying something is available. */}
        {!loading && !error && (
          <p className="pp-saved-note" style={{ marginTop: 34 }}>
            {portalDestinations().filter((d) => !cards.some((c) => c.slug === d.slug)).length > 0 && (
              <>
                Also covered, nothing live today:{' '}
                {portalDestinations().filter((d) => !cards.some((c) => c.slug === d.slug))
                  .map((d) => d.city)
                  .join(', ')}
                . <Link href="/property-portal/contact" className="pp-gold">Ask the desk →</Link>
              </>
            )}
          </p>
        )}
      </div>
    </main>
  );
}
