// Property- and infrastructure-relevant analysis, curated from the CZAAH group's
// static research library on the main site (/insights). Each entry deep-links to
// the full article by anchor. There is no blog CMS.
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
      "Relaxed height limits and Grade-A office demand are reshaping the capital's commercial district — Class-A occupancy is above 92% and USD yields sit at 7–9%.",
  },
  {
    id: 'post-13',
    category: 'Infrastructure',
    date: '21 February 2026',
    title: "Pakistan's construction sector posts 12% growth — infrastructure leads",
    excerpt:
      'Public infrastructure spending drove 12% YoY growth in FY2025. The materials and engineering supply chain is the lower-risk way into the boom.',
  },
  {
    id: 'post-11',
    category: 'Real Estate',
    date: '7 February 2026',
    title: 'Gwadar Free Zone Phase 1 — why investors are moving now',
    excerpt:
      'Phase 1 is 90% allocated. 23-year tax exemptions, duty-free imports and full profit repatriation, with land values up 300% since 2020.',
  },
  {
    id: 'post-9',
    category: 'Infrastructure',
    date: '24 January 2026',
    title: "ML-1 railway upgrade — Pakistan's $6.8bn infrastructure bet",
    excerpt:
      'The 1,872km Karachi–Peshawar mainline upgrade is driving 40–80% land appreciation around planned station redevelopments.',
  },
  {
    id: 'post-8',
    category: 'Real Estate',
    date: '17 January 2026',
    title: 'Diaspora investment in Pakistani real estate — record inflows in 2025',
    excerpt:
      'Overseas Pakistanis invested a record $3.8bn in 2025, up 28%. The shift is from land banking toward commercial property and purpose-built rentals.',
  },
  {
    id: 'post-6',
    category: 'Infrastructure',
    date: '3 January 2026',
    title: "Pakistan's housing shortage — 10 million units and counting",
    excerpt:
      'A 10-million-unit deficit growing by 300,000 a year. Addressing even 10% of it is a $12bn market for developers who can deliver title-clean units at scale.',
  },
  {
    id: 'post-5',
    category: 'Real Estate',
    date: '27 December 2025',
    title: "Special Economic Zones — Pakistan's industrial real estate opportunity",
    excerpt:
      'Four CPEC SEZs are operational with 10-year tax exemptions. Direct industrial plots are appreciating 15–20% a year as allocation fills up.',
  },
];
