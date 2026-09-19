'use client';

import { useMemo, useState } from 'react';
import { LiveProperty, convertPrice, isRental } from './types';
import { estimateAcquisitionCost, ACQUISITION_COST_ENABLED } from './acquisitionCosts';

// Shows what a listing actually costs to acquire, not just its asking price.
// Cross-border buyers routinely underestimate this by 5–20% depending on
// jurisdiction, which is precisely the gap CZAAH exists to close.
export function AcquisitionCost({
  prop,
  displayCurrency,
}: {
  prop: LiveProperty;
  displayCurrency?: string;
}) {
  const [filer, setFiler] = useState(true);
  const [open, setOpen] = useState(false);

  const ccy = displayCurrency || prop.currency || 'USD';

  // Everything is modelled in the listing's own currency — the rates are
  // percentages, so no conversion is needed for them. Only the handful of
  // flat fees are approximated, and those are noted in the model.
  const est = useMemo(
    () =>
      estimateAcquisitionCost(prop.price || 0, prop.country, prop.property_type, {
        pakistaniFiler: filer,
      }),
    [prop.price, prop.country, prop.property_type, filer]
  );

  if (!ACQUISITION_COST_ENABLED || isRental(prop) || !prop.price || est.unknown) return null;

  const fmt = (n: number) => {
    const v = ccy === prop.currency ? n : convertPrice(n, prop.currency, ccy);
    if (v == null) return `${prop.currency} ${Math.round(n).toLocaleString()}`;
    return `${ccy} ${Math.round(v).toLocaleString()}`;
  };

  const isPakistan = (prop.country || '').toLowerCase() === 'pakistan';

  return (
    <section className="pp-acq">
      <div className="pp-acq-head">
        <div>
          <div className="pp-eyebrow">What it actually costs</div>
          <h2>Estimated acquisition cost</h2>
        </div>
        <div className="pp-acq-total">
          <small>Total including costs</small>
          <strong>{fmt(est.total)}</strong>
          <span>
            {fmt(prop.price)} + {fmt(est.fees)} costs ({est.pct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {isPakistan && (
        <div className="pp-acq-toggle">
          <span>Tax status</span>
          <button
            type="button"
            className={filer ? 'active' : ''}
            onClick={() => setFiler(true)}
            aria-pressed={filer}
          >
            Filer
          </button>
          <button
            type="button"
            className={!filer ? 'active' : ''}
            onClick={() => setFiler(false)}
            aria-pressed={!filer}
          >
            Non-filer
          </button>
          <em>Advance tax differs substantially between the two.</em>
        </div>
      )}

      <button
        type="button"
        className="pp-acq-expand"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide breakdown' : 'See the breakdown'}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </svg>
      </button>

      {open && (
        <>
          <dl className="pp-acq-lines">
            <div className="pp-acq-line pp-acq-line--price">
              <dt>Purchase price</dt>
              <dd>{fmt(prop.price)}</dd>
            </div>
            {est.lines.map((l) => (
              <div className="pp-acq-line" key={l.label}>
                <dt>
                  {l.label}
                  {l.note && <em>{l.note}</em>}
                </dt>
                <dd>{fmt(l.amount)}</dd>
              </div>
            ))}
            <div className="pp-acq-line pp-acq-line--total">
              <dt>Total outlay</dt>
              <dd>{fmt(est.total)}</dd>
            </div>
          </dl>

          <p className="pp-acq-note">
            Indicative only, for {est.jurisdiction}. Rates change with each budget and vary with
            buyer status, residency and structure; financing costs, VAT and ongoing charges are
            not included. This is not tax or legal advice — confirm the figures with a qualified
            adviser in the jurisdiction before committing.
          </p>
        </>
      )}
    </section>
  );
}
