'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useListings } from '../_components/useListings';
import { resolveImage, type LiveProperty } from '../_components/types';
import { destinationFor, slugForCity } from '../_components/destinations';
import { portalLocations } from '../_components/portalRuntime';
import { RegisterInterest } from '../_components/RegisterInterest';
import { EmptyState, Skeleton } from '../_components/ui';

interface Card {
  slug: string;
  city: string;
  country: string;
  tagline: string;
  count: number;
  types: string[];
  image: string | null;
}

interface RegionSection {
  slug: string;
  name: string;
  description: string | null;
  countries: string[];
  cards: Card[];
  /** Cities CZAAH covers in this region with no live stock today. */
  quiet: string[];
}

// Locations, grouped region → country → city from the hierarchy managed in
// Admin → Locations. Cards are built from live listings, so a card never
// promises properties that aren't there.
export default function DestinationsPage() {
  const { all, loading, error, reload } = useListings();

  const sections = useMemo<RegionSection[]>(() => {
    const byCity = new Map<string, LiveProperty[]>();
    for (const p of all) {
      if (!p.city) continue;
      const key = p.city.trim();
      byCity.set(key, [...(byCity.get(key) || []), p]);
    }

    const toCard = (city: string, props: LiveProperty[]): Card => {
      const d = destinationFor(city);
      const withImage = props.find((p) => resolveImage(p.images?.[0]));
      return {
        slug: slugForCity(city)!,
        city,
        country: props[0]?.country || d?.country || '',
        tagline: d?.tagline || '',
        count: props.length,
        types: [...new Set(props.map((p) => p.property_type?.replace('_', ' ')).filter(Boolean) as string[])],
        image: withImage ? resolveImage(withImage.images?.[0]) : null,
      };
    };
    const mostFirst = (a: Card, b: Card) => b.count - a.count || a.city.localeCompare(b.city);

    const tree = portalLocations();
    const placed = new Set<string>();
    const out: RegionSection[] = [];

    for (const region of tree || []) {
      const cards: Card[] = [];
      const quiet: string[] = [];
      for (const country of region.countries) {
        for (const city of country.cities) {
          const key = [...byCity.keys()].find((k) => k.toLowerCase() === city.name.toLowerCase());
          if (key) {
            cards.push(toCard(key, byCity.get(key)!));
            placed.add(key);
          } else {
            quiet.push(city.name);
          }
        }
      }
      // A region with nothing live and nothing to say is left out entirely.
      if (!cards.length && !quiet.length && !region.description) continue;
      out.push({
        slug: region.slug,
        name: region.name,
        description: region.description,
        countries: region.countries.map((c) => c.name),
        cards: cards.sort(mostFirst),
        quiet,
      });
    }

    // Listings in a city not yet added under Locations still get a card.
    const rest = [...byCity.entries()].filter(([city]) => !placed.has(city));
    if (rest.length) {
      out.push({
        slug: 'more',
        name: tree ? 'More locations' : 'Locations',
        description: null,
        countries: [],
        cards: rest.map(([city, props]) => toCard(city, props)).sort(mostFirst),
        quiet: [],
      });
    }
    return out;
  }, [all]);

  const liveCount = sections.reduce((n, s) => n + s.cards.length, 0);

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Locations
        </div>

        <div className="pp-listpage-head">
          <h1>
            Property <span className="pp-gold">locations</span>
          </h1>
          <div className="pp-listpage-meta">
            <span>{loading ? 'Loading…' : error ? 'Unavailable' : `${liveCount} places with live listings`}</span>
          </div>
        </div>

        <p className="pp-section-lead" style={{ maxWidth: 740, marginBottom: 20 }}>
          Explore property by region and city. Each page shows what is available there today.
        </p>

        {sections.length > 1 && (
          <nav className="pp-region-jump" aria-label="Regions">
            {sections.map((s) => (
              <a key={s.slug} href={`#${s.slug}`}>{s.name}</a>
            ))}
          </nav>
        )}

        {loading && (
          <div className="pp-dest-grid">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={300} />)}
          </div>
        )}

        {!loading && error && (
          <EmptyState
            title="We couldn't load locations just now"
            action={<button type="button" className="pp-retry" onClick={reload}>Try again</button>}
          />
        )}

        {!loading && !error && sections.length === 0 && (
          <EmptyState title="No live listings right now">Check back shortly, or speak to our team.</EmptyState>
        )}

        {!loading && !error && sections.map((s) => (
          <section key={s.slug} id={s.slug} className="pp-region">
            <div className="pp-region-head">
              <h2 className="pp-h2">{s.name}</h2>
              {s.countries.length > 0 && <span className="pp-region-countries">{s.countries.join(' · ')}</span>}
            </div>

            {s.cards.length > 0 && (
              <div className="pp-dest-grid">
                {s.cards.map((c) => (
                  <Link href={`/property-portal/destinations/${c.slug}`} className="pp-dest" key={c.slug}>
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
                      <h3>{c.city}</h3>
                      <span className="pp-dest-country">{c.country}</span>
                      {c.tagline && <p className="pp-dest-tagline">{c.tagline}</p>}
                      {c.types.length > 0 && <span className="pp-dest-types">{c.types.join(' · ')}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {s.quiet.length > 0 && (
              <p className="pp-saved-note" style={{ marginTop: 18 }}>
                Also covered, nothing live today: {s.quiet.join(', ')}.{' '}
                <Link href="/property-portal/contact" className="pp-gold">Ask our team →</Link>
              </p>
            )}

            {/* A region description marks a market CZAAH is expanding into:
                say so, and capture the interest rather than show nothing. */}
            {s.description && (
              <div className="pp-region-expand">
                <p className="pp-region-desc">{s.description}</p>
                <RegisterInterest market={s.name} />
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
