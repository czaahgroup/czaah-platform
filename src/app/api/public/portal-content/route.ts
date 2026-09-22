import { NextResponse } from 'next/server'
import { loadPortalContent } from '@/lib/portalContent'

/**
 * Content and settings for the portal. Always 200: loadPortalContent falls
 * back to the shipped defaults rather than failing, because the alternative is
 * a public site that breaks when a content row does.
 */
export async function GET() {
  const data = await loadPortalContent()
  return NextResponse.json(
    { data },
    {
      // Content changes rarely and every portal page asks for it. A short
      // shared cache keeps an edit visible within the minute.
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    }
  )
}
