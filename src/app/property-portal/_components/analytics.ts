// Analytics event hooks (brief §41). No third-party tracker is installed:
// events go to window.dataLayer (ready for Google Tag Manager or similar,
// if one is ever added) and a DOM CustomEvent, and nothing else. No personal
// data is ever passed — only listing ids and event names.

export type PortalEvent =
  | 'property_view'
  | 'property_save'
  | 'property_enquiry'
  | 'viewing_request'
  | 'whatsapp_click'
  | 'phone_click'
  | 'property_share'
  | 'project_view'
  | 'brochure_request'
  | 'investment_enquiry'
  | 'seller_submission'
  | 'save_search'
  | 'account_created'
  | 'account_sign_in';

export function track(event: PortalEvent, data: Record<string, string | number | boolean | null | undefined> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    (w.dataLayer = w.dataLayer || []).push({ event, ...data });
    window.dispatchEvent(new CustomEvent('czaah:analytics', { detail: { event, ...data } }));
  } catch {
    // Analytics must never break the page.
  }
}
