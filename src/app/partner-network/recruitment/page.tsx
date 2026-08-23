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
const HIRING_TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'within_30_days', label: 'Within 30 days' },
  { value: 'within_60_days', label: 'Within 60 days' },
  { value: 'within_90_days', label: 'Within 90 days' },
]

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

const TABS = [
  { key: 'worker', label: 'Worker Candidate' },
  { key: 'employer', label: 'Employer' },
  { key: 'oep', label: 'Employment Promoter' },
]

const emptyWorkerForm = {
  fullName: '', email: '', phone: '', nationality: '', currentLocation: '',
  tradeCategory: '', specificRole: '', yearsExperience: 0, certifications: '',
  preferredDestinations: [] as string[], availability: 'immediate',
  passportStatus: 'valid', medicalStatus: 'not_done', notes: '',
}

const emptyEmployerForm = {
  companyName: '', contactPerson: '', email: '', phone: '', country: '', industry: '',
  rolesNeeded: '', workersNeeded: 1, hiringTimeline: 'immediate',
  preferredNationalities: '', notes: '',
}

const emptyOepForm = {
  companyName: '', licenseNumber: '', contactPerson: '', email: '', phone: '', headOfficeLocation: '',
  yearsInOperation: 0, sectorsSpecialization: '', destinationCountries: '',
  monthlyPlacementCapacity: '', companyWebsite: '', notes: '',
}

const WORKER_STATUS_BADGES: Record<string, string> = {
  registered: 'bg-yellow-500/20 text-yellow-400',
  shortlisted: 'bg-blue-500/20 text-blue-400',
  placed: 'bg-green-500/20 text-green-400',
  inactive: 'bg-neutral-500/20 text-neutral-400',
}
const OEP_STATUS_BADGES: Record<string, string> = {
  registered: 'bg-yellow-500/20 text-yellow-400',
  contacted: 'bg-blue-500/20 text-blue-400',
  verified: 'bg-green-500/20 text-green-400',
  inactive: 'bg-neutral-500/20 text-neutral-400',
}

export default function RecruitmentPage() {
  const [tab, setTab] = useState<'worker' | 'employer' | 'oep'>('worker')

  const [workerForm, setWorkerForm] = useState(emptyWorkerForm)
  const [employerForm, setEmployerForm] = useState(emptyEmployerForm)
  const [oepForm, setOepForm] = useState(emptyOepForm)

  const [workers, setWorkers] = useState<any[]>([])
  const [employers, setEmployers] = useState<any[]>([])
  const [oeps, setOeps] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  function loadAll() {
    setLoadingList(true)
    Promise.all([
      fetch('/api/partner/workforce').then((r) => r.json()),
      fetch('/api/partner/employers').then((r) => r.json()),
      fetch('/api/partner/oep').then((r) => r.json()),
    ])
      .then(([w, e, o]) => {
        setWorkers(w.data || [])
        setEmployers(e.data || [])
        setOeps(o.data || [])
      })
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }

  function toggleDestination(dest: string) {
    setWorkerForm((f) => ({
      ...f,
      preferredDestinations: f.preferredDestinations.includes(dest)
        ? f.preferredDestinations.filter((d) => d !== dest)
        : [...f.preferredDestinations, dest],
    }))
  }

  async function submitWorker() {
    if (!workerForm.fullName || !workerForm.email || !workerForm.phone || !workerForm.nationality || !workerForm.currentLocation || !workerForm.tradeCategory || !workerForm.specificRole) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null); setSuccess(false); setSaving(true)
    try {
      const res = await fetch('/api/partner/workforce', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workerForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit candidate')
      setWorkerForm(emptyWorkerForm)
      setSuccess(true)
      loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function submitEmployer() {
    if (!employerForm.companyName || !employerForm.contactPerson || !employerForm.email || !employerForm.phone || !employerForm.country || !employerForm.industry || !employerForm.rolesNeeded) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null); setSuccess(false); setSaving(true)
    try {
      const res = await fetch('/api/partner/employers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employerForm,
          preferredNationalities: employerForm.preferredNationalities
            ? employerForm.preferredNationalities.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit employer')
      setEmployerForm(emptyEmployerForm)
      setSuccess(true)
      loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function submitOep() {
    if (!oepForm.companyName || !oepForm.licenseNumber || !oepForm.contactPerson || !oepForm.email || !oepForm.phone || !oepForm.headOfficeLocation) {
      setError('Please fill in all required fields.')
      return
    }
    setError(null); setSuccess(false); setSaving(true)
    try {
      const res = await fetch('/api/partner/oep', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...oepForm,
          sectorsSpecialization: oepForm.sectorsSpecialization
            ? oepForm.sectorsSpecialization.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          destinationCountries: oepForm.destinationCountries
            ? oepForm.destinationCountries.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          monthlyPlacementCapacity: oepForm.monthlyPlacementCapacity ? Number(oepForm.monthlyPlacementCapacity) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit Employment Promoter')
      setOepForm(emptyOepForm)
      setSuccess(true)
      loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="cinzel-text text-2xl text-on-surface mb-2">Recruitment</h1>
      <p className="raleway-text text-sm text-on-surface-variant/60 mb-6">Introduce a worker candidate, employer, or employment promoter to CZAAH. No account or password is needed for them — our team reviews every submission.</p>

      <div className="flex gap-1 mb-6 border-b border-outline-variant/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as any); setError(null); setSuccess(false) }}
            className={`text-sm px-4 py-2.5 raleway-text border-b-2 transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}
      {success && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-6"><p className="text-sm text-green-400">Submitted for review.</p></div>}

      {tab === 'worker' && (
        <div className="flex flex-col gap-5 max-w-2xl mb-12">
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Full Name</label><input type="text" className={inputClass} value={workerForm.fullName} onChange={(e) => setWorkerForm((f) => ({ ...f, fullName: e.target.value }))} /></div>
            <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={workerForm.email} onChange={(e) => setWorkerForm((f) => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Phone</label><input type="text" className={inputClass} value={workerForm.phone} onChange={(e) => setWorkerForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className={labelClass}>Nationality</label><input type="text" className={inputClass} value={workerForm.nationality} onChange={(e) => setWorkerForm((f) => ({ ...f, nationality: e.target.value }))} /></div>
          </div>
          <div><label className={labelClass}>Current Location</label><input type="text" className={inputClass} value={workerForm.currentLocation} onChange={(e) => setWorkerForm((f) => ({ ...f, currentLocation: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Trade Category</label>
              <select className={inputClass} value={workerForm.tradeCategory} onChange={(e) => setWorkerForm((f) => ({ ...f, tradeCategory: e.target.value }))}>
                <option value="">Select trade category...</option>
                {TRADE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Specific Role</label><input type="text" placeholder='e.g. "Welder", "Staff Nurse"' className={inputClass} value={workerForm.specificRole} onChange={(e) => setWorkerForm((f) => ({ ...f, specificRole: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Years of Experience</label><input type="number" min={0} max={50} className={inputClass} value={workerForm.yearsExperience} onChange={(e) => setWorkerForm((f) => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} /></div>
            <div><label className={labelClass}>Certifications</label><input type="text" placeholder='e.g. "AWS Welding, NEBOSH"' className={inputClass} value={workerForm.certifications} onChange={(e) => setWorkerForm((f) => ({ ...f, certifications: e.target.value }))} /></div>
          </div>
          <div>
            <label className={labelClass}>Preferred Destinations</label>
            <div className="flex flex-wrap gap-2">
              {DESTINATIONS.map((dest) => (
                <button type="button" key={dest} onClick={() => toggleDestination(dest)}
                  className={`text-xs px-3 py-1.5 border transition-colors ${workerForm.preferredDestinations.includes(dest) ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/20 text-on-surface-variant'}`}>
                  {dest}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Availability</label>
            <select className={inputClass} value={workerForm.availability} onChange={(e) => setWorkerForm((f) => ({ ...f, availability: e.target.value }))}>
              {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Passport Status</label>
              <select className={inputClass} value={workerForm.passportStatus} onChange={(e) => setWorkerForm((f) => ({ ...f, passportStatus: e.target.value }))}>
                {PASSPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Medical Status</label>
              <select className={inputClass} value={workerForm.medicalStatus} onChange={(e) => setWorkerForm((f) => ({ ...f, medicalStatus: e.target.value }))}>
                {MEDICAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Notes</label><textarea rows={3} className={`${inputClass} resize-none`} value={workerForm.notes} onChange={(e) => setWorkerForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <button onClick={submitWorker} disabled={saving} className="self-start text-sm px-5 py-2.5 bg-primary text-on-primary disabled:opacity-40 transition-opacity raleway-text">
            {saving ? 'Submitting…' : 'Submit Candidate'}
          </button>
        </div>
      )}

      {tab === 'employer' && (
        <div className="flex flex-col gap-5 max-w-2xl mb-12">
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Company Name</label><input type="text" className={inputClass} value={employerForm.companyName} onChange={(e) => setEmployerForm((f) => ({ ...f, companyName: e.target.value }))} /></div>
            <div><label className={labelClass}>Contact Person</label><input type="text" className={inputClass} value={employerForm.contactPerson} onChange={(e) => setEmployerForm((f) => ({ ...f, contactPerson: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={employerForm.email} onChange={(e) => setEmployerForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div><label className={labelClass}>Phone</label><input type="text" className={inputClass} value={employerForm.phone} onChange={(e) => setEmployerForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Country</label><input type="text" className={inputClass} value={employerForm.country} onChange={(e) => setEmployerForm((f) => ({ ...f, country: e.target.value }))} /></div>
            <div><label className={labelClass}>Industry</label><input type="text" className={inputClass} value={employerForm.industry} onChange={(e) => setEmployerForm((f) => ({ ...f, industry: e.target.value }))} /></div>
          </div>
          <div><label className={labelClass}>Roles Needed</label><input type="text" placeholder='e.g. "10 Electricians, 5 Plumbers"' className={inputClass} value={employerForm.rolesNeeded} onChange={(e) => setEmployerForm((f) => ({ ...f, rolesNeeded: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Workers Needed</label><input type="number" min={1} className={inputClass} value={employerForm.workersNeeded} onChange={(e) => setEmployerForm((f) => ({ ...f, workersNeeded: parseInt(e.target.value) || 1 }))} /></div>
            <div>
              <label className={labelClass}>Hiring Timeline</label>
              <select className={inputClass} value={employerForm.hiringTimeline} onChange={(e) => setEmployerForm((f) => ({ ...f, hiringTimeline: e.target.value }))}>
                {HIRING_TIMELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Preferred Nationalities <span className="normal-case text-on-surface-variant/40">(comma-separated)</span></label><input type="text" placeholder="e.g. Pakistan, India, Philippines" className={inputClass} value={employerForm.preferredNationalities} onChange={(e) => setEmployerForm((f) => ({ ...f, preferredNationalities: e.target.value }))} /></div>
          <div><label className={labelClass}>Notes</label><textarea rows={3} className={`${inputClass} resize-none`} value={employerForm.notes} onChange={(e) => setEmployerForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <button onClick={submitEmployer} disabled={saving} className="self-start text-sm px-5 py-2.5 bg-primary text-on-primary disabled:opacity-40 transition-opacity raleway-text">
            {saving ? 'Submitting…' : 'Submit Employer'}
          </button>
        </div>
      )}

      {tab === 'oep' && (
        <div className="flex flex-col gap-5 max-w-2xl mb-12">
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Company Name</label><input type="text" className={inputClass} value={oepForm.companyName} onChange={(e) => setOepForm((f) => ({ ...f, companyName: e.target.value }))} /></div>
            <div><label className={labelClass}>License Number</label><input type="text" className={inputClass} value={oepForm.licenseNumber} onChange={(e) => setOepForm((f) => ({ ...f, licenseNumber: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Contact Person</label><input type="text" className={inputClass} value={oepForm.contactPerson} onChange={(e) => setOepForm((f) => ({ ...f, contactPerson: e.target.value }))} /></div>
            <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={oepForm.email} onChange={(e) => setOepForm((f) => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Phone</label><input type="text" className={inputClass} value={oepForm.phone} onChange={(e) => setOepForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className={labelClass}>Head Office Location</label><input type="text" className={inputClass} value={oepForm.headOfficeLocation} onChange={(e) => setOepForm((f) => ({ ...f, headOfficeLocation: e.target.value }))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className={labelClass}>Years in Operation</label><input type="number" min={0} className={inputClass} value={oepForm.yearsInOperation} onChange={(e) => setOepForm((f) => ({ ...f, yearsInOperation: parseInt(e.target.value) || 0 }))} /></div>
            <div><label className={labelClass}>Monthly Placement Capacity <span className="normal-case text-on-surface-variant/40">(optional)</span></label><input type="number" min={0} className={inputClass} value={oepForm.monthlyPlacementCapacity} onChange={(e) => setOepForm((f) => ({ ...f, monthlyPlacementCapacity: e.target.value }))} /></div>
          </div>
          <div><label className={labelClass}>Sectors Specialization <span className="normal-case text-on-surface-variant/40">(comma-separated)</span></label><input type="text" placeholder="e.g. Construction, Healthcare" className={inputClass} value={oepForm.sectorsSpecialization} onChange={(e) => setOepForm((f) => ({ ...f, sectorsSpecialization: e.target.value }))} /></div>
          <div><label className={labelClass}>Destination Countries <span className="normal-case text-on-surface-variant/40">(comma-separated)</span></label><input type="text" placeholder="e.g. Saudi Arabia, UAE" className={inputClass} value={oepForm.destinationCountries} onChange={(e) => setOepForm((f) => ({ ...f, destinationCountries: e.target.value }))} /></div>
          <div><label className={labelClass}>Company Website <span className="normal-case text-on-surface-variant/40">(optional)</span></label><input type="text" className={inputClass} value={oepForm.companyWebsite} onChange={(e) => setOepForm((f) => ({ ...f, companyWebsite: e.target.value }))} /></div>
          <div><label className={labelClass}>Notes</label><textarea rows={3} className={`${inputClass} resize-none`} value={oepForm.notes} onChange={(e) => setOepForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <button onClick={submitOep} disabled={saving} className="self-start text-sm px-5 py-2.5 bg-primary text-on-primary disabled:opacity-40 transition-opacity raleway-text">
            {saving ? 'Submitting…' : 'Submit Employment Promoter'}
          </button>
        </div>
      )}

      <h2 className="cinzel-text text-lg text-on-surface mb-4">
        {tab === 'worker' ? 'My Submitted Candidates' : tab === 'employer' ? 'My Submitted Employers' : 'My Submitted Employment Promoters'}
      </h2>
      {loadingList ? (
        <p className="text-on-surface-variant/50 text-sm">Loading…</p>
      ) : tab === 'worker' ? (
        workers.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant/10 px-6 py-10 text-center"><p className="text-on-surface-variant text-sm">No candidates submitted yet.</p></div>
        ) : (
          <div className="space-y-2">
            {workers.map((c) => (
              <div key={c.id} className="bg-surface-container border border-outline-variant/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-3 mb-1"><span className="text-sm font-medium text-on-surface">{c.full_name}</span><span className={`text-xs px-2 py-0.5 ${WORKER_STATUS_BADGES[c.status] || ''}`}>{c.status}</span></div>
                  <div className="text-xs text-on-surface-variant/60">{c.trade_category} · {c.specific_role} · {c.years_experience} yrs experience</div>
                </div>
                <div className="text-xs text-on-surface-variant/40">{new Date(c.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'employer' ? (
        employers.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant/10 px-6 py-10 text-center"><p className="text-on-surface-variant text-sm">No employers submitted yet.</p></div>
        ) : (
          <div className="space-y-2">
            {employers.map((c) => (
              <div key={c.id} className="bg-surface-container border border-outline-variant/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-on-surface mb-1">{c.company_name}</div>
                  <div className="text-xs text-on-surface-variant/60">{c.industry} · {c.roles_needed} · {c.workers_needed} workers needed</div>
                </div>
                <div className="text-xs text-on-surface-variant/40">{new Date(c.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )
      ) : (
        oeps.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant/10 px-6 py-10 text-center"><p className="text-on-surface-variant text-sm">No Employment Promoters submitted yet.</p></div>
        ) : (
          <div className="space-y-2">
            {oeps.map((c) => (
              <div key={c.id} className="bg-surface-container border border-outline-variant/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-3 mb-1"><span className="text-sm font-medium text-on-surface">{c.company_name}</span><span className={`text-xs px-2 py-0.5 ${OEP_STATUS_BADGES[c.status] || ''}`}>{c.status}</span></div>
                  <div className="text-xs text-on-surface-variant/60">License: {c.license_number} · {c.head_office_location}</div>
                </div>
                <div className="text-xs text-on-surface-variant/40">{new Date(c.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
