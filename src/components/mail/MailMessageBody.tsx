'use client'
// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Markers mail clients put in front of the quoted previous message.
const QUOTE_SELECTORS = [
  '.gmail_quote_container',
  '.gmail_quote',
  'blockquote[type="cite"]',
  '#divRplyFwdMsg',
  '#appendonsend',
  '.yahoo_quoted',
  '.moz-cite-prefix',
]
// Outlook desktop has no class — just a top-bordered div opening with "From:"
// (localised: De / Van / Von / Da …).
const OUTLOOK_HEADER_RE = /^\s*(from|de|van|von|da|od|från|fra)\s*:/i
const TEXT_QUOTE_RE = /^(on .+wrote:\s*$|le .+a écrit\s*:|op .+schreef .+:|am .+schrieb .+:|-{2,}\s*original message|(from|de|van|von)\s*:\s*.+@|>)/im

function earliest(a: Element | null, b: Element | null) {
  if (!a) return b
  if (!b) return a
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? a : b
}

/**
 * Splits an HTML body into the new content and the quoted history below it,
 * by removing the first quote marker plus everything after it in document order.
 */
function splitQuotedHtml(html: string): { main: string; hasQuote: boolean } {
  if (typeof DOMParser === 'undefined') return { main: html, hasQuote: false }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body
  let cut: Element | null = null
  for (const sel of QUOTE_SELECTORS) cut = earliest(cut, body.querySelector(sel))
  for (const div of body.querySelectorAll('div[style]')) {
    const style = (div.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase()
    if (style.includes('border-top:solid') && OUTLOOK_HEADER_RE.test(div.textContent || '')) {
      cut = earliest(cut, div)
      break
    }
  }
  if (!cut) return { main: html, hasQuote: false }

  // Drop the marker, then everything after it at each ancestor level (the
  // ancestors themselves stay — they hold the new content above the quote).
  const parent = cut.parentElement
  while (cut.nextSibling) cut.nextSibling.remove()
  cut.remove()
  for (let level: Element | null = parent; level && level !== body; level = level.parentElement) {
    while (level.nextSibling) level.nextSibling.remove()
  }
  // Nothing left but whitespace (e.g. a bare forward) — show the whole thing.
  if (!body.textContent?.trim() && !body.querySelector('img')) return { main: html, hasQuote: false }
  const head = doc.head.innerHTML
  return { main: `${head ? `<head>${head}</head>` : ''}${body.innerHTML}`, hasQuote: true }
}

export function stripQuotedText(text: string | null): string {
  if (!text) return ''
  const m = TEXT_QUOTE_RE.exec(text)
  const main = m && m.index > 0 ? text.slice(0, m.index) : text
  return main.replace(/\s+$/, '')
}

/**
 * Renders an email message body. When HTML is present we show it inside a
 * sandboxed iframe (sandbox="allow-same-origin" only — scripts, forms and
 * top-navigation stay blocked, so untrusted sender markup can't run) with a
 * toggle back to the plain-text part.
 *
 * The iframe is sized to its full content height so the thread scrolls as one
 * page — a capped, internally-scrolling frame traps the mouse wheel and hides
 * the messages below it. Quoted history is collapsed behind a "•••" toggle.
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
  const [showQuoted, setShowQuoted] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const [frameHeight, setFrameHeight] = useState(60)

  const splitHtml = useMemo(() => (hasHtml ? splitQuotedHtml(bodyHtml) : { main: '', hasQuote: false }), [hasHtml, bodyHtml])
  const mainText = useMemo(() => stripQuotedText(bodyText), [bodyText])
  const textHasQuote = !!bodyText && mainText.length < bodyText.replace(/\s+$/, '').length

  const hasQuote = mode === 'html' && hasHtml ? splitHtml.hasQuote : textHasQuote
  const htmlToShow = showQuoted ? bodyHtml : splitHtml.main

  const measure = useCallback(() => {
    try {
      const doc = frameRef.current?.contentDocument
      if (!doc?.body) return
      // body height, not documentElement.scrollHeight — the latter never drops
      // below the current frame height, so the frame could grow but not shrink.
      const h = Math.max(doc.body.scrollHeight, Math.ceil(doc.body.getBoundingClientRect().height))
      setFrameHeight(h + 4)
    } catch {
      /* opaque origin — keep current height */
    }
  }, [])

  const onFrameLoad = useCallback(() => {
    observerRef.current?.disconnect()
    measure()
    try {
      const doc = frameRef.current?.contentDocument
      if (doc?.body && typeof ResizeObserver !== 'undefined') {
        // Re-measure as images load and when the pane width changes.
        const ro = new ResizeObserver(measure)
        ro.observe(doc.body)
        observerRef.current = ro
      }
    } catch {
      /* ignore */
    }
  }, [measure])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  useEffect(() => {
    if (mode !== 'html') return
    // Fallback in case the load event fired before the handler was attached.
    const t = setTimeout(onFrameLoad, 150)
    return () => clearTimeout(t)
  }, [mode, htmlToShow, onFrameLoad])

  const srcDoc = hasHtml
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html{color-scheme:light;overflow-y:hidden}body{margin:0;padding:8px 10px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;color:#111;background:#fff;word-break:break-word;overflow-x:auto;overflow-y:hidden}img{max-width:100%;height:auto}a{color:#1a56b0}</style></head><body>${htmlToShow}</body></html>`
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
          onLoad={onFrameLoad}
          scrolling="no"
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
          {(showQuoted ? bodyText : mainText) || (hasHtml ? '(no plain-text version)' : '')}
        </p>
      )}

      {hasQuote && (
        <button
          onClick={() => setShowQuoted((v) => !v)}
          title={showQuoted ? 'Hide quoted text' : 'Show quoted text'}
          style={{
            marginTop: '6px',
            background: 'var(--mail-accent-soft)',
            border: '1px solid var(--mail-border)',
            borderRadius: '8px',
            color: 'var(--mail-text-dim)',
            fontSize: '11px',
            lineHeight: 1,
            padding: '3px 9px',
            cursor: 'pointer',
          }}
        >
          {showQuoted ? 'Hide quoted text' : '•••'}
        </button>
      )}
    </div>
  )
}
