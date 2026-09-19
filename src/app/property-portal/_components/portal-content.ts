// Editorial content for the portal home page. Kept out of page.tsx so the
// copy can be edited without touching layout code.

// "Why invest here" — one set of reasons per market, shown as a tile slider.
// Figures are positioning claims, not live data; review before changing.
export const WHY_INVEST: {
  market: string;
  points: { title: string; body: string }[];
}[] = [
  {
    market: 'London',
    points: [
      {
        title: 'Title certainty',
        body: 'HM Land Registry title, English law and a mature conveyancing system — ownership is a matter of public record from day one.',
      },
      {
        title: 'Deep rental demand',
        body: 'A structural housing shortfall and the largest professional tenant base in Europe keep prime rental voids short.',
      },
      {
        title: 'Currency hedge',
        body: 'Sterling assets diversify portfolios held in USD, AED or PKR without leaving a G7 jurisdiction.',
      },
      {
        title: 'Financing access',
        body: 'Established non-resident mortgage market, so capital can be geared rather than fully committed.',
      },
    ],
  },
  {
    market: 'Dubai',
    points: [
      {
        title: 'Tax-free returns',
        body: 'No income tax, capital gains tax or wealth tax on property — rental yield lands in full.',
      },
      {
        title: 'Higher yields',
        body: 'Gross yields typically run well above London or Singapore for comparable quality stock.',
      },
      {
        title: 'Residency route',
        body: 'Qualifying property investment can support long-term UAE residency for the owner and family.',
      },
      {
        title: 'Payment plans',
        body: 'Off-plan purchases are commonly staged against construction milestones, easing cash-flow.',
      },
    ],
  },
  {
    market: 'Pakistan',
    points: [
      {
        title: 'Entry pricing',
        body: 'Replacement cost per square foot remains a fraction of Gulf or UK equivalents for comparable build quality.',
      },
      {
        title: 'CPEC corridor',
        body: 'Industrial and Special Economic Zone assets sit along active trade-corridor infrastructure investment.',
      },
      {
        title: 'Local verification',
        body: 'CZAAH partners on the ground verify title and encumbrances before anything reaches the portal.',
      },
      {
        title: 'Overseas channels',
        body: 'Established remittance and Roshan Digital routes for non-resident buyers to fund and repatriate.',
      },
    ],
  },
];

// Markets CZAAH transacts in beyond the three core portal markets. These are
// relationship/deal-flow markets — shown to signal reach, not as live listings.
export const GLOBAL_PRESENCE: { city: string; country: string; note: string }[] = [
  { city: 'London', country: 'United Kingdom', note: 'Head office' },
  { city: 'Dubai', country: 'United Arab Emirates', note: 'Gulf desk' },
  { city: 'Islamabad', country: 'Pakistan', note: 'Regional office' },
  { city: 'Riyadh', country: 'Saudi Arabia', note: 'Partner network' },
  { city: 'Doha', country: 'Qatar', note: 'Partner network' },
  { city: 'Karachi', country: 'Pakistan', note: 'Commercial & industrial' },
  { city: 'Lahore', country: 'Pakistan', note: 'Residential & mixed-use' },
  { city: 'Gwadar', country: 'Pakistan', note: 'CPEC corridor' },
];
