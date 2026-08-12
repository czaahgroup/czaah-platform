'use client'
// @ts-nocheck

import { useState, useEffect, useMemo, useCallback } from 'react'
import { paperworkForms, SECTORS, type PaperworkForm } from '@/lib/data/paperwork'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  registration: { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  license:      { bg: 'rgba(34,197,94,0.2)',  text: '#4ade80' },
  certificate:  { bg: 'rgba(201,168,76,0.2)', text: '#e6c364' },
  application:  { bg: 'rgba(168,85,247,0.2)', text: '#c084fc' },
  declaration:  { bg: 'rgba(251,146,60,0.2)', text: '#fb923c' },
  noc:          { bg: 'rgba(239,68,68,0.2)',   text: '#f87171' },
}

const STORAGE_KEY = 'czaah-paperwork-checked'

function loadChecked(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveChecked(checked: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checked))
}

/* ── FormCard ──────────────────────────────────────────────────── */

function FormCard({
  form,
  checkedItems,
  onToggle,
}: {
  form: PaperworkForm
  checkedItems: Record<string, boolean>
  onToggle: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_COLORS[form.category] || CATEGORY_COLORS.application

  const totalDocs = form.requiredDocuments.length
  const checkedCount = form.requiredDocuments.filter(
    (_, i) => checkedItems[`${form.id}-${i}`]
  ).length

  return (
    <div
      style={{
        background: '#0e0e0e',
        border: '1px solid rgba(77,70,55,0.25)',
        borderRadius: '0px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.3s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(77,70,55,0.25)')}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {form.name}
          </h3>
          <p
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              color: '#e6c364',
              margin: '4px 0 0',
            }}
          >
            {form.authority}
          </p>
        </div>
        <span
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: '0px',
            background: cat.bg,
            color: cat.text,
            whiteSpace: 'nowrap',
          }}
        >
          {form.category}
        </span>
      </div>

      {/* Purpose */}
      <p
        style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '13px',
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {form.purpose}
      </p>

      {/* Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          {form.estimatedTimeline}
        </span>
      </div>

      {/* Expandable required documents */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0px',
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
      >
        <span
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.5px',
          }}
        >
          Required Documents ({checkedCount}/{totalDocs})
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '4px 0',
          }}
        >
          {form.requiredDocuments.map((doc, i) => {
            const key = `${form.id}-${i}`
            const checked = !!checkedItems[key]
            return (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <span
                  onClick={(e) => {
                    e.preventDefault()
                    onToggle(key)
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '0px',
                    border: checked ? '2px solid #e6c364' : '2px solid rgba(201,168,76,0.4)',
                    background: checked ? '#e6c364' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '13px',
                    color: checked ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)',
                    textDecoration: checked ? 'line-through' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {doc}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
        {form.officialUrl && (
          <a
            href={form.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              color: '#e6c364',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '0px',
              border: '1px solid rgba(201,168,76,0.3)',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(201,168,76,0.1)'
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
            }}
          >
            Visit Authority Website
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
        <button
          disabled={!form.pdfAvailable}
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            color: form.pdfAvailable ? '#fff' : 'rgba(255,255,255,0.25)',
            background: form.pdfAvailable ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
            border: form.pdfAvailable ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(77,70,55,0.25)',
            padding: '8px 16px',
            borderRadius: '0px',
            cursor: form.pdfAvailable ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {form.pdfAvailable ? 'Download Form' : 'PDF Coming Soon'}
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */

export default function PaperworkPage() {
  const [activeSector, setActiveSector] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  // Load persisted checked state
  useEffect(() => {
    setCheckedItems(loadChecked())
  }, [])

  const handleToggle = useCallback((key: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      // Clean up falsy values
      if (!next[key]) delete next[key]
      saveChecked(next)
      return next
    })
  }, [])

  const filteredForms = useMemo(() => {
    let forms = paperworkForms

    if (activeSector !== 'All') {
      forms = forms.filter((f) => f.sector === activeSector)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      forms = forms.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.authority.toLowerCase().includes(q) ||
          f.purpose.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      )
    }

    return forms
  }, [activeSector, search])

  // Progress calculation
  const totalCheckboxes = filteredForms.reduce((sum, f) => sum + f.requiredDocuments.length, 0)
  const checkedCount = filteredForms.reduce(
    (sum, f) =>
      sum +
      f.requiredDocuments.filter((_, i) => checkedItems[`${f.id}-${i}`]).length,
    0
  )
  const progressPercent = totalCheckboxes > 0 ? (checkedCount / totalCheckboxes) * 100 : 0

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '28px',
            fontWeight: 600,
            color: '#fff',
            margin: 0,
            letterSpacing: '2px',
          }}
        >
          Paperwork & Forms
        </h1>
        <p
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
            margin: '8px 0 0',
            lineHeight: 1.6,
          }}
        >
          Pakistani regulatory forms, checklists, and authority links organized by sector.
        </p>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          background: '#0e0e0e',
          border: '1px solid rgba(77,70,55,0.25)',
          borderRadius: '0px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px',
            }}
          >
            Document Checklist Progress
          </span>
          <span
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              color: '#e6c364',
              fontWeight: 600,
            }}
          >
            {checkedCount} of {totalCheckboxes} items checked
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(77,70,55,0.25)',
            borderRadius: '0px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8a6f2e, #e6c364, #e8c97a)',
              borderRadius: '0px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search forms by name, authority, or purpose..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '14px',
            color: '#fff',
            background: '#131313',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0px',
            outline: 'none',
            transition: 'border-color 0.3s ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </div>

      {/* Sector Filter Pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '28px',
        }}
      >
        <button
          onClick={() => setActiveSector('All')}
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            fontWeight: activeSector === 'All' ? 600 : 400,
            letterSpacing: '0.5px',
            padding: '8px 16px',
            borderRadius: '0px',
            border: activeSector === 'All'
              ? '1px solid rgba(201,168,76,0.5)'
              : '1px solid rgba(255,255,255,0.08)',
            background: activeSector === 'All'
              ? 'rgba(201,168,76,0.12)'
              : 'transparent',
            color: activeSector === 'All' ? '#e6c364' : 'rgba(255,255,255,0.45)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          All Sectors ({paperworkForms.length})
        </button>
        {SECTORS.map((sector) => {
          const count = paperworkForms.filter((f) => f.sector === sector).length
          const isActive = activeSector === sector
          return (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
              style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.5px',
                padding: '8px 16px',
                borderRadius: '0px',
                border: isActive
                  ? '1px solid rgba(201,168,76,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isActive
                  ? 'rgba(201,168,76,0.12)'
                  : 'transparent',
                color: isActive ? '#e6c364' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {sector} ({count})
            </button>
          )
        })}
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            fontFamily: "'Raleway', sans-serif",
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px',
          }}
        >
          No forms found matching your criteria.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              checkedItems={checkedItems}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Footer count */}
      <div
        style={{
          marginTop: '32px',
          textAlign: 'center',
          fontFamily: "'Raleway', sans-serif",
          fontSize: '12px',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '1px',
        }}
      >
        Showing {filteredForms.length} of {paperworkForms.length} forms
      </div>
    </div>
  )
}
