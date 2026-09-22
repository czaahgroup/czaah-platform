import { portalSettings } from './portalRuntime';

// ============================================================================
// True cost of acquisition
// ----------------------------------------------------------------------------
// A headline price is not what a cross-border buyer pays. This models the
// transaction costs on top of it, per jurisdiction.
//
// ⚠️  THESE ARE TAX AND DUTY RATES. They change with each budget, they differ
//     by buyer status (resident / non-resident / first-time / filer), and
//     getting them wrong misleads someone committing real capital.
//     EVERY RATE BELOW MUST BE VERIFIED BY A QUALIFIED ADVISER IN THAT
//     JURISDICTION BEFORE THIS IS SHOWN TO CUSTOMERS.
//
// They are deliberately kept here as plain, labelled constants so a
// professional can check and correct them without reading any other code.
// ============================================================================

// Master switch. OFF until every rate below has been verified by a qualified
// adviser in its jurisdiction — the block renders nothing while this is false.
// Flip to true once signed off; no other change is needed.
/**
 * Shipped default. The live value is the admin setting — see
 * acquisitionCostEnabled() — so the flag can be turned on once a tax adviser
 * has signed the rates off, without a deploy.
 */
export const ACQUISITION_COST_ENABLED = false;

export function acquisitionCostEnabled(): boolean {
  return portalSettings().acquisitionCostEnabled === true;
}

export interface CostLine {
  label: string;
  amount: number;
  note?: string;
}

export interface CostEstimate {
  lines: CostLine[];
  fees: number;
  total: number;
  /** Fees as a percentage of the purchase price. */
  pct: number;
  jurisdiction: string;
  /** True when we have no model for this country — show price only. */
  unknown?: boolean;
}

type Band = { upTo: number | null; rate: number };

/** Progressive banded duty: each band's rate applies only to the slice within it. */
function banded(price: number, bands: Band[]): number {
  let remaining = price;
  let last = 0;
  let total = 0;
  for (const b of bands) {
    const ceiling = b.upTo ?? Infinity;
    const slice = Math.max(0, Math.min(price, ceiling) - last);
    if (slice <= 0 && ceiling !== Infinity) { last = ceiling; continue; }
    total += slice * b.rate;
    last = ceiling;
    remaining -= slice;
    if (remaining <= 0) break;
  }
  return total;
}

// ── United Kingdom ──────────────────────────────────────────────────────
// SDLT differs sharply between residential and non-residential. Most CZAAH
// London stock is commercial or mixed-use, which uses the lower
// non-residential scale and carries NEITHER the additional-dwelling nor the
// non-resident surcharge — a distinction that materially changes the number.
const UK_SDLT_RESIDENTIAL: Band[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.10 },
  { upTo: null, rate: 0.12 },
];
const UK_SDLT_NON_RESIDENTIAL: Band[] = [
  { upTo: 150_000, rate: 0 },
  { upTo: 250_000, rate: 0.02 },
  { upTo: null, rate: 0.05 },
];
const UK_ADDITIONAL_DWELLING_SURCHARGE = 0.05; // residential only
const UK_NON_RESIDENT_SURCHARGE = 0.02;        // residential only
const UK_LEGAL_FEES = 2_500;
const UK_SURVEY = 1_200;
const UK_LAND_REGISTRY = 500;

// ── United Arab Emirates (Dubai) ────────────────────────────────────────
const UAE_DLD_TRANSFER = 0.04;   // Dubai Land Department transfer fee
const UAE_AGENCY = 0.02;
const UAE_DLD_ADMIN = 4_200;     // AED, converted below
const UAE_NOC = 5_000;           // AED, developer no-objection certificate

// ── Pakistan ────────────────────────────────────────────────────────────
// Advance tax under s.236K differs substantially for filers vs non-filers —
// the single biggest variable for an overseas Pakistani buyer.
const PK_STAMP_DUTY = 0.03;
const PK_CAPITAL_VALUE_TAX = 0.02;
const PK_REGISTRATION = 0.01;
const PK_ADVANCE_TAX_FILER = 0.03;
const PK_ADVANCE_TAX_NON_FILER = 0.105;

// ── Saudi Arabia / Qatar ────────────────────────────────────────────────
const SA_RETT = 0.05;            // Real Estate Transaction Tax
const QA_REGISTRATION = 0.0025;

/** Rough AED/USD and PKR/USD for the flat fees above; display only. */
const AED_PER_USD = 3.67;

export interface CostOptions {
  /** Pakistan only: filer status changes advance tax materially. */
  pakistaniFiler?: boolean;
  /** UK only: residential stock attracts both surcharges. */
  ukResidential?: boolean;
}

export function estimateAcquisitionCost(
  priceUsd: number,
  country: string | null | undefined,
  propertyType?: string | null,
  opts: CostOptions = {}
): CostEstimate {
  const c = (country || '').trim().toLowerCase();
  const lines: CostLine[] = [];

  // Infer residential vs commercial from the listing's own type unless the
  // caller overrides it.
  const isResidential =
    opts.ukResidential ?? ['residential', 'mixed_use'].includes((propertyType || '').toLowerCase());

  if (c === 'united kingdom') {
    const bands = isResidential ? UK_SDLT_RESIDENTIAL : UK_SDLT_NON_RESIDENTIAL;
    let sdlt = banded(priceUsd, bands);
    if (isResidential) {
      sdlt += priceUsd * (UK_ADDITIONAL_DWELLING_SURCHARGE + UK_NON_RESIDENT_SURCHARGE);
    }
    lines.push({
      label: 'Stamp Duty Land Tax',
      amount: sdlt,
      note: isResidential
        ? 'Residential scale, incl. 5% additional-property and 2% non-resident surcharges'
        : 'Non-residential scale — no additional-property or non-resident surcharge',
    });
    lines.push({ label: 'Legal fees', amount: UK_LEGAL_FEES, note: 'Indicative conveyancing' });
    lines.push({ label: 'Survey', amount: UK_SURVEY });
    lines.push({ label: 'Land Registry', amount: UK_LAND_REGISTRY });
    return finalise(lines, priceUsd, 'United Kingdom');
  }

  if (c === 'united arab emirates') {
    lines.push({ label: 'DLD transfer fee', amount: priceUsd * UAE_DLD_TRANSFER, note: '4% to Dubai Land Department' });
    lines.push({ label: 'Agency fee', amount: priceUsd * UAE_AGENCY });
    lines.push({ label: 'DLD administration', amount: UAE_DLD_ADMIN / AED_PER_USD });
    lines.push({ label: 'Developer NOC', amount: UAE_NOC / AED_PER_USD });
    return finalise(lines, priceUsd, 'United Arab Emirates');
  }

  if (c === 'pakistan') {
    const advance = opts.pakistaniFiler === false ? PK_ADVANCE_TAX_NON_FILER : PK_ADVANCE_TAX_FILER;
    lines.push({ label: 'Stamp duty', amount: priceUsd * PK_STAMP_DUTY });
    lines.push({ label: 'Capital Value Tax', amount: priceUsd * PK_CAPITAL_VALUE_TAX });
    lines.push({ label: 'Registration', amount: priceUsd * PK_REGISTRATION });
    lines.push({
      label: 'Advance tax (s.236K)',
      amount: priceUsd * advance,
      note: opts.pakistaniFiler === false ? 'Non-filer rate' : 'Filer rate',
    });
    return finalise(lines, priceUsd, 'Pakistan');
  }

  if (c === 'saudi arabia') {
    lines.push({ label: 'Real Estate Transaction Tax', amount: priceUsd * SA_RETT });
    return finalise(lines, priceUsd, 'Saudi Arabia');
  }

  if (c === 'qatar') {
    lines.push({ label: 'Registration fee', amount: priceUsd * QA_REGISTRATION });
    return finalise(lines, priceUsd, 'Qatar');
  }

  // No model for this jurisdiction — say so rather than guess.
  return {
    lines: [],
    fees: 0,
    total: priceUsd,
    pct: 0,
    jurisdiction: country || 'Unknown',
    unknown: true,
  };
}

function finalise(lines: CostLine[], price: number, jurisdiction: string): CostEstimate {
  const fees = lines.reduce((a, l) => a + l.amount, 0);
  return {
    lines,
    fees,
    total: price + fees,
    pct: price > 0 ? (fees / price) * 100 : 0,
    jurisdiction,
  };
}
