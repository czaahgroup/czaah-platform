import type { MetalPrice } from '@/lib/metalPrices'

const money = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: n < 100 ? 2 : 0 })

// Server-rendered: the prices are in the HTML, with the time they were taken.
// Renders nothing when there is no fresh price to show.
export function MetalPrices({ prices }: { prices: MetalPrice[] }) {
  if (!prices.length) return null
  // The oldest of the times shown, so "as of" never overstates freshness.
  const asOf = prices.map((p) => p.source_updated_at || p.fetched_at).sort()[0]
  const when = new Date(asOf).toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="border-b border-outline-variant/15" aria-labelledby="metal-prices-title">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <h2 id="metal-prices-title" className="cinzel-text text-xl font-semibold">Metal <span className="text-primary">prices</span></h2>
          <p className="text-xs text-on-surface-variant">As of {when} UTC</p>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {prices.map((p) => (
            <div key={p.symbol} className="bg-surface-container border border-outline-variant/15 px-4 py-4">
              <dt className="text-sm text-on-surface-variant">{p.name}</dt>
              <dd className="text-xl font-semibold text-on-surface mt-1">${money(p.price_usd)}</dd>
              <dd className="text-xs text-on-surface-variant mt-0.5">{p.unit.replace('US$ / ', 'per ')}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
          Spot prices in US dollars from <a href="https://gold-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">gold-api.com</a>.
          Copper is the COMEX price converted from US$ per pound. For reference only: these are market prices for refined metal, not prices for any offer on this site.
        </p>
      </div>
    </section>
  )
}
