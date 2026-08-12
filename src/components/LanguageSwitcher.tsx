'use client'

import { useEffect, useState, useRef } from 'react'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'zh-CN', name: '中文 (Chinese)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'th', name: 'ไทย' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' },
  { code: 'da', name: 'Dansk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'he', name: 'עברית' },
  { code: 'fa', name: 'فارسی' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'am', name: 'አማርኛ' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yorùbá' },
  { code: 'zu', name: 'isiZulu' },
  { code: 'ro', name: 'Română' },
  { code: 'uk', name: 'Українська' },
  { code: 'cs', name: 'Čeština' },
  { code: 'hu', name: 'Magyar' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'bg', name: 'Български' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'sr', name: 'Српски' },
  { code: 'my', name: 'မြန်မာ' },
  { code: 'km', name: 'ភាសាខ្មែរ' },
  { code: 'lo', name: 'ລາວ' },
  { code: 'ne', name: 'नेपाली' },
  { code: 'si', name: 'සිංහල' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'mr', name: 'मराठी' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
  { code: 'ps', name: 'پښتو (Pashto)' },
]

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (options: Record<string, unknown>, elementId: string) => void
      }
    }
    googleTranslateElementInit?: () => void
  }
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Load Google Translate script once
  useEffect(() => {
    if (document.getElementById('google-translate-script')) {
      setLoaded(true)
      return
    }

    // Hidden container for Google's widget (we never show it)
    const container = document.createElement('div')
    container.id = 'google_translate_element'
    container.style.display = 'none'
    document.body.appendChild(container)

    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
            layout: 0, // SIMPLE layout
          },
          'google_translate_element'
        )
        setLoaded(true)
      }
    }

    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Don't remove — keep loaded for session
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function selectLanguage(langCode: string) {
    // Trigger Google Translate by setting the cookie
    const frame = document.querySelector('.goog-te-menu-frame') as HTMLIFrameElement
    if (frame) {
      const items = frame.contentDocument?.querySelectorAll('.goog-te-menu2-item')
      items?.forEach((item) => {
        const text = item.textContent || ''
        const lang = LANGUAGES.find((l) => l.code === langCode)
        if (lang && text.includes(lang.name.split(' ')[0])) {
          (item as HTMLElement).click()
        }
      })
    }

    // Fallback: set cookie directly (Google Translate reads this)
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`
    document.cookie = `googtrans=/en/${langCode}; path=/`

    // Reload to apply
    if (langCode === 'en') {
      // Remove translation
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = `googtrans=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      window.location.reload()
    } else {
      window.location.reload()
    }

    setOpen(false)
    setSearch('')
  }

  const filtered = LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.5,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
        aria-label="Change language"
        title="Change language"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          width: '240px',
          maxHeight: '360px',
          background: '#080808',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px',
          overflow: 'hidden',
          zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language..."
              autoFocus
              style={{
                width: '100%',
                background: '#000',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px',
                padding: '6px 10px',
                color: '#fff',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            />
          </div>

          {/* Language list */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {!loaded && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  Loading languages...
                </span>
              </div>
            )}
            {loaded && filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  color: lang.code === 'en' ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.06)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = lang.code === 'en' ? '#C9A84C' : 'rgba(255,255,255,0.5)'
                }}
              >
                {lang.name}
              </button>
            ))}
            {loaded && filtered.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  No languages found
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hide Google Translate's default UI */}
      <style dangerouslySetInnerHTML={{ __html: `
        .goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt, .goog-te-ftab-link,
        .VIpgJd-ZVi9od-l4eHX-hSRGPd, .VIpgJd-ZVi9od-ORHb-OEVmcd,
        body > .skiptranslate, .goog-logo-link, .goog-te-gadget {
          display: none !important;
        }
        body { top: 0 !important; }
        .goog-text-highlight { background: none !important; box-shadow: none !important; }
      `}} />
    </div>
  )
}
