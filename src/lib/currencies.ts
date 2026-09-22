// The currencies the property platform accepts, in one place.
//
// The portal's FX table and the server-side validators both read from here —
// when they drifted, an admin could save a listing in a currency the portal
// could not convert or format.
export const CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'PKR']

// Approximate units of the currency per 1 USD. Not live rates — they give the
// portal a rough cross-market comparison only.
export const FX_PER_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AED: 3.67,
  PKR: 278,
}
