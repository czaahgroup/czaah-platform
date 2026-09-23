/**
 * Escapes text for safe interpolation into HTML — email bodies above all,
 * where a visitor-supplied name or message must never become markup or links.
 * Null and undefined become an empty string.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
