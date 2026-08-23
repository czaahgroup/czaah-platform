'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

interface Sector {
  id: string
  name: string
  is_active: boolean
}

interface Partner {
  id: string
  partner_id: string
  referral_code: string | null
  status: 'active' | 'suspended'
  notes: string | null
  created_at: string
  profiles: { full_name: string; email: string; phone: string | null; company_name: string | null } | null
  partner_sector_access: { sector_id: string; sectors: { id: string; name: string } }[]
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendSuccessId, setResendSuccessId] = useState<string | null>(null)

  interface PartnerDetail {
    referrals: { id: string; connected_via: string; created_at: string; profiles: { full_name: string; email: string; role: string } | null }[]
    opportunityCounts: { total: number; underReview: number; approved: number; inProgress: number; completed: number }
  }
  const [detailById, setDetailById] = useState<Record<string, PartnerDetail>>({})
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null)

  const [form, setForm] = useState({ email: '', fullName: '', companyName: '', sectorIds: [] as string[] })

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      const res = await fetch('/api/admin/partners')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load partners')
      setPartners(json.data || [])
      setSectors(json.sectors || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.email || !form.fullName || creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create partner')
      setForm({ email: '', fullName: '', companyName: '', sectorIds: [] })
      setShowAddForm(false)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create partner')
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(id: string, status: 'active' | 'suspended') {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update')
      }
      setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  async function updateSectors(id: string, sectorIds: string[]) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorIds }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update sectors')
      }
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  async function toggleExpand(id: string) {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (next && !detailById[next]) {
      setLoadingDetailId(next)
      try {
        const res = await fetch(`/api/admin/partners/${next}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load partner profile')
        setDetailById((prev) => ({ ...prev, [next]: { referrals: json.referrals || [], opportunityCounts: json.opportunityCounts } }))
        setNotesDraft((prev) => ({ ...prev, [next]: json.data?.notes || '' }))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load partner profile')
      } finally {
        setLoadingDetailId(null)
      }
    }
  }

  async function saveNotes(id: string) {
    setSavingNotesId(id)
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft[id] || '' }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save notes')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setSavingNotesId(null)
    }
  }

  async function resendInvite(id: string) {
    setResendingId(id)
    setResendSuccessId(null)
    try {
      const res = await fetch(`/api/admin/partners/${id}/resend-invite`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to resend invite')
      }
      setResendSuccessId(id)
      setTimeout(() => setResendSuccessId((current) => (current === id ? null : current)), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite')
    } finally {
      setResendingId(null)
    }
  }

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading partners...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">CZAAH Partners</h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs px-4 py-2 border border-primary/40 text-primary hover:border-primary transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Partner'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="bg-surface-container-low border border-primary/30 px-6 py-5 mb-6 flex flex-col gap-3">
          <div className="text-sm font-medium text-on-surface mb-1">New CZAAH Partner</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface"
            />
            <input
              type="text"
              placeholder="Company (optional)"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface sm:col-span-2"
            />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant/60 mb-2">Authorised sectors</div>
            <div className="flex flex-wrap gap-2">
              {sectors.filter((s) => s.is_active).map((s) => (
                <label key={s.id} className="flex items-center gap-1.5 text-xs text-on-surface-variant px-2 py-1 border border-outline-variant/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sectorIds.includes(s.id)}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        sectorIds: e.target.checked ? [...f.sectorIds, s.id] : f.sectorIds.filter((id) => id !== s.id),
                      }))
                    }}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !form.email || !form.fullName}
            className="self-start text-xs px-4 py-2 bg-primary text-on-primary disabled:opacity-40 transition-opacity"
          >
            {creating ? 'Sending invite…' : 'Create & Send Invite'}
          </button>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant">No partners yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => {
            const isExpanded = expandedId === p.id
            return (
              <div key={p.id} className="bg-surface-container-low border border-outline-variant/10">
                <button onClick={() => toggleExpand(p.id)} className="w-full text-left px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-on-surface">{p.profiles?.full_name || '—'}</span>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary">{p.partner_id}</span>
                        <span className={`text-xs px-2 py-0.5 ${p.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.status}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant space-x-2">
                        <span>{p.profiles?.email}</span>
                        {p.profiles?.company_name && <span>· {p.profiles.company_name}</span>}
                      </div>
                      <div className="text-xs text-on-surface-variant/50 mt-1">
                        {p.partner_sector_access.length === 0 ? 'No sectors assigned' : p.partner_sector_access.map((a) => a.sectors?.name).join(', ')}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-outline-variant/10 pt-4 flex flex-col gap-4">
                    {loadingDetailId === p.id ? (
                      <p className="text-xs text-on-surface-variant/50">Loading profile…</p>
                    ) : (
                      <>
                        <div>
                          <div className="text-xs text-on-surface-variant/60 mb-2">Partner Profile</div>
                          <div className="bg-surface-container-high px-4 py-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                            <div className="text-on-surface-variant"><span className="text-on-surface-variant/50">Name:</span> {p.profiles?.full_name || '—'}</div>
                            <div className="text-on-surface-variant"><span className="text-on-surface-variant/50">Email:</span> {p.profiles?.email || '—'}</div>
                            <div className="text-on-surface-variant"><span className="text-on-surface-variant/50">Phone:</span> {p.profiles?.phone || '—'}</div>
                            <div className="text-on-surface-variant"><span className="text-on-surface-variant/50">Company:</span> {p.profiles?.company_name || '—'}</div>
                            <div className="text-on-surface-variant"><span className="text-on-surface-variant/50">Partner ID:</span> {p.partner_id}</div>
                            <div className="text-on-surface-variant"><span className="text-on-surface-variant/50">Referral Code:</span> {p.referral_code || '—'}</div>
                          </div>
                        </div>

                        {detailById[p.id] && (
                          <div>
                            <div className="text-xs text-on-surface-variant/60 mb-2">Opportunities</div>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                              {[
                                ['Total', detailById[p.id].opportunityCounts.total],
                                ['Under Review', detailById[p.id].opportunityCounts.underReview],
                                ['Approved', detailById[p.id].opportunityCounts.approved],
                                ['In Progress', detailById[p.id].opportunityCounts.inProgress],
                                ['Completed', detailById[p.id].opportunityCounts.completed],
                              ].map(([label, value]) => (
                                <div key={label as string} className="bg-surface-container-high px-2 py-3">
                                  <div className="text-base text-primary">{value as number}</div>
                                  <div className="text-[10px] text-on-surface-variant/50 uppercase tracking-wide">{label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detailById[p.id] && detailById[p.id].referrals.length > 0 && (
                          <div>
                            <div className="text-xs text-on-surface-variant/60 mb-2">Referred Users ({detailById[p.id].referrals.length})</div>
                            <div className="flex flex-col gap-1">
                              {detailById[p.id].referrals.map((r) => (
                                <div key={r.id} className="bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant flex justify-between">
                                  <span>{r.profiles?.full_name || '—'} ({r.profiles?.email})</span>
                                  <span className="text-on-surface-variant/50">{r.connected_via.replace('_', ' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-xs text-on-surface-variant/60 mb-1">Internal Notes (admin-only)</div>
                          <textarea
                            value={notesDraft[p.id] ?? ''}
                            onChange={(e) => setNotesDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            rows={2}
                            className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface w-full resize-none"
                          />
                          <button
                            onClick={() => saveNotes(p.id)}
                            disabled={savingNotesId === p.id}
                            className="mt-2 text-xs px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 transition-colors disabled:opacity-40"
                          >
                            {savingNotesId === p.id ? 'Saving…' : 'Save Notes'}
                          </button>
                        </div>
                      </>
                    )}

                    <div>
                      <div className="text-xs text-on-surface-variant/60 mb-2">Authorised sectors</div>
                      <div className="flex flex-wrap gap-2">
                        {sectors.filter((s) => s.is_active).map((s) => {
                          const checked = p.partner_sector_access.some((a) => a.sector_id === s.id)
                          return (
                            <label key={s.id} className="flex items-center gap-1.5 text-xs text-on-surface-variant px-2 py-1 border border-outline-variant/20 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const current = p.partner_sector_access.map((a) => a.sector_id)
                                  const next = e.target.checked ? [...current, s.id] : current.filter((id) => id !== s.id)
                                  updateSectors(p.id, next)
                                }}
                              />
                              {s.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {p.status === 'active' ? (
                        <button
                          onClick={() => updateStatus(p.id, 'suspended')}
                          disabled={savingId === p.id}
                          className="text-xs px-3 py-1.5 border border-red-500/40 text-red-400 hover:border-red-500 transition-colors disabled:opacity-40"
                        >
                          Suspend Partner
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(p.id, 'active')}
                          disabled={savingId === p.id}
                          className="text-xs px-3 py-1.5 border border-green-500/40 text-green-400 hover:border-green-500 transition-colors disabled:opacity-40"
                        >
                          Reactivate Partner
                        </button>
                      )}
                      <button
                        onClick={() => resendInvite(p.id)}
                        disabled={resendingId === p.id}
                        className="text-xs px-3 py-1.5 border border-primary/40 text-primary hover:border-primary transition-colors disabled:opacity-40"
                      >
                        {resendingId === p.id ? 'Sending…' : 'Resend Invite'}
                      </button>
                      {resendSuccessId === p.id && (
                        <span className="text-xs text-green-400">Invite sent</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
