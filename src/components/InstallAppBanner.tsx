'use client'

// Surfaces "add to home screen" so visitors actually discover it instead
// of needing to know their browser's menu. Android/Chrome gets a one-tap
// native install prompt (captured via beforeinstallprompt); iOS Safari has
// no such API at all, so it gets a instructional hint instead (Share ->
// Add to Home Screen).

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

const DISMISS_KEY = 'czaah-install-dismissed'
const COOKIE_CONSENT_KEY = 'czaah-cookie-consent'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

export function InstallAppBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return

    let cancelled = false
    // Don't stack on top of the cookie banner — wait for that decision first.
    function revealWhenReady(nextPlatform: 'android' | 'ios') {
      function check() {
        if (cancelled) return
        if (localStorage.getItem(COOKIE_CONSENT_KEY)) {
          setPlatform(nextPlatform)
          setVisible(true)
        } else {
          setTimeout(check, 1000)
        }
      }
      setTimeout(check, 1500)
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      revealWhenReady('android')
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if (isIOS()) revealWhenReady('ios')

    function handleAppInstalled() {
      setVisible(false)
      localStorage.setItem(DISMISS_KEY, '1')
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      cancelled = true
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  // Full-screen meeting rooms should stay distraction-free.
  if (pathname?.startsWith('/meet/')) return null
  if (!visible || !platform) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9985,
        background: '#080808',
        borderTop: '1px solid rgba(201, 168, 76, 0.3)',
        padding: '14px 20px',
        animation: 'installSlideUp 0.4s ease-out',
      }}
    >
      <style>{`
        @keyframes installSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
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
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0,
            lineHeight: 1.5,
            flex: 1,
            minWidth: '250px',
          }}
        >
          {platform === 'ios' ? (
            <>Add CZAAH to your Home Screen — tap <strong style={{ color: '#C9A84C' }}>Share</strong>, then <strong style={{ color: '#C9A84C' }}>&quot;Add to Home Screen&quot;</strong>.</>
          ) : (
            'Install the CZAAH app for quick access from your home screen.'
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {platform === 'android' && (
            <button
              onClick={handleInstallClick}
              style={{
                fontFamily: "'Raleway', Arial, sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: '#C9A84C',
                color: '#000000',
                border: 'none',
                padding: '8px 24px',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#d4b35a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#C9A84C')}
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '20px',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  )
}
