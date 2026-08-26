// Wraps the Badging API (navigator.setAppBadge/clearAppBadge) -- puts a
// small unread-count badge on the installed PWA's home screen icon.
// Supported on iOS 16.4+ (installed to Home Screen only), Android Chrome,
// and desktop Chrome/Edge. Silently a no-op everywhere else.

export function isBadgingSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator
}

export function updateAppBadge(count: number): void {
  if (!isBadgingSupported()) return
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {})
  } else {
    navigator.clearAppBadge().catch(() => {})
  }
}
