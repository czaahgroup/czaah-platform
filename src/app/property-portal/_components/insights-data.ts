// Property- and infrastructure-relevant analysis, curated from the CZAAH group's
// static research library on the main site (/insights). Each entry deep-links to
// the full article by anchor. There is no blog CMS.
import { portalInsights as portalRuntimeInsights } from './portalRuntime';

export interface InsightArticle {
  id: string;
  category: 'Real Estate' | 'Infrastructure';
  date: string;
  title: string;
  excerpt: string;
}

export const INSIGHTS: InsightArticle[] = [
  {
    id: 'post-14',
    category: 'Real Estate',
    date: '28 February 2026',
    title: "Islamabad's Blue Area Expansion — commercial real estate at an inflection point",
    excerpt:
      "Relaxed height limits and demand for Grade-A office space are reshaping the capital's commercial district.",
  },
  {
    id: 'post-13',
    category: 'Infrastructure',
    date: '21 February 2026',
    title: "Pakistan's construction sector — infrastructure leads",
    excerpt:
      'Public infrastructure spending is driving construction activity, with the materials and engineering supply chain one way into the sector.',
  },
  {
    id: 'post-11',
    category: 'Real Estate',
    date: '7 February 2026',
    title: 'Gwadar Free Zone Phase 1 — what investors should know',
    excerpt:
      'The free zone offers long-term tax exemptions, duty-free imports and profit repatriation for qualifying businesses. What that means for land and how allocation works.',
  },
  {
    id: 'post-9',
    category: 'Infrastructure',
    date: '24 January 2026',
    title: "ML-1 railway upgrade — Pakistan's $6.8bn infrastructure bet",
    excerpt:
      'The Karachi–Peshawar mainline upgrade and what planned station redevelopments could mean for surrounding land.',
  },
  {
    id: 'post-8',
    category: 'Real Estate',
    date: '17 January 2026',
    title: 'Diaspora investment in Pakistani real estate',
    excerpt:
      'How overseas Pakistanis are investing in property at home, and a shift from land banking toward commercial property and purpose-built rentals.',
  },
  {
    id: 'post-6',
    category: 'Infrastructure',
    date: '3 January 2026',
    title: "Pakistan's housing shortage",
    excerpt:
      'A large and growing housing deficit, and the opportunity for developers who can deliver title-clean units at scale.',
  },
  {
    id: 'post-5',
    category: 'Real Estate',
    date: '27 December 2025',
    title: "Special Economic Zones — Pakistan's industrial real estate opportunity",
    excerpt:
      'CPEC Special Economic Zones offer tax incentives to qualifying operators. How direct industrial plots in the zones are allocated.',
  },
];
/**
 * The articles shown on the portal — the stored list if one has been saved in
 * admin, otherwise the shipped list above.
 */
export function portalInsights(): InsightArticle[] {
  const stored = portalRuntimeInsights();
  return stored && stored.length ? (stored as InsightArticle[]) : INSIGHTS;
}
