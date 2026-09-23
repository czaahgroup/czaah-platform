'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Rendered inside the portal layout when a page throws, so visitors see a
// branded message and a way forward — never a raw error or a blank page.
// The error itself goes to the console (and Sentry, where configured), not
// on screen.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[portal] page error', error.digest || '', error)
  }, [error])

  return (
    <main>
      <div className="pp-container">
        <div className="pp-cta-band" style={{ background: 'none', padding: '120px 0 140px' }}>
          <div className="pp-eyebrow">Something went wrong</div>
          <h2 className="pp-h2">This page didn&apos;t load</h2>
          <p>It&apos;s on our side, not yours. Try again, or carry on browsing.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={reset} className="pp-btn pp-btn--gold">
              Try again
            </button>
            <Link href="/property-portal/buy" className="pp-btn pp-btn--ghost">Property to Buy</Link>
            <Link href="/property-portal/contact" className="pp-btn pp-btn--ghost">Contact us</Link>
          </div>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>Reference: {error.digest}</p>
          )}
        </div>
      </div>
    </main>
  )
}
