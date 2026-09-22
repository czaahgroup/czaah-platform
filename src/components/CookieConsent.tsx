'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'czaah-cookie-consent'

// Both bottom bars are position:fixed, so they sat on top of whatever the page
// ended with — the property portal's send-enquiry button, the mobile drawer's
// CTA. Publish the bar's height as --app-bottom-bar and let layouts reserve it.
function useBottomBarHeight(visible: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const root = document.documentElement
    if (!visible || !el) {
      root.style.removeProperty('--app-bottom-bar')
      return
    }
    const sync = () => root.style.setProperty('--app-bottom-bar', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--app-bottom-bar')
    }
  }, [visible])

  return ref
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const barRef = useBottomBarHeight(visible)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay for entrance animation
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9990,
        background: '#080808',
        borderTop: '1px solid rgba(201, 168, 76, 0.3)',
        padding: '16px 20px',
        animation: 'cookieSlideUp 0.4s ease-out',
      }}
    >
      <style>{`
        @keyframes cookieSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            fontFamily: "'Raleway', Arial, sans-serif",
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
            lineHeight: 1.5,
            flex: 1,
            minWidth: '250px',
          }}
        >
          We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <Link
            href="/privacy"
            style={{
              fontFamily: "'Raleway', Arial, sans-serif",
              fontSize: '13px',
              color: '#C9A84C',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              padding: '13px 4px',
            }}
          >
            Privacy Policy
          </Link>
          <button
            onClick={handleAccept}
            style={{
              fontFamily: "'Raleway', Arial, sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              background: '#C9A84C',
              color: '#000000',
              border: 'none',
              padding: '13px 26px',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d4b35a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#C9A84C')}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
