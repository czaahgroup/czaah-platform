'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'

interface EliteMember {
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

export default function EliteMembersPage() {
  const [members, setMembers] = useState<EliteMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EliteMember | null>(null)

  const [form, setForm] = useState({ fullName: '', phone: '', companyName: '', country: '', industryInterests: '', companyWebsite: '', companyDescription: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)

  const [roleLoading, setRoleLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const [showPurgeModal, setShowPurgeModal] = useState(false)
  const [purgeConfirmEmail, setPurgeConfirmEmail] = useState('')
  const [purging, setPurging] = useState(false)
  const [purgeError, setPurgeError] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users?role=elite_member')
      const data = await res.json()
      if (res.ok) setMembers(data.users || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMembers() }, [loadMembers])

  const filtered = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  )

  function openDetail(member: EliteMember) {
    setSelected(member)
    setForm({
      fullName: member.full_name || '',
      phone: member.phone || '',
      companyName: member.company_name || '',
      country: member.country || '',
      industryInterests: member.industry_interests || '',
      companyWebsite: member.company_website || '',
      companyDescription: member.company_description || '',
    })
    setPassword('')
    setSaveError(null); setSaveSuccess(null)
    setPwError(null); setPwSuccess(null)
  }

  function closeDetail() {
    setSelected(null)
    setShowPurgeModal(false)
    setPurgeConfirmEmail('')
    setPurgeError(null)
  }

  async function saveProfile() {
    if (!selected) return
    setSaving(true); setSaveError(null); setSaveSuccess(null)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || 'Failed to save changes'); return }
      setSaveSuccess('Profile updated.')
      const updated = { ...selected, full_name: form.fullName, phone: form.phone, company_name: form.companyName, country: form.country, industry_interests: form.industryInterests, company_website: form.companyWebsite, company_description: form.companyDescription }
      setSelected(updated)
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function setUserPassword() {
    if (!selected || password.length < 8) return
    setPwSaving(true); setPwError(null); setPwSuccess(null)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error || 'Failed to set password'); return }
      setPwSuccess('Password updated.')
      setPassword('')
    } catch {
      setPwError('Network error. Please try again.')
    } finally {
      setPwSaving(false)
    }
  }

  async function changeRole(role: string) {
    if (!selected) return
    setRoleLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        // Role changed away from elite_member — drop them from this list.
        setMembers(prev => prev.filter(m => m.id !== selected.id))
        closeDetail()
      }
    } finally {
      setRoleLoading(false)
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = { ...selected, status }
        setSelected(updated)
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
      }
    } finally {
      setStatusLoading(false)
    }
  }

  async function handlePurge() {
    if (!selected) return
    setPurgeError(null); setPurging(true)
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: purgeConfirmEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setPurgeError(data.error || 'Failed to delete user'); return }
      setMembers(prev => prev.filter(m => m.id !== selected.id))
      closeDetail()
    } catch {
      setPurgeError('Network error. Please try again.')
    } finally {
      setPurging(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <>
      <style>{`
        .em-page { padding: 32px; max-width: 1400px; }
        .em-header { display: flex; align-items: baseline; margin-bottom: 28px; gap: 12px; }
        .em-title { font-family: 'Cinzel', serif; font-size: 24px; color: #fff; font-weight: 600; margin: 0; }
        .em-title span { color: #c9a84c; }
        .em-count { font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.35); }
        .em-search {
          width: 100%; max-width: 320px; padding: 9px 14px; margin-bottom: 20px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px; color: #fff; font-family: 'Raleway', sans-serif;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .em-search:focus { border-color: rgba(201,168,76,0.4); }
        .em-search::placeholder { color: rgba(255,255,255,0.2); }
        .em-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
        .em-table { width: 100%; border-collapse: collapse; min-width: 700px; }
        .em-table th {
          text-align: left; padding: 12px 14px; font-family: 'Raleway', sans-serif;
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .em-table td {
          padding: 12px 14px; font-family: 'Raleway', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.65); border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .em-table tbody tr { cursor: pointer; transition: background 0.15s; }
        .em-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        .em-table tbody tr.active { background: rgba(201,168,76,0.04); }
        .em-name { color: #fff; font-weight: 500; }
        .em-badge {
          display: inline-block; padding: 3px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: capitalize;
          background: rgba(16,185,129,0.12); color: #34d399;
        }
        .em-empty { text-align: center; padding: 60px 20px; font-family: 'Raleway', sans-serif; font-size: 14px; color: rgba(255,255,255,0.3); }
        .em-loading { text-align: center; padding: 60px 20px; color: rgba(201,168,76,0.5); font-family: 'Raleway', sans-serif; }

        .em-detail-overlay {
          position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.6);
          display: flex; justify-content: flex-end; animation: emFadeIn 0.2s ease;
        }
        @keyframes emFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .em-detail-panel {
          width: 500px; max-width: 100%; height: 100%; background: #0a0a0a;
          border-left: 1px solid rgba(255,255,255,0.06); overflow-y: auto;
          animation: emSlideIn 0.25s ease; padding: 28px;
        }
        @keyframes emSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .em-detail-close {
          float: right; background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 22px; cursor: pointer; width: 32px; height: 32px; display: flex;
          align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;
        }
        .em-detail-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .em-detail-name { font-family: 'Cinzel', serif; font-size: 20px; color: #fff; font-weight: 600; margin: 8px 0 4px; }
        .em-detail-email { font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.4); margin-bottom: 20px; }
        .em-detail-section { margin-bottom: 16px; }
        .em-detail-label {
          font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; font-weight: 500;
        }
        .em-detail-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 20px 0; }
        .em-input, .em-textarea {
          width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 13px; outline: none;
          box-sizing: border-box;
        }
        .em-input:focus, .em-textarea:focus { border-color: rgba(201,168,76,0.4); }
        .em-textarea { min-height: 70px; resize: vertical; }
        .em-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .em-save {
          padding: 10px 24px; border-radius: 4px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; font-family: 'Raleway', sans-serif; font-size: 13px; font-weight: 600;
          transition: opacity 0.2s;
        }
        .em-save:hover { opacity: 0.9; }
        .em-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .em-msg-ok { color: #34d399; font-family: 'Raleway', sans-serif; font-size: 12px; margin-top: 8px; }
        .em-msg-err { color: #f87171; font-family: 'Raleway', sans-serif; font-size: 12px; margin-top: 8px; }
        .em-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .em-role-btn {
          padding: 9px; border-radius: 4px; font-family: 'Raleway', sans-serif; font-size: 12px;
          font-weight: 500; cursor: pointer; transition: all 0.2s;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
        }
        .em-role-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .em-role-btn.active { background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.4); }
        .em-status-btn {
          width: 100%; padding: 10px; border-radius: 4px; font-family: 'Raleway', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none;
        }
        .em-danger-box { border-top: 1px solid rgba(239,68,68,0.2); padding-top: 16px; margin-top: 20px; }
        .em-danger-btn {
          width: 100%; padding: 10px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.4);
          background: transparent; color: #f87171; font-family: 'Raleway', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .em-danger-btn:hover { background: rgba(239,68,68,0.08); }
        @media (max-width: 768px) { .em-page { padding: 16px; } .em-detail-panel { width: 100%; } .em-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="em-page">
        <div className="em-header">
          <h1 className="em-title">Elite <span>Members</span></h1>
          <span className="em-count">{members.length} total</span>
        </div>

        <input
          className="em-search"
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="em-loading">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="em-empty">{members.length === 0 ? 'No elite members yet.' : 'No matches.'}</div>
        ) : (
          <div className="em-table-wrap">
            <table className="em-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr key={member.id} className={selected?.id === member.id ? 'active' : ''} onClick={() => openDetail(member)}>
                    <td className="em-name">{member.full_name || 'Unnamed'}</td>
                    <td>{member.email}</td>
                    <td>{member.company_name || '-'}</td>
                    <td><span className="em-badge">{member.status}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(member.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="em-detail-overlay" onClick={e => { if (e.target === e.currentTarget) closeDetail() }}>
          <div className="em-detail-panel">
            <button className="em-detail-close" onClick={closeDetail}>&times;</button>
            <div className="em-detail-name">{selected.full_name || 'Unnamed'}</div>
            <div className="em-detail-email">{selected.email}</div>

            {/* Profile fields */}
            <div className="em-detail-section">
              <div className="em-detail-label">Full Name</div>
              <input className="em-input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="em-grid">
              <div className="em-detail-section">
                <div className="em-detail-label">Phone</div>
                <input className="em-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Country</div>
                <input className="em-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Company</div>
                <input className="em-input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Website</div>
                <input className="em-input" value={form.companyWebsite} onChange={e => setForm(f => ({ ...f, companyWebsite: e.target.value }))} />
              </div>
            </div>
            <div className="em-detail-section">
              <div className="em-detail-label">Industry Interests</div>
              <input className="em-input" value={form.industryInterests} onChange={e => setForm(f => ({ ...f, industryInterests: e.target.value }))} />
            </div>
            <div className="em-detail-section">
              <div className="em-detail-label">Company Description</div>
              <textarea className="em-textarea" value={form.companyDescription} onChange={e => setForm(f => ({ ...f, companyDescription: e.target.value }))} />
            </div>
            <button className="em-save" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
            {saveSuccess && <div className="em-msg-ok">{saveSuccess}</div>}
            {saveError && <div className="em-msg-err">{saveError}</div>}

            <div className="em-detail-divider" />

            {/* Set password */}
            <div className="em-detail-section">
              <div className="em-detail-label">Set Password</div>
              <input
                className="em-input"
                type="text"
                placeholder="New password (min. 8 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="em-save" onClick={setUserPassword} disabled={pwSaving || password.length < 8}>{pwSaving ? 'Setting...' : 'Set Password'}</button>
            {pwSuccess && <div className="em-msg-ok">{pwSuccess}</div>}
            {pwError && <div className="em-msg-err">{pwError}</div>}

            <div className="em-detail-divider" />

            {/* Role */}
            <div className="em-detail-section">
              <div className="em-detail-label">Change Role</div>
              <div className="em-role-grid">
                <button className={`em-role-btn${selected.role === 'member' ? ' active' : ''}`} disabled={roleLoading || selected.role === 'member'} onClick={() => changeRole('member')}>Member</button>
                <button className={`em-role-btn${selected.role === 'investment_partner' ? ' active' : ''}`} disabled={roleLoading || selected.role === 'investment_partner'} onClick={() => changeRole('investment_partner')}>Inv. Partner</button>
                <button className="em-role-btn active" disabled>Elite Member</button>
                <button className={`em-role-btn${selected.role === 'real_estate_partner' ? ' active' : ''}`} disabled={roleLoading || selected.role === 'real_estate_partner'} onClick={() => changeRole('real_estate_partner')}>RE Partner</button>
              </div>
            </div>

            <div className="em-detail-divider" />

            {/* Status */}
            <div className="em-detail-section">
              <div className="em-detail-label">Status Actions</div>
              {selected.status === 'deactivated' ? (
                <button className="em-status-btn" style={{ background: '#16a34a', color: '#fff' }} disabled={statusLoading} onClick={() => changeStatus('approved')}>Reactivate User</button>
              ) : (
                <button className="em-status-btn" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }} disabled={statusLoading} onClick={() => changeStatus('deactivated')}>Deactivate User</button>
              )}
            </div>

            <div className="em-danger-box">
              <div className="em-detail-label" style={{ color: '#f87171' }}>Danger Zone</div>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                Permanently delete this account. This cannot be undone.
              </p>
              <button className="em-danger-btn" onClick={() => { setShowPurgeModal(true); setPurgeConfirmEmail(''); setPurgeError(null) }}>Permanently Delete User</button>
            </div>

            <div style={{ marginTop: '20px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
              Joined {formatDate(selected.created_at)}
            </div>
          </div>
        </div>
      )}

      {showPurgeModal && selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={e => { if (e.target === e.currentTarget) setShowPurgeModal(false) }}>
          <div style={{ background: '#111', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '24px', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: '#f87171', margin: '0 0 12px' }}>Permanently Delete User</h3>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
              Type <strong>{selected.email}</strong> to confirm. This cannot be undone.
            </p>
            <input
              className="em-input"
              value={purgeConfirmEmail}
              onChange={e => setPurgeConfirmEmail(e.target.value)}
              placeholder={selected.email}
              style={{ marginBottom: '12px' }}
            />
            {purgeError && <div className="em-msg-err" style={{ marginBottom: '12px' }}>{purgeError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="em-danger-btn"
                style={{ background: 'rgba(239,68,68,0.15)' }}
                disabled={purging || purgeConfirmEmail.trim().toLowerCase() !== selected.email.trim().toLowerCase()}
                onClick={handlePurge}
              >
                {purging ? 'Deleting...' : 'Delete Permanently'}
              </button>
              <button className="em-role-btn" onClick={() => setShowPurgeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
