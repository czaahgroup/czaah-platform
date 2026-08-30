/**
 * Timezone-aware date/time rendering. Storage is always UTC (already true
 * across the platform); this renders in the viewer's zone.
 */

export function formatInZone(
  iso: string | Date,
  timezone = 'UTC',
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  locale = 'en'
): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  try {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: timezone }).format(d)
  } catch {
    return new Intl.DateTimeFormat(locale, opts).format(d)
  }
}

export function dateInZone(iso: string | Date, timezone = 'UTC', locale = 'en'): string {
  return formatInZone(iso, timezone, { dateStyle: 'medium' }, locale)
}

/** "in 3h", "2d ago" — zone-independent. */
export function relative(iso: string | Date, locale = 'en'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const secs = (d.getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(secs)
  if (abs < 60) return rtf.format(Math.round(secs), 'second')
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour')
  if (abs < 2592000) return rtf.format(Math.round(secs / 86400), 'day')
  return rtf.format(Math.round(secs / 2592000), 'month')
}

/** The current wall-clock time in a given zone, as "15:04". */
export function clockIn(timezone: string, locale = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date())
  } catch {
    return ''
  }
}

export const COMMON_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Brussels',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Singapore',
  'America/New_York',
]
