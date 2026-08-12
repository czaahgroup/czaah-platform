'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'


interface UserProfile {
  id: string
  full_name: string
  email: string
  company_name: string | null
  role: string
  status: string
  phone: string | null
  country: string | null
  industry_interests: string | null
  company_website: string | null
  company_description: string | null
  company_registration_number: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string | null
}

interface Sector {
  id: string
  name: string
}

interface SectorAssignment {
  id: string
  admin_id: string
  sector_id: string
}

type TabFilter = 'all' | 'members' | 'admins' | 'partners' | 'elite' | 're_partners' | 'pending' | 'deactivated'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [sectorAssignments, setSectorAssignments] = useState<SectorAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editSectors, setEditSectors] = useState<string[]>([])

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (tab === 'members') params.set('role', 'member')
      if (tab === 'admins') params.set('role', 'admin')
      if (tab === 'partners') params.set('role', 'investment_partner')
      if (tab === 'elite') params.set('role', 'elite_member')
      if (tab === 're_partners') params.set('role', 'real_estate_partner')
      if (tab === 'pending') params.set('status', 'pending')
      if (tab === 'deactivated') params.set('status', 'deactivated')
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to load users')
      }
      const json = await res.json()
      setUsers(json.users || [])
      setSectors(json.sectors || [])
      setSectorAssignments(json.sectorAssignments || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [tab, search])

  useEffect(() => {
    setLoading(true)
    loadUsers()
  }, [loadUsers])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const selected = users.find((u) => u.id === selectedId)

  // When selecting a user, initialize their sector checkboxes
  useEffect(() => {
    if (selected && selected.role === 'admin') {
      const assigned = sectorAssignments
        .filter((a) => a.admin_id === selected.id)
        .map((a) => a.sector_id)
      setEditSectors(assigned)
    } else {
      setEditSectors([])
    }
  }, [selectedId, selected, sectorAssignments])

  function clearMessages() {
    setError(null)
    setSuccess(null)
  }

  async function handleChangeRole(userId: string, newRole: 'member' | 'admin' | 'investment_partner' | 'elite_member' | 'real_estate_partner') {
    clearMessages()
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update role')
      }
      setSuccess(`Role updated to ${newRole}`)
      await loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleChangeStatus(userId: string, newStatus: string) {
    clearMessages()
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update status')
      }
      setSuccess(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
      await loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeactivate(userId: string) {
    clearMessages()
    if (!confirm('Are you sure you want to deactivate this user?')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to deactivate user')
      }
      setSuccess('User deactivated')
      setSelectedId(null)
      await loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSaveSectors(userId: string) {
    clearMessages()
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorAssignments: editSectors }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update sectors')
      }
      setSuccess('Sector assignments updated')
      await loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update sectors')
    } finally {
      setActionLoading(false)
    }
  }

  function toggleSector(sectorId: string) {
    setEditSectors((prev) =>
      prev.includes(sectorId) ? prev.filter((s) => s !== sectorId) : [...prev, sectorId]
    )
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'members', label: 'Members' },
    { key: 'elite', label: 'Elite' },
    { key: 'admins', label: 'Admins' },
    { key: 'partners', label: 'Inv. Partners' },
    { key: 're_partners', label: 'RE Partners' },
    { key: 'pending', label: 'Pending' },
    { key: 'deactivated', label: 'Deactivated' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Users</h1>
          <button
            onClick={() => { window.open('/api/admin/export?type=members', '_blank') }}
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
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedId(null); clearMessages() }}
              className={`px-4 py-1.5 rounded-nonetext-sm transition-colors ${
                tab === t.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full sm:w-80 bg-surface-container-low border border-outline-variant/10 rounded-nonepx-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

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

      {loading ? (
        <div className="text-on-surface-variant py-12 text-center">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No users found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Users table */}
          <div className="xl:col-span-2">
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/10">
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium">Name</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden md:table-cell">Email</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden lg:table-cell">Company</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium">Role</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium">Status</th>
                      <th className="text-left px-5 py-3 text-on-surface-variant font-medium hidden sm:table-cell">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter((u) => u.role !== 'super_admin').map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => { setSelectedId(user.id); clearMessages() }}
                        className={`border-b border-outline-variant/10/50 cursor-pointer transition-colors ${
                          selectedId === user.id
                            ? 'bg-primary/5'
                            : 'hover:bg-surface-container-lowest/30'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span className="text-on-surface font-medium">{user.full_name || 'Unnamed'}</span>
                          <span className="md:hidden block text-xs text-on-surface-variant/50">{user.email}</span>
                        </td>
                        <td className="px-5 py-3 text-on-surface-variant hidden md:table-cell">{user.email}</td>
                        <td className="px-5 py-3 text-on-surface-variant hidden lg:table-cell">{user.company_name || '-'}</td>
                        <td className="px-5 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-5 py-3 text-on-surface-variant/50 hidden sm:table-cell">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant/50 mt-3">
              {users.filter((u) => u.role !== 'super_admin').length} user(s) shown
            </p>
          </div>

          {/* Detail panel */}
          <div>
            {selected && selected.role !== 'super_admin' ? (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none sticky top-8">
                {/* User info header */}
                <div className="px-6 py-4 border-b border-outline-variant/10">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg text-on-surface">
                    {selected.full_name || 'Unnamed'}
                  </h2>
                  <p className="text-sm text-on-surface-variant">{selected.email}</p>
                  <div className="flex gap-2 mt-2">
                    <RoleBadge role={selected.role} />
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                {/* Profile details */}
                <div className="px-6 py-4 border-b border-outline-variant/10 space-y-3">
                  <DetailRow label="Phone" value={selected.phone} />
                  <DetailRow label="Company" value={selected.company_name} />
                  <DetailRow label="Reg. Number" value={selected.company_registration_number} />
                  <DetailRow label="Country" value={selected.country} />
                  <DetailRow label="Industry" value={selected.industry_interests} />
                  <DetailRow label="Website" value={selected.company_website} />
                  {selected.company_description && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Description</p>
                      <p className="text-sm text-on-surface mt-0.5 line-clamp-3">{selected.company_description}</p>
                    </div>
                  )}
                  <DetailRow label="Joined" value={new Date(selected.created_at).toLocaleDateString()} />
                </div>

                {/* Role management */}
                <div className="px-6 py-4 border-b border-outline-variant/10">
                  <p className="text-xs text-on-surface-variant mb-2">Change Role</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleChangeRole(selected.id, 'member')}
                      disabled={actionLoading || selected.role === 'member'}
                      className={`flex-1 py-2 rounded-nonetext-sm font-medium transition-colors disabled:opacity-40 ${
                        selected.role === 'member'
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Member
                    </button>
                    <button
                      onClick={() => handleChangeRole(selected.id, 'admin')}
                      disabled={actionLoading || selected.role === 'admin'}
                      className={`flex-1 py-2 rounded-nonetext-sm font-medium transition-colors disabled:opacity-40 ${
                        selected.role === 'admin'
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => handleChangeRole(selected.id, 'investment_partner')}
                      disabled={actionLoading || selected.role === 'investment_partner'}
                      className={`flex-1 py-2 rounded-nonetext-sm font-medium transition-colors disabled:opacity-40 ${
                        selected.role === 'investment_partner'
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Inv. Partner
                    </button>
                    <button
                      onClick={() => handleChangeRole(selected.id, 'elite_member')}
                      disabled={actionLoading || selected.role === 'elite_member'}
                      className={`flex-1 py-2 rounded-nonetext-sm font-medium transition-colors disabled:opacity-40 ${
                        selected.role === 'elite_member'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Elite Member
                    </button>
                    <button
                      onClick={() => handleChangeRole(selected.id, 'real_estate_partner')}
                      disabled={actionLoading || selected.role === 'real_estate_partner'}
                      className={`flex-1 py-2 rounded-nonetext-sm font-medium transition-colors disabled:opacity-40 ${
                        selected.role === 'real_estate_partner'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      RE Partner
                    </button>
                  </div>
                </div>

                {/* Sector assignments (admin only) */}
                {selected.role === 'admin' && sectors.length > 0 && (
                  <div className="px-6 py-4 border-b border-outline-variant/10">
                    <p className="text-xs text-on-surface-variant mb-2">Sector Assignments</p>
                    <div className="space-y-2 mb-3">
                      {sectors.map((sector) => (
                        <label
                          key={sector.id}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={editSectors.includes(sector.id)}
                            onChange={() => toggleSector(sector.id)}
                            className="rounded border-outline-variant/10 bg-surface-container-lowest text-primary focus:ring-primary/50"
                          />
                          <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                            {sector.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => handleSaveSectors(selected.id)}
                      disabled={actionLoading}
                      className="w-full bg-primary text-on-primary font-semibold py-2 rounded-nonetext-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Sectors'}
                    </button>
                  </div>
                )}

                {/* Status actions */}
                <div className="px-6 py-4">
                  <p className="text-xs text-on-surface-variant mb-2">Status Actions</p>
                  <div className="space-y-2">
                    {selected.status === 'pending_kyc_review' && (
                      <button
                        onClick={() => handleChangeStatus(selected.id, 'approved')}
                        disabled={actionLoading}
                        className="w-full bg-green-600 text-white font-semibold py-2 rounded-nonetext-sm hover:bg-green-600/80 transition-colors disabled:opacity-50"
                      >
                        Approve User
                      </button>
                    )}
                    {selected.status === 'deactivated' && (
                      <button
                        onClick={() => handleChangeStatus(selected.id, 'approved')}
                        disabled={actionLoading}
                        className="w-full bg-green-600 text-white font-semibold py-2 rounded-nonetext-sm hover:bg-green-600/80 transition-colors disabled:opacity-50"
                      >
                        Reactivate User
                      </button>
                    )}
                    {selected.status !== 'deactivated' && (
                      <button
                        onClick={() => handleDeactivate(selected.id)}
                        disabled={actionLoading}
                        className="w-full bg-error/20 text-error font-semibold py-2 rounded-nonetext-sm hover:bg-error/30 transition-colors disabled:opacity-50"
                      >
                        Deactivate User
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-none flex items-center justify-center py-16">
                <p className="text-on-surface-variant text-sm">Select a user to manage</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value}</p>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    super_admin: 'bg-primary/20 text-primary',
    admin: 'bg-blue-500/20 text-blue-400',
    member: 'bg-neutral-500/20 text-neutral-400',
    investment_partner: 'bg-purple-500/20 text-purple-400',
    elite_member: 'bg-emerald-500/20 text-emerald-400',
    real_estate_partner: 'bg-cyan-500/20 text-cyan-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-none${styles[role] || 'bg-neutral-500/20 text-neutral-400'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_kyc_review: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    deactivated: 'bg-neutral-500/20 text-neutral-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-none${styles[status] || 'bg-neutral-500/20 text-neutral-400'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
