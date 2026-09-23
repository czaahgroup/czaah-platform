'use client';

import { useMemo } from 'react';
import { filterOptions, type FilterListing, type MarketFilter } from '@/lib/marketFields';

/**
 * "More filters" for one market (brief §5): UK tenure and council tax, Dubai
 * developer and completion, Pakistan society, phase and block. Options that
 * depend on the data (developers, societies …) come from the live listings in
 * that market, and a filter with nothing to choose from is not shown.
 */
export function MarketFilters({
  filters,
  listings,
  params,
  onChange,
  marketName,
}: {
  filters: MarketFilter[];
  listings: FilterListing[];
  params: URLSearchParams;
  onChange: (patch: Record<string, string>) => void;
  marketName: string;
}) {
  const rows = useMemo(
    () => filters.map((f) => ({ f, options: filterOptions(f, listings) })).filter((r) => r.options.length > 0),
    [filters, listings],
  );
  if (!rows.length) return null;
  const active = rows.filter((r) => params.get(r.f.param)).length;

  return (
    <details className="pp-more-filters" open={active > 0}>
      <summary>
        More filters for {marketName}
        {active > 0 && <span className="pp-more-count">{active}</span>}
      </summary>
      <div className="pp-more-grid">
        {rows.map(({ f, options }) => (
          <label key={f.param}>
            <span>{f.label}</span>
            <select value={params.get(f.param) || ''} onChange={(e) => onChange({ [f.param]: e.target.value })}>
              <option value="">Any</option>
              {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
        ))}
        {active > 0 && (
          <button
            type="button"
            className="pp-more-clear"
            onClick={() => onChange(Object.fromEntries(rows.map((r) => [r.f.param, ''])))}
          >
            Clear these filters
          </button>
        )}
      </div>
    </details>
  );
}
