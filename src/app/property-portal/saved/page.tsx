'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PropertyCard } from '../_components/PropertyCard';
import { useListings } from '../_components/useListings';
import { useWishlist } from '../_components/usePortalPrefs';
import { resolveImage, portalCountries } from '../_components/types';

export default function SavedPage() {
  const { all, loading, error, reload } = useListings();
  const { ids, clear, count, ready } = useWishlist();

  const [developments, setDevelopments] = useState([]);

  const devIds = ids.filter((id) => String(id).startsWith('dev:')).map((id) => String(id).slice(4));
  const listingIds = ids.filter((id) => !String(id).startsWith('dev:'));

  useEffect(() => {
    if (!devIds.length) {
      setDevelopments([]);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          '/api/public/developments?countries=' + encodeURIComponent(portalCountries().join(','))
        );
        const json = await res.json();
        if (!cancelled && res.ok) setDevelopments((json.data || []).filter((d) => devIds.includes(d.id)));
      } catch {
        // Saved listings must still render if this call fails.
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devIds.join(',')]);

  const saved = all.filter((p) => listingIds.includes(p.id));
  // Saved ids that no longer come back from the API — the listing was
  // withdrawn, sold, or un-approved since the visitor saved it. Developments
  // are counted separately so an unpublished scheme is reported too.
  const missing =
    ready && !loading && !error
      ? listingIds.length - saved.length + (devIds.length - developments.length)
      : 0;

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Saved
        </div>

        <div className="pp-listpage-head">
          <h1>
            Saved <span className="pp-gold">Properties</span>
          </h1>
          <div className="pp-listpage-meta">
            <span>
              {!ready || loading
                ? 'Loading…'
                : error
                  ? 'Unavailable'
                  : `${saved.length} saved`}
            </span>
            {ready && count > 0 && (
              <button type="button" className="pp-retry" onClick={clear}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {developments.length > 0 && (
          <div className="pp-dev-strip" style={{ marginBottom: 26 }}>
            {developments.map((dev) => (
              <Link
                key={dev.id}
                href={`/property-portal/developments/${dev.slug}`}
                className="pp-dev-strip-card"
              >
                <div className="pp-dev-strip-img">
                  {resolveImage(dev.featured_image) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={resolveImage(dev.featured_image)} alt={dev.name} />
                  ) : (
                    <div className="pp-dev-strip-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="pp-dev-strip-body">
                  <h3>{dev.name}</h3>
                  <p className="pp-dev-strip-loc">{[dev.city, dev.country].filter(Boolean).join(', ')}</p>
                  <span className="pp-link-arrow">View development →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="pp-saved-note">
          Saved properties are kept in this browser only — they aren&apos;t tied to an account,
          so they won&apos;t follow you to another device.
        </p>

        <div className="pp-listpage-grid">
          <div className="pp-grid">
            {(!ready || loading) &&
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="pp-skeleton" />)}

            {ready && !loading && error && (
              <div className="pp-empty">
                We couldn&apos;t load your saved properties just now.{' '}
                <button type="button" className="pp-retry" onClick={reload}>Try again</button>
                <span className="pp-empty-detail">{error}</span>
              </div>
            )}

            {ready && !loading && !error && count === 0 && (
              <div className="pp-empty">
                You haven&apos;t saved anything yet. Tap the heart on any listing to keep it here.{' '}
                <Link href="/property-portal/listings" className="pp-gold">Browse listings</Link>
              </div>
            )}

            {ready && !loading && !error && saved.map((prop) => (
              <PropertyCard key={prop.id} prop={prop} />
            ))}
          </div>

          {missing > 0 && (
            <p className="pp-saved-note">
              {missing} saved {missing === 1 ? 'property is' : 'properties are'} no longer
              available and {missing === 1 ? 'has' : 'have'} been left out.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
