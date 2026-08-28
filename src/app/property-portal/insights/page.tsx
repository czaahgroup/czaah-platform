'use client';
// @ts-nocheck

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { INSIGHTS as ARTICLES } from '../_components/insights-data';

export const runtime = 'edge';

const CATEGORIES = ['All', 'Real Estate', 'Infrastructure'];

export default function InsightsPage() {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return ARTICLES.filter((a) => {
      if (cat !== 'All' && a.category !== cat) return false;
      if (q) {
        const s = q.toLowerCase();
        return a.title.toLowerCase().includes(s) || a.excerpt.toLowerCase().includes(s);
      }
      return true;
    });
  }, [cat, q]);

  const [featured, ...rest] = filtered;

  return (
    <main>
      <section className="pp-hero pp-hero--compact">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Property</div>
          <h1>Market <span className="pp-gold">insights.</span></h1>
          <p className="pp-hero-lede">
            Analysis on the markets CZAAH operates in — real estate, infrastructure and the
            policy shifts that move values. Drawn from the CZAAH research library.
          </p>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Insights
        </div>

        <div className="pp-insights">
          <div className="pp-insights-filters">
            <input
              type="text"
              placeholder="Search insights…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="pp-insights-cats">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={cat === c ? 'active' : ''}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="pp-empty">No insights match your search.</div>
          )}

          {featured && (
            <Link href={`/insights#${featured.id}`} className="pp-insight-feature">
              <span className="pp-insight-cat">{featured.category}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <span className="pp-insight-meta">{featured.date} · Read the full analysis →</span>
            </Link>
          )}

          <div className="pp-insights-grid">
            {rest.map((a) => (
              <Link key={a.id} href={`/insights#${a.id}`} className="pp-insight-card">
                <span className="pp-insight-cat">{a.category}</span>
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
                <span className="pp-insight-meta">{a.date} →</span>
              </Link>
            ))}
          </div>

          <div className="pp-insights-foot">
            <p>Looking for the full research library across all 13 CZAAH sectors?</p>
            <Link href="/insights" className="pp-btn pp-btn--ghost">All CZAAH Insights</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
