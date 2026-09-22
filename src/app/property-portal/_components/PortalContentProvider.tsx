'use client'

import { seedPortalRuntime } from './portalRuntime'
import type { PortalContent } from '@/lib/portalContent'

/**
 * Seeds the runtime settings from what the server layout loaded.
 *
 * The seed happens in the render body rather than an effect: children read
 * these values while rendering, and useListings fires its request on first
 * render, so an effect would be a frame too late and would request with the
 * default country list.
 */
export function PortalContentProvider({
  content,
  children,
}: {
  content: PortalContent
  children: React.ReactNode
}) {
  seedPortalRuntime(content)
  return <>{children}</>
}
