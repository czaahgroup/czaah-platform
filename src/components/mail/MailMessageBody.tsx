'use client'
// @ts-nocheck

import { useEffect, useRef, useState } from 'react'

/**
 * Renders an email message body. When HTML is present we show it inside a
 * sandboxed iframe (sandbox="allow-same-origin" only — scripts, forms and
 * top-navigation stay blocked, so untrusted sender markup can't run) with a
 * toggle back to the plain-text part.
 */
export default function MailMessageBody({
  bodyText,
  bodyHtml,
  accent = 'var(--mail-text-dim)',
}: {
  bodyText: string | null
  bodyHtml: string | null
  accent?: string
}) {
  const hasHtml = !!bodyHtml && bodyHtml.trim().length > 0
  const [mode, setMode] = useState<'html' | 'text'>(hasHtml ? 'html' : 'text')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [frameHeight, setFrameHeight] = useState(120)

  useEffect(() => {
    if (mode !== 'html') return
    const frame = frameRef.current
    if (!frame) return
    const resize = () => {
      try {
        const doc = frame.contentDocument
        if (doc?.documentElement) {
          setFrameHeight(Math.min(doc.documentElement.scrollHeight + 8, 640))
        }
      } catch {
        /* opaque origin — keep default height */
      }
    }
    frame.addEventListener('load', resize)
    const t = setTimeout(resize, 120)
    return () => {
      frame.removeEventListener('load', resize)
      clearTimeout(t)
    }
  }, [mode, bodyHtml])

  const srcDoc = hasHtml
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html{color-scheme:light}body{margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;color:#111;background:#fff;word-break:break-word}img{max-width:100%;height:auto}a{color:#1a56b0}</style></head><body>${bodyHtml}</body></html>`
    : ''

  return (
    <div>
      {hasHtml && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          {(['html', 'text'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? 'var(--mail-accent-soft)' : 'transparent',
                border: '1px solid var(--mail-accent-dim)',
                color: mode === m ? 'var(--mail-accent)' : 'var(--mail-text-faint)',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '10px',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              {m === 'html' ? 'Rich' : 'Plain'}
            </button>
          ))}
        </div>
      )}

      {mode === 'html' && hasHtml ? (
        <iframe
          ref={frameRef}
          sandbox="allow-same-origin"
          srcDoc={srcDoc}
          title="Message content"
          style={{
            width: '100%',
            height: `${frameHeight}px`,
            border: '1px solid var(--mail-border)',
            borderRadius: '6px',
            background: '#fff',
            display: 'block',
          }}
        />
      ) : (
        <p
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            color: accent,
            margin: 0,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {bodyText || (hasHtml ? '(no plain-text version)' : '')}
        </p>
      )}
    </div>
  )
}
