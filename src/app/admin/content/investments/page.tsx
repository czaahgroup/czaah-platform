'use client'
// @ts-nocheck

import { useEffect, useState, useCallback, useRef } from 'react'


interface Investment {
  id: string
  title: string
  sector_tag: string | null
  status: string
  min_investment_amount: number | null
  currency: string
  target_return: string | null
  investment_timeline: string | null
  description: string | null
  key_highlights: string[]
  location: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

interface InvestmentDoc {
  id: string
  document_type: string
  file_url: string
  file_name: string
  uploaded_at: string
}

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

const STATUS_TABS = ['All', 'Draft', 'Published', 'Closing Soon', 'Closed'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-neutral-500/20 text-neutral-400',
  published: 'bg-green-500/20 text-green-400',
  closing_soon: 'bg-orange-500/20 text-orange-400',
  closed: 'bg-red-500/20 text-red-400',
  fully_subscribed: 'bg-blue-500/20 text-blue-400',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null || amount === undefined) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(empty)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StatusTab>('All')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [existingDocs, setExistingDocs] = useState<InvestmentDoc[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/investments')
      if (!res.ok) throw new Error('Failed to load investments')
      const data = await res.json()
      setInvestments(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = investments.filter((inv) => {
    if (activeTab === 'All') return true
    const tabStatus = activeTab.toLowerCase().replace(/ /g, '_')
    return inv.status === tabStatus
  })

  function openAdd() {
    setEditId(null)
    setForm(empty)
    setPendingFiles([])
    setExistingDocs([])
    setShowForm(true)
    setError(null)
  }

  async function openEdit(inv: Investment) {
    setEditId(inv.id)
    setForm({
      title: inv.title,
      sector_tag: inv.sector_tag || '',
      description: inv.description || '',
      min_investment_amount: inv.min_investment_amount?.toString() || '',
      currency: inv.currency || 'USD',
      target_return: inv.target_return || '',
      investment_timeline: inv.investment_timeline || '',
      location: inv.location || '',
      key_highlights: (inv.key_highlights || []).join(', '),
    })
    setPendingFiles([])
    setShowForm(true)
    setError(null)
    // Load existing documents
    try {
      const res = await fetch(`/api/admin/investments/${inv.id}`)
      if (res.ok) {
        const data = await res.json()
        setExistingDocs(data.documents || [])
      }
    } catch {
      setExistingDocs([])
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setError(null)
    setPendingFiles([])
    setExistingDocs([])
  }

  async function handleSave() {
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
        title: form.title,
        sector_tag: form.sector_tag || null,
        description: form.description || null,
        min_investment_amount: form.min_investment_amount ? parseFloat(form.min_investment_amount) : null,
        currency: form.currency || 'USD',
        target_return: form.target_return || null,
        investment_timeline: form.investment_timeline || null,
        location: form.location || null,
        key_highlights: highlights,
      }

      const url = editId ? `/api/admin/investments/${editId}` : '/api/admin/investments'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      const savedInvestment = await res.json()
      const investmentId = editId || savedInvestment.id

      // Upload pending files
      if (pendingFiles.length > 0 && investmentId) {
        setUploadingFiles(true)
        for (const file of pendingFiles) {
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          await fetch(`/api/admin/investments/${investmentId}/documents`, {
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
        setUploadingFiles(false)
      }

      closeForm()
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
      setUploadingFiles(false)
    }
  }

  async function handleDeleteDoc(docId: string, investmentId: string) {
    try {
      const res = await fetch(`/api/admin/investments/${investmentId}/documents?docId=${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setExistingDocs((prev) => prev.filter((d) => d.id !== docId))
      }
    } catch { /* silent */ }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/investments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Status change failed')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status change failed')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/investments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      setDeleteConfirm(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading investments...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Investments</h1>
          <button
            onClick={() => { window.open('/api/admin/export?type=investments', '_blank') }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 0,
              padding: '6px 14px',
              color: '#C9A84C',
              fontFamily: "'Raleway', sans-serif",
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export CSV
          </button>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-on-primary font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-primary/90 transition-colors"
        >
          + Add Investment
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-nonetext-sm whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between sticky top-0 bg-surface-container-low">
              <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">
                {editId ? 'Edit Investment' : 'Add Investment'}
              </h2>
              <button onClick={closeForm} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">&times;</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-nonepx-3 py-2">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                  placeholder="e.g. Lagos Waterfront Development"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Sector Tag</label>
                  <input
                    type="text"
                    value={form.sector_tag}
                    onChange={(e) => setForm((f) => ({ ...f, sector_tag: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="e.g. Real Estate"
                  />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="e.g. Lagos, Nigeria"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm resize-none h-24"
                  placeholder="Investment opportunity description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Min Investment</label>
                  <input
                    type="number"
                    value={form.min_investment_amount}
                    onChange={(e) => setForm((f) => ({ ...f, min_investment_amount: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                    <option value="NGN">NGN</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Target Return</label>
                  <input
                    type="text"
                    value={form.target_return}
                    onChange={(e) => setForm((f) => ({ ...f, target_return: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="e.g. 15-20% IRR"
                  />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1.5">Timeline</label>
                  <input
                    type="text"
                    value={form.investment_timeline}
                    onChange={(e) => setForm((f) => ({ ...f, investment_timeline: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                    placeholder="e.g. 3-5 Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Key Highlights (comma-separated)</label>
                <input
                  type="text"
                  value={form.key_highlights}
                  onChange={(e) => setForm((f) => ({ ...f, key_highlights: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
                  placeholder="e.g. Prime location, Government-backed, High demand"
                />
              </div>

              {/* Documents */}
              <div>
                <label className="block text-sm text-on-surface-variant mb-1.5">Documents (PDF, DOCX, XLSX)</label>

                {/* Existing documents */}
                {existingDocs.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {existingDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span className="text-sm text-on-surface truncate">{doc.file_name}</span>
                          <span className="text-xs text-on-surface-variant/50 shrink-0">({doc.document_type})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => editId && handleDeleteDoc(doc.id, editId)}
                          className="text-on-surface-variant hover:text-red-400 transition-colors shrink-0 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending files */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {pendingFiles.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="flex items-center justify-between bg-surface-container border border-primary/20 rounded-nonepx-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                          </svg>
                          <span className="text-sm text-on-surface truncate">{file.name}</span>
                          <span className="text-xs text-on-surface-variant/50 shrink-0">({(file.size / 1024).toFixed(0)} KB — pending upload)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-on-surface-variant hover:text-red-400 transition-colors shrink-0 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
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
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-noneborder border-dashed border-outline-variant/10 hover:border-primary/30 bg-surface-container-lowest cursor-pointer transition-colors"
                >
                  <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-sm text-on-surface-variant">Add documents</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/10 flex gap-3 justify-end sticky bottom-0 bg-surface-container-low">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-nonetext-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 hover:border-primary/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-on-primary font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingFiles ? 'Uploading files...' : saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-sm mx-4 p-6">
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-2">Confirm Delete</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to delete this investment? This will also remove all associated documents and images. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-nonetext-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-error text-white font-semibold px-5 py-2 rounded-nonetext-sm hover:bg-error/80 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">
            {activeTab === 'All'
              ? 'No investments yet. Add your first investment opportunity to get started.'
              : `No ${activeTab.toLowerCase()} investments.`}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Title</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Sector</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Min Investment</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-outline-variant/10/50 hover:bg-surface-container-lowest/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-on-surface font-medium">{inv.title}</span>
                      {inv.location && (
                        <span className="block text-xs text-on-surface-variant/50 mt-0.5">{inv.location}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {inv.sector_tag ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{inv.sector_tag}</span>
                      ) : (
                        <span className="text-on-surface-variant/50">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-none${STATUS_BADGES[inv.status] || ''}`}>
                        {formatStatus(inv.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant text-xs">
                      {formatCurrency(inv.min_investment_amount, inv.currency)}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant/50 text-xs">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status change buttons */}
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(inv.id, 'published')}
                            className="text-xs text-green-400 hover:text-green-300 transition-colors px-2 py-1"
                          >
                            Publish
                          </button>
                        )}
                        {inv.status === 'published' && (
                          <button
                            onClick={() => handleStatusChange(inv.id, 'closing_soon')}
                            className="text-xs text-orange-400 hover:text-orange-300 transition-colors px-2 py-1"
                          >
                            Closing Soon
                          </button>
                        )}
                        {(inv.status === 'published' || inv.status === 'closing_soon') && (
                          <button
                            onClick={() => handleStatusChange(inv.id, 'closed')}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
                          >
                            Close
                          </button>
                        )}
                        {(inv.status === 'published' || inv.status === 'closing_soon') && (
                          <button
                            onClick={() => handleStatusChange(inv.id, 'draft')}
                            className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors px-2 py-1"
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(inv)}
                          className="text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(inv.id)}
                          className="text-xs text-error/70 hover:text-error transition-colors px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
