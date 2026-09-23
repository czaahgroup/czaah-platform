// Editorial content for the portal home and about pages. Kept out of page.tsx
// so the copy can be edited without touching layout code — and, since
// 2026-09-23, from /admin/portal-content without a deploy.
//
// Wording rule (see the claims review of 2026-09-23): nothing here may state a
// figure, a comparison or a guarantee that CZAAH cannot evidence. Direct
// property is rarely an FCA-regulated investment, but UK advertising rules
// (ASA / CMA) still require every factual claim to be substantiated.
import { portalWhyInvest as storedWhyInvest, portalTestimonials as storedTestimonials } from './portalRuntime';

/** One reason, flat so the admin list editor can edit it like any other row. */
export interface WhyInvestPoint {
  market: string;
  title: string;
  body: string;
}

export interface WhyInvestMarket {
  market: string;
  points: { title: string; body: string }[];
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

// "Why invest here" — reasons per market, shown as tabs on the home page. Rows
// are grouped by market in the order each market first appears.
export const WHY_INVEST_POINTS: WhyInvestPoint[] = [
  {
    market: 'London',
    title: 'Title certainty',
    body: 'HM Land Registry title, English law and a mature conveyancing system — ownership is a matter of public record.',
  },
  {
    market: 'London',
    title: 'Deep rental demand',
    body: 'One of Europe’s deepest rental markets, with a large professional tenant base.',
  },
  {
    market: 'London',
    title: 'Currency diversification',
    body: 'Sterling assets can diversify a portfolio held in USD, AED or PKR, within a G7 jurisdiction.',
  },
  {
    market: 'London',
    title: 'Financing access',
    body: 'An established non-resident mortgage market, so a purchase need not be fully cash-funded. Lending is subject to status.',
  },
  {
    market: 'Dubai',
    title: 'Low-tax ownership',
    body: 'The UAE levies no personal income tax or capital gains tax on property held by individuals. Your home country may still tax the income or gain.',
  },
  {
    market: 'Dubai',
    title: 'Freehold for foreign buyers',
    body: 'Non-residents can buy freehold in designated areas, with title registered by the Dubai Land Department.',
  },
  {
    market: 'Dubai',
    title: 'Residency route',
    body: 'Qualifying property investment can support long-term UAE residency for the owner and family, subject to government criteria.',
  },
  {
    market: 'Dubai',
    title: 'Payment plans',
    body: 'Off-plan purchases are commonly staged against construction milestones, easing cash-flow.',
  },
  {
    market: 'Pakistan',
    title: 'Entry pricing',
    body: 'Cost per square foot is typically lower than in Gulf or UK markets.',
  },
  {
    market: 'Pakistan',
    title: 'CPEC corridor',
    body: 'Industrial and Special Economic Zone assets sit along trade-corridor infrastructure.',
  },
  {
    market: 'Pakistan',
    title: 'Local representation',
    body: 'CZAAH partners on the ground in Pakistan, with title and encumbrance checks as part of our transaction support.',
  },
  {
    market: 'Pakistan',
    title: 'Overseas channels',
    body: 'Established remittance and Roshan Digital routes let non-resident buyers fund a purchase, subject to State Bank of Pakistan rules.',
  },
];

// Ships empty: the quotes previously here could not be tied to a client on
// record, and one promised protection from political risk. The home page hides
// the section while the list is empty; real, attributable quotes are added in
// /admin/portal-content.
export const TESTIMONIALS: Testimonial[] = [];

export function groupWhyInvest(points: WhyInvestPoint[]): WhyInvestMarket[] {
  const markets: WhyInvestMarket[] = [];
  for (const p of points) {
    const market = String(p?.market || '').trim();
    const title = String(p?.title || '').trim();
    if (!market || !title) continue;
    let group = markets.find((m) => m.market === market);
    if (!group) {
      group = { market, points: [] };
      markets.push(group);
    }
    group.points.push({ title, body: String(p.body || '').trim() });
  }
  return markets;
}

/** The stored reasons if any have been saved in admin, otherwise the shipped ones. */
export function portalWhyInvest(): WhyInvestMarket[] {
  const stored = storedWhyInvest();
  const grouped = stored ? groupWhyInvest(stored as WhyInvestPoint[]) : [];
  return grouped.length ? grouped : groupWhyInvest(WHY_INVEST_POINTS);
}

/**
 * The stored testimonials, otherwise the shipped (empty) list. Unlike the other
 * sections an empty stored list is honoured — "show no testimonials" is a
 * legitimate editorial choice, not a broken row.
 */
export function portalTestimonials(): Testimonial[] {
  const stored = storedTestimonials();
  const list = (stored ?? TESTIMONIALS) as Testimonial[];
  return list.filter((t) => t && String(t.quote || '').trim());
}
