'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: string
  link: string
}

interface SearchResults {
  members: SearchResult[]
  enquiries: SearchResult[]
  investments: SearchResult[]
  sectors: SearchResult[]
  services: SearchResult[]
}

const TYPE_ICONS: Record<string, string> = {
  member: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  enquiry: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  investment: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  sector: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  service: 'M11.42 15.17l-5.658-5.656a8.012 8.012 0 01-.788-.965 6 6 0 01.526-7.07c2.344-2.344 6.055-2.587 8.612-.73l.174.135a8.012 8.012 0 01.966.788l5.656 5.657a2.25 2.25 0 11-3.182 3.182l-1.06-1.06-3.18 3.18a2.25 2.25 0 11-3.182-3.182l3.18-3.18-1.768-1.768-3.18 3.18a2.25 2.25 0 01-3.182 0z',
}

const SECTION_LABELS: Record<string, string> = {
  members: 'Members',
  enquiries: 'Enquiries',
  investments: 'Investments',
  sectors: 'Sectors',
  services: 'Services',
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults(null)
    }
  }, [isOpen])

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Ctrl+K / Cmd+K to open (handled from parent but also close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  function handleSelect(result: SearchResult) {
    onClose()
    router.push(result.link)
  }

  const hasResults = results && Object.values(results).some((arr) => arr.length > 0)
  const noResults = results && !hasResults && query.length >= 2

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: '0 16px',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: '#080808',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '12px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.6)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, enquiries, investments, sectors..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '15px',
              letterSpacing: '0.3px',
            }}
          />
          <kbd
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        {(loading || hasResults || noResults) && (
          <div
            style={{
              marginTop: '8px',
              background: '#080808',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {loading && !results && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(201,168,76,0.3)',
                  borderTopColor: '#C9A84C',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  margin: '0 auto',
                }} />
              </div>
            )}

            {noResults && (
              <div style={{
                padding: '32px 24px',
                textAlign: 'center',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '14px',
                color: 'rgba(255,255,255,0.4)',
              }}>
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {hasResults && results && (
              <div>
                {(Object.keys(SECTION_LABELS) as Array<keyof SearchResults>).map((key) => {
                  const items = results[key]
                  if (!items || items.length === 0) return null
                  return (
                    <div key={key}>
                      <div style={{
                        padding: '10px 20px 6px',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '10px',
                        letterSpacing: '2.5px',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)',
                      }}>
                        {SECTION_LABELS[key]}
                      </div>
                      {items.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%',
                            padding: '10px 20px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(201,168,76,0.5)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={TYPE_ICONS[result.type] || TYPE_ICONS.service} />
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: "'Raleway', sans-serif",
                              fontSize: '14px',
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div style={{
                                fontFamily: "'Raleway', sans-serif",
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.35)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginTop: '1px',
                              }}>
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
