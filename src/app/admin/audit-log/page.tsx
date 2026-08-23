'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'


interface AuditEntry {
  id: string
  actor_id: string | null
  actor_name: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTION_BADGES: Record<string, { bg: string; text: string }> = {
  kyc_approved: { bg: 'bg-green-500/20', text: 'text-green-400' },
  kyc_rejected: { bg: 'bg-red-500/20', text: 'text-red-400' },
  user_created: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  user_updated: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  user_deactivated: { bg: 'bg-red-500/20', text: 'text-red-400' },
  role_changed: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  enquiry_assigned: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  enquiry_created: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  investment_created: { bg: 'bg-green-500/20', text: 'text-green-400' },
  investment_updated: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  investment_published: { bg: 'bg-green-500/20', text: 'text-green-400' },
  investment_deleted: { bg: 'bg-red-500/20', text: 'text-red-400' },
  settings_updated: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  login: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  logout: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  partner_created: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  partner_suspended: { bg: 'bg-red-500/20', text: 'text-red-400' },
  partner_reactivated: { bg: 'bg-green-500/20', text: 'text-green-400' },
  partner_sectors_updated: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  partner_opportunity_status_changed: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  partner_referral_removed: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

const ACTION_OPTIONS = [
  'kyc_approved',
  'kyc_rejected',
  'user_created',
  'user_updated',
  'user_deactivated',
  'role_changed',
  'enquiry_assigned',
  'enquiry_created',
  'investment_created',
  'investment_updated',
  'investment_published',
  'investment_deleted',
  'settings_updated',
  'login',
  'logout',
]

function getActionBadge(action: string) {
  const style = ACTION_BADGES[action] || { bg: 'bg-neutral-500/20', text: 'text-neutral-400' }
  return style
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 50

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (actionFilter) params.set('action', actionFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to load audit log')
      }
      const json = await res.json()
      setEntries(json.data || [])
      setTotal(json.total || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const totalPages = Math.ceil(total / limit)

  function truncateId(id: string | null) {
    if (!id) return '-'
    return id.length > 12 ? id.slice(0, 8) + '...' : id
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Audit Log</h1>
        <button
          onClick={() => {
            window.open('/api/admin/export?type=audit-log', '_blank')
          }}
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

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', letterSpacing: '0.5px' }}>
            Action Type
          </label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            className="bg-surface-container-low border border-outline-variant/10 rounded-nonepx-3 py-2 text-sm text-on-surface"
            style={{ minWidth: '180px' }}
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', letterSpacing: '0.5px' }}>
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="bg-surface-container-low border border-outline-variant/10 rounded-nonepx-3 py-2 text-sm text-on-surface"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', letterSpacing: '0.5px' }}>
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="bg-surface-container-low border border-outline-variant/10 rounded-nonepx-3 py-2 text-sm text-on-surface"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-on-surface-variant py-12 text-center">Loading audit log...</div>
      ) : entries.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-16 text-center">
          <p className="text-on-surface-variant">No audit log entries found.</p>
        </div>
      ) : (
        <>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: "'Raleway', sans-serif" }}>
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Actor</th>
                    <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Action</th>
                    <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Target</th>
                    <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const badge = getActionBadge(entry.action)
                    const isExpanded = expandedId === entry.id
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-outline-variant/10/50 transition-colors hover:bg-surface-container-lowest/30"
                        style={{ background: idx % 2 === 0 ? '#080808' : '#0a0a0a' }}
                      >
                        <td className="px-5 py-3 text-on-surface-variant/50 text-xs whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3 text-on-surface text-sm">
                          {entry.actor_name}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-none${badge.bg} ${badge.text}`}>
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-on-surface-variant">
                            {entry.target_type || '-'}
                          </span>
                          {entry.target_id && (
                            <span className="text-xs text-on-surface-variant/50 ml-1" title={entry.target_id}>
                              ({truncateId(entry.target_id)})
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                            <div>
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                className="text-xs text-primary hover:text-primary-light transition-colors"
                              >
                                {isExpanded ? 'Hide' : 'View'}
                              </button>
                              {isExpanded && (
                                <pre
                                  style={{
                                    marginTop: '8px',
                                    padding: '10px',
                                    background: '#0a0a0a',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 0,
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxWidth: '400px',
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                  }}
                                >
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-on-surface-variant/50">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            fontFamily: "'Raleway', sans-serif",
          }}>
            <p className="text-xs text-on-surface-variant/50">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} entries
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-nonetext-xs bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-on-surface-variant flex items-center px-2">
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-nonetext-xs bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
