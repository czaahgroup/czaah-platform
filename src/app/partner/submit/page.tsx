'use client'
// @ts-nocheck

import { useState, useRef } from 'react'
import Link from 'next/link'

interface FormData {
  title: string
  sector_tag: string
  description: string
  min_investment_amount: string
  currency: string
  target_return: string
  investment_timeline: string
  location: string
  key_highlights: string
}

const empty: FormData = {
  title: '',
  sector_tag: '',
  description: '',
  min_investment_amount: '',
  currency: 'USD',
  target_return: '',
  investment_timeline: '',
  location: '',
  key_highlights: '',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0e0e0e',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 0,
  padding: '10px 14px',
  color: '#fff',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.3s ease',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '12px',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: '6px',
  letterSpacing: '0.5px',
}

export default function SubmitDealPage() {
  const [form, setForm] = useState<FormData>(empty)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const highlights = form.key_highlights
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean)

      const payload = {
        title: form.title.trim(),
        sector_tag: form.sector_tag || null,
        description: form.description || null,
        min_investment_amount: form.min_investment_amount || null,
        currency: form.currency || 'USD',
        target_return: form.target_return || null,
        investment_timeline: form.investment_timeline || null,
        location: form.location || null,
        key_highlights: highlights,
      }

      const res = await fetch('/api/partner/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create deal')
      }

      const deal = await res.json()

      // Upload pending files
      if (pendingFiles.length > 0 && deal.id) {
        setUploading(true)
        for (const file of pendingFiles) {
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          await fetch(`/api/partner/deals/${deal.id}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64,
              documentType: file.name.toLowerCase().includes('teaser') ? 'teaser'
                : file.name.toLowerCase().includes('prospectus') ? 'prospectus'
                : file.name.toLowerCase().includes('due') ? 'due_diligence'
                : 'other',
            }),
          })
        }
        setUploading(false)
      }

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 24px',
          borderRadius: '50%',
          background: 'rgba(34,197,94,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: '#22c55e',
        }}>&#10003;</div>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '22px',
          color: '#fff',
          margin: '0 0 12px',
        }}>Deal Submitted Successfully</h2>
        <p style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '14px',
          color: 'rgba(255,255,255,0.4)',
          margin: '0 0 32px',
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Your investment deal has been submitted for review. The admin team will review it and you will be notified once a decision is made.
        </p>
        <Link
          href="/partner"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
            color: '#000',
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 600,
            fontSize: '13px',
            padding: '10px 24px',
            borderRadius: 0,
            textDecoration: 'none',
          }}
        >
          View My Deals
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '24px',
        color: '#fff',
        margin: '0 0 8px',
      }}>Submit New Deal</h1>
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '14px',
        color: 'rgba(255,255,255,0.4)',
        margin: '0 0 32px',
      }}>Submit an investment opportunity for admin review and approval.</p>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 0,
          padding: '12px 16px',
          marginBottom: '24px',
        }}>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#ef4444', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{
        background: '#1c1b1b',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 0,
        padding: '32px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Lagos Waterfront Development"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            />
          </div>

          {/* Sector + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Sector Tag</label>
              <input
                type="text"
                value={form.sector_tag}
                onChange={(e) => update('sector_tag', e.target.value)}
                placeholder="e.g. Real Estate"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe the investment opportunity..."
              style={{ ...inputStyle, height: '100px', resize: 'none' as const }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            />
          </div>

          {/* Min Investment + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Minimum Investment</label>
              <input
                type="number"
                value={form.min_investment_amount}
                onChange={(e) => update('min_investment_amount', e.target.value)}
                placeholder="e.g. 50000"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                style={inputStyle}
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="AED">AED</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
          </div>

          {/* Target Return + Timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Target Return</label>
              <input
                type="text"
                value={form.target_return}
                onChange={(e) => update('target_return', e.target.value)}
                placeholder="e.g. 15-20% IRR"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Investment Timeline</label>
              <input
                type="text"
                value={form.investment_timeline}
                onChange={(e) => update('investment_timeline', e.target.value)}
                placeholder="e.g. 3-5 Years"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              />
            </div>
          </div>

          {/* Key Highlights */}
          <div>
            <label style={labelStyle}>Key Highlights (comma-separated)</label>
            <input
              type="text"
              value={form.key_highlights}
              onChange={(e) => update('key_highlights', e.target.value)}
              placeholder="e.g. Prime location, Government-backed, High demand"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            />
          </div>

          {/* Documents */}
          <div>
            <label style={labelStyle}>Documents (PDF, DOCX, XLSX)</label>

            {pendingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {pendingFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#0e0e0e',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: 0,
                    padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ color: '#C9A84C', fontSize: '14px' }}>&#128196;</span>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '13px',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{file.name}</span>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)',
                        flexShrink: 0,
                      }}>({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '0 4px',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >&times;</button>
                  </div>
                ))}
              </div>
            )}

            <input
              key={pendingFiles.length}
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => {
                const selected = e.target.files
                if (selected && selected.length > 0) {
                  setPendingFiles((prev) => [...prev, ...Array.from(selected)])
                }
              }}
              style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}
            />
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                  fileInputRef.current.click()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: 0,
                border: '1px dashed rgba(255,255,255,0.1)',
                background: '#0e0e0e',
                cursor: 'pointer',
                transition: 'border-color 0.3s ease',
                width: '100%',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.4)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              + Add documents
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link
            href="/partner"
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              padding: '10px 20px',
              borderRadius: 0,
              border: '1px solid rgba(255,255,255,0.06)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
            }}
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            style={{
              background: saving || uploading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
              color: '#000',
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 600,
              fontSize: '13px',
              padding: '10px 24px',
              borderRadius: 0,
              border: 'none',
              cursor: saving || uploading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.3s ease',
            }}
          >
            {uploading ? 'Uploading files...' : saving ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
