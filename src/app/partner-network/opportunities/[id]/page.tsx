'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Sector { id: string; name: string }

const OPPORTUNITY_TYPES = [
  { value: 'buyer_required', label: 'Buyer Required' },
  { value: 'seller_supplier_available', label: 'Seller or Supplier Available' },
  { value: 'investor_required', label: 'Investor Required' },
  { value: 'investment_available', label: 'Investment Available' },
  { value: 'project_available', label: 'Project Available' },
  { value: 'joint_venture', label: 'Joint Venture' },
  { value: 'property_opportunity', label: 'Property Opportunity' },
  { value: 'recruitment_requirement', label: 'Recruitment Requirement' },
  { value: 'other', label: 'Other' },
]

const CONFIDENTIALITY_LEVELS = [
  { value: 'standard', label: 'Standard' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'highly_confidential', label: 'Highly Confidential' },
]

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

export default function EditOpportunityPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [sectors, setSectors] = useState<Sector[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [documents, setDocuments] = useState<{ id: string; file_name: string }[]>([])
  const [pendingUpload, setPendingUpload] = useState<{ fileName: string; fileData: string } | null>(null)

  const [form, setForm] = useState({
    title: '', sectorId: '', country: '', opportunityType: '', summary: '', description: '',
    estimatedValue: '', contactOrCompany: '', partnerRole: '', confidentialityLevel: 'standard',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/partner/sectors').then((r) => r.json()),
      fetch(`/api/partner/opportunities/${id}`).then((r) => r.json()),
    ])
      .then(([sectorsJson, oppJson]) => {
        if (oppJson.error) throw new Error(oppJson.error)
        setSectors(sectorsJson.data || [])
        const o = oppJson.data
        setForm({
          title: o.title || '', sectorId: o.sector_id || '', country: o.country || '',
          opportunityType: o.opportunity_type || '', summary: o.summary || '', description: o.description || '',
          estimatedValue: o.estimated_value || '', contactOrCompany: o.contact_or_company || '',
          partnerRole: o.partner_role || '', confidentialityLevel: o.confidentiality_level || 'standard',
        })
        setStatus(o.status)
        setDocuments(o.partner_opportunity_documents || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File exceeds the 10MB limit'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setPendingUpload({ fileName: file.name, fileData: base64 })
    }
    reader.readAsDataURL(file)
  }

  async function handleSave(submit: boolean) {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/partner/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submit }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')

      if (pendingUpload) {
        await fetch(`/api/partner/opportunities/${id}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingUpload),
        })
      }

      router.push('/partner-network/opportunities')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading...</div>
  if (error && !form.title) return <div className="text-red-400 py-12 text-center">{error}</div>

  return (
    <div>
      <Link href="/partner-network/opportunities" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors mb-4 inline-block">&larr; Back to My Opportunities</Link>
      <h1 className="cinzel-text text-2xl text-on-surface mb-6">Edit Opportunity</h1>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}

      <div className="flex flex-col gap-5 max-w-2xl">
        <div>
          <label className={labelClass}>Opportunity Title</label>
          <input type="text" className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Sector</label>
            <select className={inputClass} value={form.sectorId} onChange={(e) => setForm((f) => ({ ...f, sectorId: e.target.value }))}>
              <option value="">Select a sector...</option>
              {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input type="text" className={inputClass} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Opportunity Type</label>
          <select className={inputClass} value={form.opportunityType} onChange={(e) => setForm((f) => ({ ...f, opportunityType: e.target.value }))}>
            {OPPORTUNITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Short Summary</label>
          <textarea rows={2} className={`${inputClass} resize-none`} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
        </div>

        <div>
          <label className={labelClass}>Full Description</label>
          <textarea rows={5} className={`${inputClass} resize-none`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Estimated Value</label>
            <input type="text" className={inputClass} value={form.estimatedValue} onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Contact or Company Involved</label>
            <input type="text" className={inputClass} value={form.contactOrCompany} onChange={(e) => setForm((f) => ({ ...f, contactOrCompany: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Your Role in This Opportunity</label>
          <input type="text" className={inputClass} value={form.partnerRole} onChange={(e) => setForm((f) => ({ ...f, partnerRole: e.target.value }))} />
        </div>

        {documents.length > 0 && (
          <div>
            <label className={labelClass}>Existing Documents</label>
            <ul className="text-sm text-on-surface-variant/70 list-disc list-inside">
              {documents.map((d) => <li key={d.id}>{d.file_name}</li>)}
            </ul>
          </div>
        )}

        <div>
          <label className={labelClass}>Add Supporting Document <span className="normal-case text-on-surface-variant/40">(optional, up to 10MB)</span></label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="text-sm text-on-surface-variant" />
          {pendingUpload && <p className="text-xs text-primary mt-1">{pendingUpload.fileName} ready to upload</p>}
        </div>

        <div>
          <label className={labelClass}>Confidentiality Level</label>
          <select className={inputClass} value={form.confidentialityLevel} onChange={(e) => setForm((f) => ({ ...f, confidentialityLevel: e.target.value }))}>
            {CONFIDENTIALITY_LEVELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="text-sm px-5 py-2.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors disabled:opacity-40 raleway-text">
            Save Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="text-sm px-5 py-2.5 bg-primary text-on-primary disabled:opacity-40 transition-opacity raleway-text">
            {saving ? 'Submitting…' : status === 'more_info_required' ? 'Resubmit for Review' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
