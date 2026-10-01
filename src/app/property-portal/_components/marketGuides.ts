// Written guidance for the "Compare Property Markets" section, keyed by ISO
// country code (the code set in Admin → Locations).
//
// It ships EMPTY on purpose. Ownership rules, transaction costs and financing
// are regulated subjects: each line added here must be checked by someone
// qualified in that market, and must not include a figure that cannot be
// sourced. A field left out is simply not shown — the section never prints a
// placeholder to visitors.

export interface MarketGuide {
  /** One or two plain sentences about the market. No superlatives, no forecasts. */
  overview?: string
  /** Who may own what, e.g. freehold / leasehold, foreign ownership. */
  ownership?: string
  /** Taxes and fees a buyer should expect, with the source checked. */
  costs?: string
  /** Whether mortgages or developer finance are typically available. */
  financing?: string
}

export const MARKET_GUIDES: Record<string, MarketGuide> = {
  // GB: { overview: '', ownership: '', costs: '', financing: '' },
  // AE: {},
  // PK: {},
}

export function marketGuide(code: string | null | undefined): MarketGuide | null {
  return (code && MARKET_GUIDES[code.toUpperCase()]) || null
}
