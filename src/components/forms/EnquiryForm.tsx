'use client'

import { useState, useRef, useEffect } from 'react'

interface Sector {
  id: string
  name: string
}

interface EnquiryFormProps {
  sectorId?: string
  sectorName?: string
  serviceId?: string
  productId?: string
  productName?: string
  onSuccess?: () => void
}

const TIMELINE_OPTIONS = [
  { value: '', label: 'Select timeline' },
  { value: 'urgent', label: 'Urgent' },
  { value: '1_3_months', label: '1-3 Months' },
  { value: '3_6_months', label: '3-6 Months' },
  { value: '6_plus_months', label: '6+ Months' },
  { value: 'flexible', label: 'Flexible' },
]

export function EnquiryForm({
  sectorId: initialSectorId,
  sectorName,
  serviceId,
  productId,
  productName,
  onSuccess,
}: EnquiryFormProps) {
  const [product, setProduct] = useState(productName ?? '')
  const [sectorId, setSectorId] = useState(initialSectorId ?? '')
  const [sectors, setSectors] = useState<Sector[]>([])
  const [otherSector, setOtherSector] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [timeline, setTimeline] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ referenceNumber: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load sectors for dropdown
  useEffect(() => {
    if (initialSectorId) return
    async function loadSectors() {
      try {
        const res = await fetch('/api/sectors')
        if (res.ok) {
          const data = await res.json()
          setSectors(data || [])
        }
      } catch { /* sectors dropdown will be empty */ }
    }
    loadSectors()
  }, [initialSectorId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (selected) {
      setFiles((prev) => [...prev, ...Array.from(selected)])
    }
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Please describe your requirements')
      return
    }
    if (!sectorId && !initialSectorId) {
      setError('Please select a sector')
      return
    }
    if (sectorId === 'other' && !otherSector.trim()) {
      setError('Please specify your sector')
      return
    }
    if (!timeline) {
      setError('Please select a timeline')
      return
    }

    setSubmitting(true)

    try {
      // Convert files to base64
      const attachments = []
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1]) // Remove data:...;base64, prefix
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        attachments.push({ fileName: file.name, fileData: base64 })
      }

      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectorId: sectorId === 'other' ? null : (sectorId || initialSectorId),
          serviceId: serviceId || null,
          productId: productId || null,
          productName: product || 'General Enquiry',
          description,
          estimatedQuantity: quantity || null,
          timeline,
          additionalNotes: sectorId === 'other'
            ? `[Sector: ${otherSector.trim()}]${notes ? ' ' + notes : ''}`
            : (notes || null),
          attachments,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Failed to submit enquiry')
      }

      const data = await res.json()
      setSuccess({ referenceNumber: data.data?.reference_number ?? 'N/A' })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-czaah-card border border-czaah-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-czaah-success/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-czaah-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-[family-name:var(--font-heading)] text-czaah-white mb-2">
          Enquiry Submitted
        </h3>
        <p className="text-sm text-czaah-muted mb-4">
          Your enquiry has been received. Our team will review it and get back to you shortly.
        </p>
        <div className="inline-flex items-center gap-2 bg-czaah-elevated border border-czaah-border rounded-lg px-4 py-2">
          <span className="text-xs text-czaah-muted">Reference:</span>
          <span className="text-sm font-mono text-czaah-gold font-semibold">
            #{success.referenceNumber}
          </span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-czaah-card border border-czaah-border rounded-2xl p-6 sm:p-8">
      <h3 className="text-lg font-[family-name:var(--font-heading)] text-czaah-white mb-6">
        Submit an Enquiry
      </h3>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-900/20 border border-red-800/40 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Product/Service */}
        <div>
          <label className="block text-sm text-czaah-muted mb-1.5">
            Product / Service
          </label>
          {productName ? (
            <div className="px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white/80">
              {productName}
            </div>
          ) : (
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="What product or service are you enquiring about?"
              className="w-full px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white placeholder:text-czaah-muted-dim focus:outline-none focus:border-czaah-gold/50 transition-colors"
            />
          )}
        </div>

        {/* Sector */}
        <div>
          <label className="block text-sm text-czaah-muted mb-1.5">
            Sector <span className="text-czaah-danger">*</span>
          </label>
          {sectorName ? (
            <div className="px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white/80">
              {sectorName}
            </div>
          ) : (
            <>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white focus:outline-none focus:border-czaah-gold/50 transition-colors"
              >
                <option value="">Select a sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="other">Other</option>
              </select>
              {sectorId === 'other' && (
                <input
                  type="text"
                  value={otherSector}
                  onChange={(e) => setOtherSector(e.target.value)}
                  placeholder="Please specify your sector"
                  className="w-full mt-2 px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white placeholder:text-czaah-muted-dim focus:outline-none focus:border-czaah-gold/50 transition-colors"
                />
              )}
            </>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-czaah-muted mb-1.5">
            What do you need? <span className="text-czaah-danger">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe your requirements in detail..."
            className="w-full px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white placeholder:text-czaah-muted-dim focus:outline-none focus:border-czaah-gold/50 transition-colors resize-none"
          />
        </div>

        {/* Quantity + Timeline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm text-czaah-muted mb-1.5">
              Estimated Quantity
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 500 units, 10 tonnes"
              className="w-full px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white placeholder:text-czaah-muted-dim focus:outline-none focus:border-czaah-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-czaah-muted mb-1.5">
              Timeline <span className="text-czaah-danger">*</span>
            </label>
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white focus:outline-none focus:border-czaah-gold/50 transition-colors"
            >
              {TIMELINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional notes */}
        <div>
          <label className="block text-sm text-czaah-muted mb-1.5">
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional information..."
            className="w-full px-4 py-2.5 rounded-lg bg-czaah-elevated border border-czaah-border text-sm text-czaah-white placeholder:text-czaah-muted-dim focus:outline-none focus:border-czaah-gold/50 transition-colors resize-none"
          />
        </div>

        {/* File attachments */}
        <div>
          <label className="block text-sm text-czaah-muted mb-1.5">
            Attachments
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-4 rounded-lg border border-dashed border-czaah-border hover:border-czaah-gold/30 bg-czaah-elevated cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5 text-czaah-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <span className="text-sm text-czaah-muted">Click to upload files</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-czaah-elevated border border-czaah-border"
                >
                  <svg className="w-4 h-4 text-czaah-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-sm text-czaah-muted truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-czaah-muted-dim shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-czaah-muted hover:text-czaah-danger transition-colors"
                    aria-label="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !description.trim()}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-czaah-gold hover:bg-czaah-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-czaah-black font-semibold text-sm py-3 px-6 rounded-lg transition-colors"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-czaah-black/30 border-t-czaah-black rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Enquiry'
        )}
      </button>
    </form>
  )
}
