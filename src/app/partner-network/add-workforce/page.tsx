'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

const TRADE_CATEGORIES = ['Construction', 'Oil & Gas', 'Healthcare', 'IT & Telecom', 'Hospitality', 'Manufacturing', 'Security', 'Mining', 'Agriculture', 'Transportation', 'Other']
const DESTINATIONS = ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Pakistan', 'Other']
const AVAILABILITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'within_30_days', label: 'Within 30 days' },
  { value: 'within_60_days', label: 'Within 60 days' },
  { value: 'within_90_days', label: 'Within 90 days' },
]
const PASSPORT_OPTIONS = [
  { value: 'valid', label: 'Valid passport' },
  { value: 'expired', label: 'Expired / Need renewal' },
  { value: 'none', label: 'No passport' },
]
const MEDICAL_OPTIONS = [
  { value: 'gamca_cleared', label: 'GAMCA cleared' },
  { value: 'other_medical', label: 'Other medical done' },
  { value: 'not_done', label: 'Not yet done' },
]

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

const STATUS_BADGES: Record<string, string> = {
  registered: 'bg-yellow-500/20 text-yellow-400',
  shortlisted: 'bg-blue-500/20 text-blue-400',
  placed: 'bg-green-500/20 text-green-400',
  inactive: 'bg-neutral-500/20 text-neutral-400',
}

const emptyForm = {
  fullName: '', email: '', phone: '', nationality: '', currentLocation: '',
  tradeCategory: '', specificRole: '', yearsExperience: 0, certifications: '',
  preferredDestinations: [] as string[], availability: 'immediate',
  passportStatus: 'valid', medicalStatus: 'not_done', notes: '',
}

export default function AddWorkforcePage() {
  const [form, setForm] = useState(emptyForm)
  const [candidates, setCandidates] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadCandidates()
  }, [])

  function loadCandidates() {
    fetch('/api/partner/workforce')
      .then((r) => r.json())
      .then((json) => setCandidates(json.data || []))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }

  function toggleDestination(dest: string) {
    setForm((f) => ({
      ...f,
      preferredDestinations: f.preferredDestinations.includes(dest)
        ? f.preferredDestinations.filter((d) => d !== dest)
        : [...f.preferredDestinations, dest],
    }))
  }

  async function handleSubmit() {
    if (!form.fullName || !form.email || !form.phone || !form.nationality || !form.currentLocation || !form.tradeCategory || !form.specificRole) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/partner/workforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit candidate')
      setForm(emptyForm)
      setSuccess(true)
      loadCandidates()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="cinzel-text text-2xl text-on-surface mb-2">Add Workforce</h1>
      <p className="raleway-text text-sm text-on-surface-variant/60 mb-6">Introduce a candidate to CZAAH. No account or password is needed for them — our team reviews every submission.</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}
      {success && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-6"><p className="text-sm text-green-400">Candidate submitted for review.</p></div>}

      <div className="flex flex-col gap-5 max-w-2xl mb-12">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" className={inputClass} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Nationality</label>
            <input type="text" className={inputClass} value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Current Location</label>
          <input type="text" className={inputClass} value={form.currentLocation} onChange={(e) => setForm((f) => ({ ...f, currentLocation: e.target.value }))} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Trade Category</label>
            <select className={inputClass} value={form.tradeCategory} onChange={(e) => setForm((f) => ({ ...f, tradeCategory: e.target.value }))}>
              <option value="">Select trade category...</option>
              {TRADE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Specific Role</label>
            <input type="text" placeholder='e.g. "Welder", "Staff Nurse"' className={inputClass} value={form.specificRole} onChange={(e) => setForm((f) => ({ ...f, specificRole: e.target.value }))} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Years of Experience</label>
            <input type="number" min={0} max={50} className={inputClass} value={form.yearsExperience} onChange={(e) => setForm((f) => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={labelClass}>Certifications</label>
            <input type="text" placeholder='e.g. "AWS Welding, NEBOSH"' className={inputClass} value={form.certifications} onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Preferred Destinations</label>
          <div className="flex flex-wrap gap-2">
            {DESTINATIONS.map((dest) => (
              <button
                type="button"
                key={dest}
                onClick={() => toggleDestination(dest)}
                className={`text-xs px-3 py-1.5 border transition-colors ${
                  form.preferredDestinations.includes(dest) ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                {dest}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Availability</label>
          <select className={inputClass} value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}>
            {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Passport Status</label>
            <select className={inputClass} value={form.passportStatus} onChange={(e) => setForm((f) => ({ ...f, passportStatus: e.target.value }))}>
              {PASSPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Medical Status</label>
            <select className={inputClass} value={form.medicalStatus} onChange={(e) => setForm((f) => ({ ...f, medicalStatus: e.target.value }))}>
              {MEDICAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={3} className={`${inputClass} resize-none`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>

        <button onClick={handleSubmit} disabled={saving} className="self-start text-sm px-5 py-2.5 bg-primary text-on-primary disabled:opacity-40 transition-opacity raleway-text">
          {saving ? 'Submitting…' : 'Submit Candidate'}
        </button>
      </div>

      <h2 className="cinzel-text text-lg text-on-surface mb-4">My Submitted Candidates</h2>
      {loadingList ? (
        <p className="text-on-surface-variant/50 text-sm">Loading…</p>
      ) : candidates.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant/10 px-6 py-10 text-center">
          <p className="text-on-surface-variant text-sm">No candidates submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <div key={c.id} className="bg-surface-container border border-outline-variant/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-medium text-on-surface">{c.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 ${STATUS_BADGES[c.status] || ''}`}>{c.status}</span>
                </div>
                <div className="text-xs text-on-surface-variant/60">{c.trade_category} · {c.specific_role} · {c.years_experience} yrs experience</div>
              </div>
              <div className="text-xs text-on-surface-variant/40">{new Date(c.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
