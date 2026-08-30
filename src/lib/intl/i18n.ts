/**
 * Minimal i18n scaffold (P3-0). Full translation is a per-module effort;
 * this establishes the mechanism so strings aren't hard-coded from here on.
 *
 * Catalogues live in src/lib/intl/messages/<locale>.json. `t(key)` falls back
 * to English, then to the key itself. `{n}` placeholders are interpolated.
 */
import en from './messages/en.json'

type Catalogue = Record<string, string>
const CATALOGUES: Record<string, Catalogue> = { en: en as Catalogue }

export const SUPPORTED_LOCALES = ['en', 'ar', 'ur', 'fr', 'zh'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const RTL_LOCALES = new Set(['ar', 'ur'])

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(locale)
}

export async function loadCatalogue(locale: string): Promise<void> {
  if (CATALOGUES[locale] || !SUPPORTED_LOCALES.includes(locale as Locale)) return
  try {
    CATALOGUES[locale] = (await import(`./messages/${locale}.json`)).default
  } catch {
    // no catalogue yet — English fallback applies
  }
}

export function t(key: string, params?: Record<string, string | number>, locale = 'en'): string {
  let s = CATALOGUES[locale]?.[key] ?? CATALOGUES.en?.[key] ?? key
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
