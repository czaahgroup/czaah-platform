'use client';
// @ts-nocheck

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PropertyCard } from '../_components/PropertyCard';
import { useListings } from '../_components/useListings';
import { CURRENCIES, convertPrice, isRental } from '../_components/types';
import { slugForCity } from '../_components/destinations';

// Jurisdiction notes shown alongside the numbers. These are positioning
// summaries, not tax advice — the disclaimer at the foot of the page says so.
const TAX_NOTE: Record<string, string> = {
  'United Kingdom': 'Income tax on rent; SDLT on purchase; CGT on disposal.',
  'United Arab Emirates': 'No UAE personal income or capital gains tax on property; home-country tax may apply.',
  Pakistan: 'Rental income taxable; withholding differs for filers/non-filers.',
  'Saudi Arabia': 'No personal income tax; 5% RETT on transfer.',
};

const BUDGETS = [250_000, 500_000, 1_000_000, 2_500_000];

export default function AllocatorPage() {
  const { all, loading, error, reload } = useListings();
  const [budget, setBudget] = useState(500_000);
  const [ccy, setCcy] = useState('USD');

  // Budget is entered in the visitor's currency; every listing is priced in
  // its own. Normalise both to USD before comparing anything.
  const budgetUsd = useMemo(() => {
    if (ccy === 'USD') return budget;
    const v = convertPrice(budget, ccy, 'USD');
    return v == null ? budget : v;
  }, [budget, ccy]);

  const markets = useMemo(() => {
    const by = new Map<string, any[]>();
    all.forEach((p) => {
      // A rental's price is rent, not value — it would wreck price/ft².
      if (isRental(p) || !p.country || !p.price || !p.area_sqft) return;
      const usd = p.currency === 'USD' ? p.price : convertPrice(p.price, p.currency, 'USD');
      if (usd == null || usd <= 0) return;
      if (!by.has(p.country)) by.set(p.country, []);
      by.get(p.country)!.push({ ...p, _usd: usd, _psf: usd / p.area_sqft });
    });

    return [...by.entries()]
      .map(([country, rows]) => {
        const psf = rows.reduce((a, b) => a + b._psf, 0) / rows.length;
        const yields = rows.filter((r) => r.yield_percentage != null);
        const yieldPct = yields.length
          ? yields.reduce((a, b) => a + b.yield_percentage, 0) / yields.length
          : null;
        // What the budget buys at this market's average rate, and what that
        // floor area would earn at its average yield.
        const sqft = budgetUsd / psf;
        const income = yieldPct != null ? (budgetUsd * yieldPct) / 100 : null;
        // Listings actually within reach of the budget (+10% headroom).
        const affordable = rows
          .filter((r) => r._usd <= budgetUsd * 1.1)
          .sort((a, b) => b._usd - a._usd);
        return {
          country,
          psf,
          yieldPct,
          sqft,
          income,
          affordable,
          total: rows.length,
          cities: [...new Set(rows.map((r) => r.city).filter(Boolean))],
        };
      })
      .sort((a, b) => (b.yieldPct ?? -1) - (a.yieldPct ?? -1));
  }, [all, budgetUsd]);

  const fmt = (usd: number | null) => {
    if (usd == null) return '—';
    const v = ccy === 'USD' ? usd : convertPrice(usd, 'USD', ccy);
    if (v == null) return '—';
    return `${ccy} ${Math.round(v).toLocaleString()}`;
  };

  const best = markets.length ? markets[0] : null;
  const cheapest = markets.length
    ? [...markets].sort((a, b) => a.psf - b.psf)[0]
    : null;

  return (
    <main>
      <section className="pp-alloc-intro">
        <div className="pp-container">
          <div className="pp-crumbs">
            <Link href="/property-portal">Home</Link> / Allocate Capital
          </div>
          <div className="pp-eyebrow">Cross-market comparison</div>
          <h1 className="pp-alloc-h1">
            Where should your <span className="pp-gold">capital</span> go?
          </h1>
          <p className="pp-section-lead" style={{ maxWidth: 720 }}>
            Most property portals ask which unit you want. That is the second question. The
            first is which market your money should be in — and because CZAAH transacts across
            all of ours, we can answer it with the same numbers on every side.
          </p>

          <div className="pp-alloc-controls">
            <label className="pp-alloc-field">
              <span>Budget</span>
              <input
                type="number"
                min={0}
                step={25_000}
                value={budget}
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
            <label className="pp-alloc-field pp-alloc-field--ccy">
              <span>Currency</span>
              <select value={ccy} onChange={(e) => setCcy(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="pp-alloc-presets">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={budget === b ? 'active' : ''}
                  onClick={() => setBudget(b)}
                >
                  {b >= 1_000_000 ? `${b / 1_000_000}M` : `${b / 1000}k`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="pp-container">
        {loading && (
          <div className="pp-grid" style={{ marginTop: 40 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pp-skeleton" style={{ height: 320 }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="pp-empty" style={{ marginTop: 40 }}>
            We couldn&apos;t load market data just now.{' '}
            <button type="button" className="pp-retry" onClick={reload}>Try again</button>
            <span className="pp-empty-detail">{error}</span>
          </div>
        )}

        {!loading && !error && markets.length === 0 && (
          <div className="pp-empty" style={{ marginTop: 40 }}>
            Not enough priced listings to compare markets right now.
          </div>
        )}

        {!loading && !error && markets.length > 0 && (
          <>
            {best && cheapest && (
              <p className="pp-alloc-summary">
                On today&apos;s listings, <strong>{best.country}</strong> carries the highest
                average yield at <strong>{best.yieldPct?.toFixed(1)}%</strong>, while{' '}
                <strong>{cheapest.country}</strong> has the lowest entry cost at{' '}
                <strong>{fmt(cheapest.psf)}</strong> per ft².
              </p>
            )}

            <section className="pp-section" style={{ paddingTop: 20 }}>
              <div className="pp-alloc-grid">
                {markets.map((m) => (
                  <article className="pp-alloc-card" key={m.country}>
                    <header>
                      <h2>{m.country}</h2>
                      <span className="pp-alloc-cities">{m.cities.join(' · ')}</span>
                    </header>

                    <div className="pp-alloc-headline">
                      <span className="pp-alloc-sqft">
                        {Math.round(m.sqft).toLocaleString()}
                      </span>
                      <small>ft² for {fmt(budgetUsd)}</small>
                    </div>

                    <dl className="pp-alloc-stats">
                      <div>
                        <dt>Entry cost</dt>
                        <dd>{fmt(m.psf)} / ft²</dd>
                      </div>
                      <div>
                        <dt>Avg. yield</dt>
                        <dd>{m.yieldPct != null ? `${m.yieldPct.toFixed(1)}%` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Indicative income</dt>
                        <dd>{m.income != null ? `${fmt(m.income)} / yr` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Within budget</dt>
                        <dd>
                          {m.affordable.length} of {m.total}
                        </dd>
                      </div>
                    </dl>

                    {TAX_NOTE[m.country] && (
                      <p className="pp-alloc-tax">{TAX_NOTE[m.country]}</p>
                    )}

                    {m.cities.length > 0 && (
                      <Link
                        href={`/property-portal/destinations/${slugForCity(m.cities[0])}`}
                        className="pp-btn pp-btn--ghost pp-alloc-cta"
                      >
                        Explore {m.cities[0]}
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {/* What the budget actually reaches, across every market. */}
            <section className="pp-section">
              <div className="pp-section-head">
                <div>
                  <div className="pp-eyebrow">In reach</div>
                  <h2 className="pp-h2">Within {fmt(budgetUsd)}</h2>
                </div>
                <Link href="/property-portal/listings" className="pp-link-arrow">
                  All listings →
                </Link>
              </div>
              <div className="pp-grid">
                {markets.flatMap((m) => m.affordable).length === 0 ? (
                  <div className="pp-empty">
                    Nothing published sits within this budget. We hold off-market stock at most
                    levels — <Link href="/property-portal/contact" className="pp-gold">tell the desk your brief</Link>.
                  </div>
                ) : (
                  markets
                    .flatMap((m) => m.affordable)
                    .sort((a, b) => b._usd - a._usd)
                    .slice(0, 6)
                    .map((p) => <PropertyCard key={p.id} prop={p} />)
                )}
              </div>
            </section>
          </>
        )}

        <p className="pp-alloc-disclaimer">
          Figures are derived from the averages of CZAAH&apos;s currently published listings and
          are indicative only. Yields are as stated by the seller and not independently
          verified. Currency conversions use fixed reference rates, not live FX. Nothing here is
          investment, tax or legal advice — speak to the desk and to your own advisers before
          committing capital.
        </p>
      </div>
    </main>
  );
}
