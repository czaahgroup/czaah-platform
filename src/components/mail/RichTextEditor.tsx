'use client'
// @ts-nocheck

import { useEffect, useRef } from 'react'

/**
 * Minimal rich-text editor for composing mail. Uses document.execCommand —
 * deprecated but still the lightest cross-browser way to get bold/italic/
 * lists/links without pulling in a full editor bundle. Emits HTML via onChange.
 */
const BTNS: { cmd: string; label: string }[] = [
  { cmd: 'bold', label: 'B' },
  { cmd: 'italic', label: 'I' },
  { cmd: 'underline', label: 'U' },
  { cmd: 'insertUnorderedList', label: '• List' },
  { cmd: 'insertOrderedList', label: '1. List' },
]

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Only sync in from props when the editor doesn't have focus (avoids
  // clobbering the caret while typing).
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  function run(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg)
    ref.current?.focus()
    onChange(ref.current?.innerHTML || '')
  }

  return (
    <div className="czaah-mail" style={{ border: '1px solid var(--mail-border)', background: 'var(--mail-panel)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', gap: '2px', padding: '6px', borderBottom: '1px solid var(--mail-border)', flexWrap: 'wrap' }}>
        {BTNS.map((b) => (
          <button
            key={b.cmd}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); run(b.cmd) }}
            style={{
              background: 'transparent',
              border: '1px solid var(--mail-border)',
              color: 'var(--mail-text-dim)',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              fontWeight: b.cmd === 'bold' ? 700 : 400,
              fontStyle: b.cmd === 'italic' ? 'italic' : 'normal',
              textDecoration: b.cmd === 'underline' ? 'underline' : 'none',
              padding: '3px 8px',
              cursor: 'pointer',
            }}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            const url = window.prompt('Link URL')
            if (url) run('createLink', url)
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--mail-border)',
            color: 'var(--mail-text-dim)',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '11px',
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ''}
        onInput={() => onChange(ref.current?.innerHTML || '')}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: '340px',
          overflowY: 'auto',
          padding: '10px 14px',
          color: 'var(--mail-text)',
          fontFamily: "'Raleway', sans-serif",
          fontSize: '13px',
          lineHeight: 1.6,
          outline: 'none',
        }}
      />
      <style>{`
        .czaah-mail [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: var(--mail-text-faint);
        }
        .czaah-mail [contenteditable] a { color: var(--mail-accent); }
      `}</style>
    </div>
  )
}
