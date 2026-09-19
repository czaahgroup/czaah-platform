'use client';
// @ts-nocheck

import Link from 'next/link';
import { PropertyCard } from '../_components/PropertyCard';
import { useListings } from '../_components/useListings';
import { useWishlist } from '../_components/usePortalPrefs';

export default function SavedPage() {
  const { all, loading, error, reload } = useListings();
  const { ids, clear, count, ready } = useWishlist();

  const saved = all.filter((p) => ids.includes(p.id));
  // Saved ids that no longer come back from the API — the listing was
  // withdrawn, sold, or un-approved since the visitor saved it.
  const missing = ready && !loading && !error ? count - saved.length : 0;

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
