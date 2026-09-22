// Destinations are the portal's "explore a place first" layer — the equivalent
// of a developer's communities. Each one is a city CZAAH transacts in; the
// properties shown on its page are matched live from the listings feed by city,
// so a destination never needs its property list maintained by hand.
//
// A city with no entry here still appears (see destinationFor) with its name
// and a generic label — it just won't have editorial copy until one is added.

import { portalDestinations as portalRuntimeDestinations } from './portalRuntime';

export interface Destination {
  slug: string;
  city: string;
  country: string;
  tagline: string;
  blurb: string;
}

export const DESTINATIONS: Destination[] = [
  {
    slug: 'london',
    city: 'London',
    country: 'United Kingdom',
    tagline: 'The mature safe haven',
    blurb:
      'Grade-A commercial floors, mixed-use blocks and prime residential across the City, Canary Wharf and the West End. HM Land Registry title, English law and the deepest professional tenant base in Europe.',
  },
  {
    slug: 'dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    tagline: 'Tax-free yield',
    blurb:
      'Freehold offices, off-plan residential and income-producing units across Business Bay, Downtown and Dubai South. No income, capital gains or wealth tax on property, with staged payment plans on off-plan stock.',
  },
  {
    slug: 'islamabad',
    city: 'Islamabad',
    country: 'Pakistan',
    tagline: 'The administrative capital',
    blurb:
      'Commercial and office assets in Blue Area, F-7 Markaz and the surrounding sectors — the institutional and diplomatic centre of Pakistan, verified on the ground by CZAAH partners.',
  },
  {
    slug: 'lahore',
    city: 'Lahore',
    country: 'Pakistan',
    tagline: 'Industry and scale',
    blurb:
      'Warehousing, manufacturing and industrial estate assets around Sundar and the wider Lahore industrial belt, serving Pakistan’s largest domestic consumer market.',
  },
  {
    slug: 'karachi',
    city: 'Karachi',
    country: 'Pakistan',
    tagline: 'The commercial engine',
    blurb:
      'Retail, office and mixed-use assets in Clifton and the central business districts of Pakistan’s largest city and principal port.',
  },
  {
    slug: 'gwadar',
    city: 'Gwadar',
    country: 'Pakistan',
    tagline: 'The CPEC gateway',
    blurb:
      'Commercial plots and free-zone land along the deep-water port corridor — a long-horizon position tied to trade-corridor infrastructure investment.',
  },
  {
    slug: 'kpk',
    city: 'KPK',
    country: 'Pakistan',
    tagline: 'Special Economic Zones',
    blurb:
      'Manufacturing units and industrial plots in the Rashakai Special Economic Zone and the wider Khyber Pakhtunkhwa corridor, with SEZ incentives for qualifying operators.',
  },
];

/**
 * The destinations shown on the portal — the stored list if one has been saved
 * in admin, otherwise the shipped list below. Every helper goes through this so
 * an edit reaches the home page, the destinations index and each slug page
 * without any of them knowing where the data came from.
 */
export function portalDestinations(): Destination[] {
  const stored = portalRuntimeDestinations();
  return stored && stored.length ? (stored as Destination[]) : DESTINATIONS;
}

export function destinationFor(city: string | null | undefined): Destination | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  return portalDestinations().find((d) => d.city.toLowerCase() === key) || null;
}

export function destinationBySlug(slug: string): Destination | null {
  const key = slug.trim().toLowerCase();
  return portalDestinations().find((d) => d.slug === key) || null;
}

export function slugForCity(city: string | null | undefined): string | null {
  const d = destinationFor(city);
  if (d) return d.slug;
  if (!city) return null;
  // Unknown city — still linkable, just without editorial copy.
  return city.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}
