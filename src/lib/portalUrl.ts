// Where "Real Estate" should send people.
//
// The property portal is the same app served under /property-portal, but it
// has its own public domain (property.czaah.com). Anything on the main site
// that means "our real estate business" should land people on that domain, so
// they arrive inside the portal brand rather than on a group sector page.
//
// Set NEXT_PUBLIC_PROPERTY_PORTAL_URL to the absolute domain in production.
// When it's unset (local dev, previews) this falls back to the in-app path so
// links stay clickable without pointing developers at production.
export const PROPERTY_PORTAL_URL =
  process.env.NEXT_PUBLIC_PROPERTY_PORTAL_URL || '/property-portal';

// True when the link leaves the current origin — callers use this to decide
// whether a plain <a> is needed instead of next/link's client navigation.
export const PORTAL_IS_EXTERNAL = PROPERTY_PORTAL_URL.startsWith('http');
