// Plot / land vocabulary, conversions and validation.
//
// The database keeps two separate ideas apart and so does this file:
//
//   property_type     asset class — residential | commercial | industrial |
//                     land | mixed_use. Pre-dates plots; the portal's type
//                     filter, the allocator and the UK SDLT split key off it.
//   property_subtype  what the thing actually is — house, flat, room,
//                     commercial unit, plot, farm, new development.
//
// Admin and partner forms show ONE "Property type" control listing the
// subtypes, and derive the asset class from it, so nobody has to think about
// the distinction while typing a listing in.

export type PropertySubtype =
  | 'house'
  | 'flat'
  | 'room'
  | 'commercial_unit'
  | 'plot'
  | 'farm'
  | 'new_development';

export type PlotSizeUnit = 'marla' | 'kanal' | 'sq_ft' | 'sq_yd' | 'sq_m' | 'acre';

export type PlotCategory =
  | 'residential'
  | 'commercial'
  | 'agricultural'
  | 'industrial'
  | 'farmhouse';

export type PossessionStatus =
  | 'ready'
  | 'possession_available'
  | 'balloted'
  | 'non_balloted'
  | 'under_development';

export type DevelopmentStatus = 'launched' | 'under_development' | 'completed';

interface SubtypeDef {
  value: PropertySubtype;
  label: string;
  /** Asset class written to property_type when the form picks this subtype. */
  assetClass: 'residential' | 'commercial' | 'industrial' | 'land' | 'mixed_use';
  /** Bedrooms / bathrooms / furnishing are meaningless for these. */
  isLand: boolean;
}

export const PROPERTY_SUBTYPES: SubtypeDef[] = [
  { value: 'house', label: 'House', assetClass: 'residential', isLand: false },
  { value: 'flat', label: 'Flat / Apartment', assetClass: 'residential', isLand: false },
  { value: 'room', label: 'Room', assetClass: 'residential', isLand: false },
  { value: 'commercial_unit', label: 'Commercial', assetClass: 'commercial', isLand: false },
  { value: 'plot', label: 'Plot / Land', assetClass: 'land', isLand: true },
  { value: 'farm', label: 'Farm / Agricultural Land', assetClass: 'land', isLand: true },
  { value: 'new_development', label: 'New Development', assetClass: 'mixed_use', isLand: false },
];

export const SUBTYPE_LABEL: Record<string, string> = Object.fromEntries(
  PROPERTY_SUBTYPES.map((s) => [s.value, s.label])
);

/** The asset class a subtype belongs to, for writing property_type. */
export function assetClassFor(subtype: string | null | undefined): string | null {
  return PROPERTY_SUBTYPES.find((s) => s.value === subtype)?.assetClass ?? null;
}

/**
 * Does this listing describe land rather than a building?
 *
 * Checks the subtype first, then falls back to property_type === 'land' so the
 * one pre-existing `land` listing (and anything created before subtypes) still
 * gets plot treatment rather than being asked for a bedroom count.
 */
export function isPlotListing(
  p: { property_subtype?: string | null; property_type?: string | null } | null | undefined
): boolean {
  if (!p) return false;
  if (p.property_subtype) {
    return PROPERTY_SUBTYPES.find((s) => s.value === p.property_subtype)?.isLand ?? false;
  }
  return p.property_type === 'land';
}

// ── Plot size ────────────────────────────────────────────────────────────
// Marla and kanal are regional. These are the modern Punjab/Pakistan values
// (1 marla = 225 ft², 1 kanal = 20 marla), which is what Citi Housing and the
// other Pakistani schemes advertise against. Historical "big marla" of 272.25
// ft² is NOT used here — if a listing ever needs it, record the size in sq_ft
// rather than changing this constant under everyone else's feet.
const SQ_FT_PER: Record<PlotSizeUnit, number> = {
  marla: 225,
  kanal: 4500,
  sq_ft: 1,
  sq_yd: 9,
  sq_m: 10.763910417,
  acre: 43560,
};

interface UnitDef {
  value: PlotSizeUnit;
  label: string;
  /** Short form for inline display: "5 Marla", "2 Kanal", "4,500 ft²". */
  short: string;
}

export const PLOT_SIZE_UNITS: UnitDef[] = [
  { value: 'marla', label: 'Marla', short: 'Marla' },
  { value: 'kanal', label: 'Kanal', short: 'Kanal' },
  { value: 'sq_ft', label: 'Square feet', short: 'ft²' },
  { value: 'sq_yd', label: 'Square yards', short: 'yd²' },
  { value: 'sq_m', label: 'Square metres', short: 'm²' },
  { value: 'acre', label: 'Acres', short: 'Acre' },
];

export const PLOT_SIZE_UNIT_LABEL: Record<string, string> = Object.fromEntries(
  PLOT_SIZE_UNITS.map((u) => [u.value, u.label])
);

export function isPlotSizeUnit(value: unknown): value is PlotSizeUnit {
  return typeof value === 'string' && value in SQ_FT_PER;
}

/** Square feet, for comparing a 5 marla plot against a 1,200 ft² one. */
export function plotSizeInSqFt(size: number | null | undefined, unit: string | null | undefined): number | null {
  if (size == null || !Number.isFinite(size) || size <= 0) return null;
  if (!isPlotSizeUnit(unit)) return null;
  return size * SQ_FT_PER[unit];
}

/** "5 Marla" · "2 Kanal" · "4,500 ft²" — pluralised the way the market says it. */
export function formatPlotSize(size: number | null | undefined, unit: string | null | undefined): string | null {
  if (size == null || !Number.isFinite(size) || size <= 0) return null;
  const def = PLOT_SIZE_UNITS.find((u) => u.value === unit);
  if (!def) return null;
  const n = Number.isInteger(size) ? size.toLocaleString() : size.toLocaleString(undefined, { maximumFractionDigits: 2 });
  // Marla and Kanal don't take a plural "s" in the way they're advertised.
  return `${n} ${def.short}`;
}

// ── Vocabularies with labels ─────────────────────────────────────────────
export const PLOT_CATEGORIES: { value: PlotCategory; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'farmhouse', label: 'Farmhouse' },
];

export const POSSESSION_STATUSES: { value: PossessionStatus; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'possession_available', label: 'Possession available' },
  { value: 'balloted', label: 'Balloted' },
  { value: 'non_balloted', label: 'Non-balloted' },
  { value: 'under_development', label: 'Under development' },
];

export const DEVELOPMENT_STATUSES: { value: DevelopmentStatus; label: string }[] = [
  { value: 'launched', label: 'Launched' },
  { value: 'under_development', label: 'Under development' },
  { value: 'completed', label: 'Completed' },
];

export const AVAILABILITY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'unavailable', label: 'Unavailable' },
];

export const PLOT_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(PLOT_CATEGORIES.map((c) => [c.value, c.label]));
export const POSSESSION_LABEL: Record<string, string> = Object.fromEntries(POSSESSION_STATUSES.map((c) => [c.value, c.label]));
export const DEVELOPMENT_STATUS_LABEL: Record<string, string> = Object.fromEntries(DEVELOPMENT_STATUSES.map((c) => [c.value, c.label]));
export const AVAILABILITY_LABEL: Record<string, string> = Object.fromEntries(AVAILABILITY_STATUSES.map((c) => [c.value, c.label]));

/** The boolean position flags, in the order they read best on a detail page. */
export const PLOT_POSITION_FLAGS = [
  { key: 'corner_plot', label: 'Corner plot' },
  { key: 'park_facing', label: 'Park facing' },
  { key: 'main_road', label: 'Main road' },
  { key: 'boulevard', label: 'Boulevard' },
  { key: 'canal_facing', label: 'Canal facing' },
] as const;

// ── Validation ───────────────────────────────────────────────────────────

export interface PlotValidationInput {
  title?: unknown;
  country?: unknown;
  city?: unknown;
  plotSize?: unknown;
  plotSizeUnit?: unknown;
  plotCategory?: unknown;
  price?: unknown;
  currency?: unknown;
  images?: unknown;
  /** A development payment plan can stand in for a price. */
  hasPaymentPlan?: boolean;
  /** Skip the image requirement where the development supplies the artwork. */
  inheritsDevelopmentImage?: boolean;
  supportedCurrencies: string[];
}

function num(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Field-level validation for a plot listing. Bedrooms and bathrooms are
 * deliberately absent — a plot has neither, and requiring them was the whole
 * reason plots could not be listed before.
 *
 * Returns a list of human-readable problems; empty means valid.
 */
export function validatePlotListing(input: PlotValidationInput): string[] {
  const errors: string[] = [];

  if (!String(input.title ?? '').trim()) errors.push('Title is required.');
  if (!String(input.country ?? '').trim()) errors.push('Country is required.');
  if (!String(input.city ?? '').trim()) errors.push('City is required.');

  const size = num(input.plotSize);
  if (size == null) errors.push('Plot size is required.');
  else if (size <= 0) errors.push('Plot size must be greater than zero.');

  if (!isPlotSizeUnit(input.plotSizeUnit)) {
    errors.push(`Plot size unit must be one of: ${PLOT_SIZE_UNITS.map((u) => u.value).join(', ')}.`);
  }

  const category = String(input.plotCategory ?? '');
  if (!PLOT_CATEGORIES.some((c) => c.value === category)) {
    errors.push(`Plot category must be one of: ${PLOT_CATEGORIES.map((c) => c.value).join(', ')}.`);
  }

  // A price OR a payment plan — a scheme sold purely on instalments has no
  // single headline price, and refusing it would block exactly the listings
  // this work exists for.
  const price = num(input.price);
  if (!input.hasPaymentPlan) {
    if (price == null) errors.push('Price is required unless the listing carries a payment plan.');
    else if (price <= 0) errors.push('Price must be greater than zero.');
  } else if (price != null && price <= 0) {
    errors.push('Price must be greater than zero.');
  }

  const currency = String(input.currency ?? '');
  if (!currency) errors.push('Currency is required.');
  else if (!input.supportedCurrencies.includes(currency)) {
    errors.push(`Currency ${currency} is not supported. Supported: ${input.supportedCurrencies.join(', ')}.`);
  }

  if (!input.inheritsDevelopmentImage) {
    const images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
    if (images.length === 0) errors.push('At least one image is required.');
  }

  return errors;
}

/** A URL-safe slug for a development name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
