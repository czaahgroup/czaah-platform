'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

export default function PartnerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [partnerId, setPartnerId] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ fullName: '', phone: '', companyName: '' })

  useEffect(() => {
    fetch('/api/partner/profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setPartnerId(json.partnerId)
        setReferralCode(json.referralCode)
        setEmail(json.profile.email)
        setForm({
          fullName: json.profile.full_name || '',
          phone: json.profile.phone || '',
          companyName: json.profile.company_name || '',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/partner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading profile...</div>

  return (
    <div>
      <h1 className="cinzel-text text-2xl text-on-surface mb-6">My Profile</h1>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6"><p className="text-sm text-red-400">{error}</p></div>}
      {saved && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-6"><p className="text-sm text-green-400">Profile updated.</p></div>}

      <div className="flex flex-col gap-5 max-w-lg">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Partner ID</label>
            <div className="bg-surface-container-high px-3 py-2.5 text-sm text-primary">{partnerId}</div>
          </div>
          <div>
            <label className={labelClass}>Referral Code</label>
            <div className="bg-surface-container-high px-3 py-2.5 text-sm text-primary">{referralCode || '—'}</div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <div className="bg-surface-container-high px-3 py-2.5 text-sm text-on-surface-variant/60">{email}</div>
        </div>

        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" className={inputClass} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input type="text" className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>

        <div>
          <label className={labelClass}>Company</label>
          <input type="text" className={inputClass} value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
        </div>

        <button onClick={handleSave} disabled={saving} className="self-start text-sm px-5 py-2.5 bg-primary text-on-primary disabled:opacity-40 transition-opacity raleway-text">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
