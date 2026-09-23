'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { portalLocations } from './portalRuntime';
import { locationHref, type ResolvedLocation, type Section } from './locationNav';

/**
 * Country chips (All + every active market), then that country's cities —
 * real links to /buy/uk, /buy/uk/london …, built from Admin → Locations.
 * Chosen filters carry over; the page number and free-text search do not.
 */
export function LocationChips({ section, loc }: { section: Section; loc: ResolvedLocation | null }) {
  const params = useSearchParams();
  const tree = portalLocations() || [];
  const countries = tree.flatMap((r) => r.countries);

  const carry = new URLSearchParams(params.toString());
  carry.delete('page');
  carry.delete('search');
  carry.delete('market');
  const qs = carry.toString() ? `?${carry.toString()}` : '';

  if (!countries.length) return null;
  return (
    <>
      {/* Not <nav>: the root layout pins every <nav> across the top of the page. */}
      <div role="navigation" className="pp-loc-chips" aria-label="Markets">
        <Link href={`${locationHref(section)}${qs}`} className={!loc ? 'active' : undefined} aria-current={!loc ? 'page' : undefined}>
          All markets
        </Link>
        {countries.map((c) => {
          const on = loc?.country.id === c.id && !loc.city;
          return (
            <Link key={c.id} href={`${locationHref(section, c)}${qs}`} className={loc?.country.id === c.id ? 'active' : undefined} aria-current={on ? 'page' : undefined}>
              {c.name}
            </Link>
          );
        })}
      </div>
      {loc && loc.country.cities.length > 1 && (
        <div role="navigation" className="pp-loc-chips pp-loc-chips--cities" aria-label={`Cities in ${loc.country.name}`}>
          <Link href={`${locationHref(section, loc.country)}${qs}`} className={!loc.city ? 'active' : undefined}>
            All {loc.country.name}
          </Link>
          {loc.country.cities.map((ci) => (
            <Link key={ci.id} href={`${locationHref(section, loc.country, ci)}${qs}`} className={loc.city?.id === ci.id ? 'active' : undefined} aria-current={loc.city?.id === ci.id ? 'page' : undefined}>
              {ci.name}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
