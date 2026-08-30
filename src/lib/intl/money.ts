/**
 * Money — an amount paired with an ISO-4217 currency code.
 *
 * Storage rule (P3-0): every monetary column on a module table has a paired
 * `*_currency CHAR(3)`. The original amount + currency are never lost;
 * conversion happens only at display time, against the fx_rates table.
 */

export interface Money {
  amount: number
  currency: string
}

export interface FxRate {
  code: string
  base: string
  rate: number // 1 base = <rate> <code>
}

const SYMBOL: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', AED: 'د.إ', PKR: '₨', SAR: '﷼', CNY: '¥', HKD: 'HK$',
}
const DECIMALS: Record<string, number> = { PKR: 0, JPY: 0, KWD: 3, OMR: 3, BHD: 3 }

export function money(amount: number, currency: string): Money {
  return { amount, currency: currency.toUpperCase() }
}

/** Convert a Money to `to`, using a rate table keyed by code (all vs the same base). */
export function convert(m: Money, to: string, rates: Record<string, FxRate>): Money | null {
  const from = m.currency.toUpperCase()
  to = to.toUpperCase()
  if (from === to) return m
  const rf = rates[from]
  const rt = rates[to]
  if (!rf || !rt || rf.base !== rt.base) return null
  // amount in base = amount / rf.rate ; then * rt.rate
  return { amount: (m.amount / rf.rate) * rt.rate, currency: to }
}

export function formatMoney(m: Money, locale = 'en'): string {
  const dp = DECIMALS[m.currency] ?? 2
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency, maximumFractionDigits: dp }).format(m.amount)
  } catch {
    const sym = SYMBOL[m.currency] || m.currency + ' '
    return sym + m.amount.toLocaleString(locale, { maximumFractionDigits: dp })
  }
}

/** Compact form for dashboards: $1.2M, £940k. */
export function formatMoneyCompact(m: Money, locale = 'en'): string {
  const sym = SYMBOL[m.currency] || m.currency + ' '
  const a = Math.abs(m.amount)
  if (a >= 1e9) return `${sym}${(m.amount / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${sym}${(m.amount / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${sym}${Math.round(m.amount / 1e3)}k`
  return formatMoney(m, locale)
}
