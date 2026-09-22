'use client';

import { useCallback, useEffect, useState } from 'react';
import { LiveProperty, portalCountries } from './types';

// Shared loader for every portal page that lists properties (home, listings,
// off-plan). Previously each page inlined its own fetch and only called
// setState when `res.ok` — so a 500 or a dropped connection left the page
// showing "No listings match these filters", which sent people to clear
// filters that were never the problem. Failures are now surfaced as an error
// the caller can render, with a retry that doesn't require a page reload.
export function useListings() {
  const [all, setAll] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);
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
    load();
  }, [load]);

  return { all, loading, error, reload: load };
}
