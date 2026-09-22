'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { resolveImage, convertPrice, portalCountries } from './types';
import { useCurrencyPref } from './usePortalPrefs';
import { formatPlotSize } from '@/lib/plots';
import { formatMoney } from '@/lib/paymentPlan';

/**
 * Published developments, as a strip above the off-plan grid.
 *
 * A scheme with several plot sizes is one development, so it cannot be shown
 * as a property card without either inventing a price or repeating the scheme
 * once per size. It gets a "from" price and a size range instead.
 *
 * Renders nothing at all when there are no published developments, so the page
 * looks unchanged until the first one goes live.
 */
export function DevelopmentStrip() {
  const [developments, setDevelopments] = useState([]);
  const { currency: prefCcy } = useCurrencyPref();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          '/api/public/developments?countries=' + encodeURIComponent(portalCountries().join(','))
        );
        const json = await res.json();
        if (!cancelled && res.ok) setDevelopments(json.data || []);
      } catch {
        // A failure here must never take the off-plan grid down with it.
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!developments.length) return null;

  const price = (amount, currency) => {
    if (amount == null) return 'Price on request';
    if (prefCcy && prefCcy !== currency) {
      const converted = convertPrice(amount, currency, prefCcy);
      if (converted != null) return `~ ${prefCcy} ${Math.round(converted).toLocaleString()}`;
    }
    return formatMoney(amount, currency);
  };

  return (
    <section className="pp-section">
      <div className="pp-container">
        {/* The count sat in .pp-section-head, which is space-between — with a
            wide container that threw "1 scheme" 1,200px from its heading. */}
        <div className="pp-dev-strip-head">
          <h2 className="pp-h2">Developments</h2>
          <span className="pp-dev-strip-count">
            {developments.length} scheme{developments.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* One scheme in an auto-fill grid left three empty columns beside it.
            A single development gets a wide horizontal card instead, which
            reads as a feature rather than a grid that failed to fill. */}
        <div className={`pp-dev-strip${developments.length === 1 ? ' pp-dev-strip--single' : ''}`}>
          {developments.map((dev) => {
            const units = dev.development_units || [];
            // Cheapest variant, compared in one currency.
            const cheapest = units
              .filter((u) => u.total_price != null)
              .reduce((low, u) => {
                if (!low) return u;
                const a = convertPrice(u.total_price, u.currency, 'USD');
                const b = convertPrice(low.total_price, low.currency, 'USD');
                if (a == null || b == null) return low;
                return a < b ? u : low;
              }, null);

            const sizes = units
              .map((u) => formatPlotSize(u.plot_size, u.plot_size_unit))
              .filter(Boolean);

            const image = resolveImage(dev.featured_image) || resolveImage((dev.gallery || [])[0]);

            return (
              <Link
                key={dev.id}
                href={`/property-portal/developments/${dev.slug}`}
                className="pp-dev-strip-card"
              >
                <div className="pp-dev-strip-img">
                  {image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={image} alt={dev.name} />
                  ) : (
                    <div className="pp-dev-strip-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="pp-dev-strip-body">
                  <h3>{dev.name}</h3>
                  <p className="pp-dev-strip-loc">
                    {[dev.city, dev.country].filter(Boolean).join(', ')}
                    {dev.developer_name ? ` · ${dev.developer_name}` : ''}
                  </p>
                  {sizes.length > 0 && (
                    <p className="pp-dev-strip-sizes">{sizes.join(' · ')}</p>
                  )}
                  {cheapest && (
                    <p className="pp-dev-strip-price">
                      From {price(cheapest.total_price, cheapest.currency)}
                    </p>
                  )}
                  <span className="pp-link-arrow">View development →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
