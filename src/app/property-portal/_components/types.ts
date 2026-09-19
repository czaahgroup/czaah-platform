export interface LiveProperty {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  currency: string;
  location: string;
  city: string;
  country: string | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  description: string | null;
  features?: string[];
  images: string[];
  /** Optional per-project clip; falls back to the market video. */
  video_url?: string | null;
  video_poster_url?: string | null;
  yield_percentage: number | null;
  partner_id?: string | null;
  created_at?: string | null;
}

// A listing counts as "new" for this many days after it's published. The API
// already returns newest-first, so this is only about what gets badged.
export const NEW_LISTING_DAYS = 30;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = (Date.now() - then) / 86_400_000;
  // Guard against a future-dated row making something "new" forever.
  return days < 0 ? 0 : days;
}

export function isNewListing(prop: Pick<LiveProperty, 'created_at'>): boolean {
  const d = daysSince(prop.created_at);
  return d != null && d <= NEW_LISTING_DAYS;
}

// "Today" / "3 days ago" / "Listed in March" — short enough for a card.
export function listedAgo(prop: Pick<LiveProperty, 'created_at'>): string | null {
  const d = daysSince(prop.created_at);
  if (d == null) return null;
  if (d < 1) return 'Added today';
  if (d < 2) return 'Added yesterday';
  if (d < 14) return `Added ${Math.floor(d)} days ago`;
  if (d < 60) return `Added ${Math.floor(d / 7)} weeks ago`;
  return new Date(prop.created_at as string).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export const LISTING_META: Record<string, { label: string; className: string }> = {
  sale: { label: 'For Sale', className: 'status-for-sale' },
  rent: { label: 'For Rent', className: 'status-for-rent' },
  lease: { label: 'For Lease', className: 'status-for-rent' },
  off_plan: { label: 'Off Plan', className: 'status-off-plan' },
};

// The countries the portal lists. This is the single source of truth — the
// home, listings and off-plan pages all load through useListings(), which
// sends exactly this set to /api/public/properties. Approved listings in any
// country NOT named here are hidden from the portal, so add a country here
// (and give it a MARKETS entry below) before expecting its listings to show.
export const PORTAL_COUNTRIES = [
  'Pakistan',
  'United Kingdom',
  'United Arab Emirates',
];

export const MARKETS = [
  { key: 'all', label: 'All Markets' },
  { key: 'london', label: 'London' },
  { key: 'dubai', label: 'Dubai' },
  { key: 'pakistan', label: 'Pakistan' },
];

export function matchesMarket(prop: LiveProperty, market: string) {
  if (!market || market === 'all') return true;
  if (market === 'london') return prop.city?.toLowerCase() === 'london';
  if (market === 'dubai') return prop.city?.toLowerCase() === 'dubai';
  if (market === 'pakistan') return prop.country?.toLowerCase() === 'pakistan';
  return true;
}

export function resolveImage(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith('http') || image.startsWith('/')) return image;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/platform-files/${image}`;
}

// Approximate FX rates — units of the currency per 1 USD. Used only to give a
// rough cross-market comparison on the portal; not live rates. Adjust here.
export const FX_PER_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AED: 3.67,
  PKR: 278,
};

export const CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'PKR'];

export function convertPrice(price: number, from: string, to: string): number | null {
  const fromRate = FX_PER_USD[from];
  const toRate = FX_PER_USD[to];
  if (!fromRate || !toRate) return null;
  return (price / fromRate) * toRate;
}

// `display` — optional target currency. When set and a rate is known, the price
// is converted and shown with a "~" to flag it as approximate.
export function formatPrice(
  prop: Pick<LiveProperty, 'price' | 'currency'>,
  display?: string
): string {
  if (!prop.price) return 'Price on request';
  if (display && display !== prop.currency) {
    const converted = convertPrice(prop.price, prop.currency, display);
    if (converted != null) {
      return `~ ${display} ${Math.round(converted).toLocaleString()}`;
    }
  }
  return `${prop.currency} ${prop.price.toLocaleString()}`;
}
