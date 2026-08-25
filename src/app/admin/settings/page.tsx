'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { RingtonePicker } from '@/components/RingtonePicker'


interface AdminProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  avatar_url: string | null
  created_at: string
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to load profile')
      }
      const json = await res.json()
      setProfile(json.profile)
      setFullName(json.profile.full_name || '')
      setPhone(json.profile.phone || '')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save settings')
      }

      setSuccess('Profile updated successfully')
      await loadProfile()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading settings...</div>
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-8">Settings</h1>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Platform Info */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-none mb-6">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">Platform</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Platform Name</label>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface-variant">
              CZAAH Group
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Description</label>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface-variant">
              Members-only platform for CZAAH Group — connecting businesses across sectors with investment and advisory services.
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/50">
            Platform details are read-only. Contact your developer to change these.
          </p>
        </div>
      </div>

      {/* Super Admin Profile */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-none">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">Your Profile</h2>
          <p className="text-xs text-on-surface-variant/50 mt-0.5">Super Admin account details</p>
        </div>

        <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-xs text-on-surface-variant mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs text-on-surface-variant mb-1">
              Email
            </label>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface-variant">
              {profile?.email || '-'}
            </div>
            <p className="text-xs text-on-surface-variant/50 mt-1">
              Email cannot be changed from here. Use Supabase Auth settings if needed.
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs text-on-surface-variant mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Role</label>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm">
              <span className="text-primary">super_admin</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Account Created</label>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface-variant">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-nonetext-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Call Settings */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-none mt-6">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">Call Settings</h2>
        </div>
        <div className="px-6 py-4">
          <RingtonePicker />
        </div>
      </div>
    </div>
  )
}
