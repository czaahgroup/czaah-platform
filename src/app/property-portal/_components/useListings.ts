'use client';

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { LiveProperty, portalCountries } from './types';

// Listings loaded on the server for this page (src/lib/publicListings.ts).
// Context rather than module state: a module variable would outlive the
// request on the server and differ from the browser's on hydration.
const SeedContext = createContext<LiveProperty[] | null>(null);

/** Wrap a page whose server component already loaded the listings. */
export function ListingsSeed({ data, children }: { data: unknown[] | null; children: ReactNode }) {
  return createElement(SeedContext.Provider, { value: (data as LiveProperty[] | null) ?? null }, children);
}

// Shared loader for every portal page that lists properties (home, listings,
// off-plan). Previously each page inlined its own fetch and only called
// setState when `res.ok` — so a 500 or a dropped connection left the page
// showing "No listings match these filters", which sent people to clear
// filters that were never the problem. Failures are now surfaced as an error
// the caller can render, with a retry that doesn't require a page reload.
//
// When the page was given listings by its server component they are used as
// they are — the cards are in the first HTML and no request is made.
export function useListings() {
  const seed = useContext(SeedContext);
  const [all, setAll] = useState<LiveProperty[]>(seed || []);
  const [loading, setLoading] = useState(!seed);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        '/api/public/properties?countries=' +
          encodeURIComponent(portalCountries().join(','))
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setAll(json?.data || []);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not reach the listings service.'
      );
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!seed) load();
  }, [load, seed]);

  return { all, loading, error, reload: load };
}
