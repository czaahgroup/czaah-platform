import { isRental, type LiveProperty } from '../_components/types';

export const INCOME_HREF = '/property-portal/listings?with_yield=1&sort=yield-desc';

/**
 * Investment categories with live counts. Each count uses exactly the filter
 * its landing page applies, and an empty category is left out.
 */
export function investmentCategories(all: LiveProperty[]) {
  const sale = all.filter((p) => !isRental(p));
  const count = (f: (p: LiveProperty) => boolean) => sale.filter(f).length;
  return [
    { t: 'Residential', d: 'Houses, apartments and villas to buy.', n: count((p) => p.property_type === 'residential'), href: '/property-portal/buy?type=residential' },
    { t: 'Commercial', d: 'Offices, retail and other commercial property.', n: count((p) => p.property_type === 'commercial'), href: '/property-portal/buy?type=commercial' },
    { t: 'Off-plan', d: 'Buy ahead of completion, often with a staged payment plan.', n: count((p) => p.listing_type === 'off_plan'), href: '/property-portal/off-plan' },
    { t: 'Income-producing', d: 'Listings with a stated rental yield, shown with its source.', n: count((p) => p.yield_percentage != null), href: INCOME_HREF },
    { t: 'Industrial', d: 'Warehousing, manufacturing and industrial estates.', n: count((p) => p.property_type === 'industrial'), href: '/property-portal/buy?type=industrial' },
    { t: 'Land & plots', d: 'Residential, commercial and agricultural plots.', n: count((p) => p.property_type === 'land'), href: '/property-portal/buy?type=land' },
  ].filter((c) => c.n > 0);
}
