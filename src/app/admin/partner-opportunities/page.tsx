'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'

interface Opportunity {
  id: string
  reference_number: string
  title: string
  country: string | null
  opportunity_type: string
  summary: string
  description: string | null
  estimated_value: string | null
  contact_or_company: string | null
  partner_role: string | null
  workers_needed: number | null
  trade_skill: string | null
  confidentiality_level: string
  status: string
  visibility_scope: string
  admin_notes: string | null
  commission_notes: string | null
  created_at: string
  sectors: { id: string; name: string } | null
  partners: { id: string; partner_id: string; profiles: { full_name: string; email: string } | null } | null
  partner_opportunity_documents: { id: string; file_path: string; file_name: string }[]
}

const STATUS_BADGES: Record<string, string> = {
  draft: 'bg-neutral-500/20 text-neutral-400',
  submitted: 'bg-yellow-500/20 text-yellow-400',
  more_info_required: 'bg-orange-500/20 text-orange-400',
  approved: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  archived: 'bg-neutral-500/20 text-neutral-400',
}

const STATUS_OPTIONS = ['submitted', 'more_info_required', 'approved', 'in_progress', 'completed', 'rejected', 'archived']

export default function AdminPartnerOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { admin_notes: string; commission_notes: string }>>({})

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      const res = await fetch('/api/admin/partner-opportunities')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load opportunities')
      setOpportunities(json.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function patchOpportunity(id: string, updates: Record<string, unknown>) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/partner-opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  async function openDocument(docId: string) {
    try {
      const res = await fetch(`/api/partner/documents/${docId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to open document')
      window.open(json.url, '_blank')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open document')
    }
  }

  const filtered = opportunities.filter((o) => statusFilter === 'all' || o.status === statusFilter)

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading opportunities...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Partner Opportunities</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-container-low border border-outline-variant/10 px-3 py-1.5 text-sm text-on-surface"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant">No opportunities found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const isExpanded = expandedId === o.id
            const draft = drafts[o.id] || { admin_notes: o.admin_notes || '', commission_notes: o.commission_notes || '' }
            return (
              <div key={o.id} className="bg-surface-container-low border border-outline-variant/10">
                <button onClick={() => setExpandedId(isExpanded ? null : o.id)} className="w-full text-left px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-on-surface truncate">{o.title}</span>
                        <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[o.status] || ''}`}>{o.status.replace(/_/g, ' ')}</span>
                        <span className="text-xs px-2 py-0.5 shrink-0 bg-primary/10 text-primary">{o.reference_number}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant space-x-2">
                        <span>{o.partners?.partner_id}</span>
                        <span>· {o.partners?.profiles?.full_name}</span>
                        {o.sectors && <span>· {o.sectors.name}</span>}
                      </div>
                      <div className="text-xs text-on-surface-variant/50 mt-1">{o.opportunity_type.replace(/_/g, ' ')} {o.country ? `· ${o.country}` : ''}</div>
                    </div>
                    <div className="text-xs text-on-surface-variant/50 shrink-0">{new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-outline-variant/10 pt-4 flex flex-col gap-4">
                    <p className="text-sm text-on-surface-variant leading-relaxed">{o.summary}</p>
                    {o.description && <p className="text-sm text-on-surface-variant/70 leading-relaxed whitespace-pre-wrap">{o.description}</p>}
                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                      {o.estimated_value && <div>Estimated value: <span className="text-on-surface">{o.estimated_value}</span></div>}
                      {o.contact_or_company && <div>Contact/company: <span className="text-on-surface">{o.contact_or_company}</span></div>}
                      {o.partner_role && <div>Partner's role: <span className="text-on-surface">{o.partner_role}</span></div>}
                      {o.workers_needed != null && <div>Workers needed: <span className="text-on-surface">{o.workers_needed}</span></div>}
                      {o.trade_skill && <div>Trade/skill: <span className="text-on-surface">{o.trade_skill}</span></div>}
                      <div>Confidentiality: <span className="text-on-surface">{o.confidentiality_level.replace(/_/g, ' ')}</span></div>
                    </div>

                    {o.partner_opportunity_documents.length > 0 && (
                      <div>
                        <div className="text-xs text-on-surface-variant/60 mb-1">Documents</div>
                        <div className="flex flex-wrap gap-2">
                          {o.partner_opportunity_documents.map((d) => (
                            <button key={d.id} onClick={() => openDocument(d.id)} className="text-xs px-2 py-1 border border-outline-variant/20 text-primary hover:border-primary transition-colors">
                              {d.file_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-on-surface-variant/60 mb-1">Status</div>
                        <select
                          value={o.status}
                          onChange={(e) => patchOpportunity(o.id, { status: e.target.value })}
                          disabled={savingId === o.id}
                          className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface w-full"
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-on-surface-variant/60 mb-1">Visibility</div>
                        <select
                          value={o.visibility_scope}
                          onChange={(e) => patchOpportunity(o.id, { visibility_scope: e.target.value })}
                          disabled={savingId === o.id}
                          className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface w-full"
                        >
                          <option value="private">Private</option>
                          <option value="selective">Shared Selectively</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-on-surface-variant/60 mb-1">Admin notes (e.g. reason for "More Information Required")</div>
                      <textarea
                        value={draft.admin_notes}
                        onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: { ...draft, admin_notes: e.target.value } }))}
                        rows={2}
                        className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface w-full resize-none"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-on-surface-variant/60 mb-1">Fees & commission notes</div>
                      <textarea
                        value={draft.commission_notes}
                        onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: { ...draft, commission_notes: e.target.value } }))}
                        rows={2}
                        className="bg-surface-container border border-outline-variant/20 px-3 py-2 text-sm text-on-surface w-full resize-none"
                      />
                    </div>
                    <button
                      onClick={() => patchOpportunity(o.id, { admin_notes: draft.admin_notes, commission_notes: draft.commission_notes })}
                      disabled={savingId === o.id}
                      className="self-start text-xs px-4 py-2 border border-primary/40 text-primary hover:border-primary transition-colors disabled:opacity-40"
                    >
                      Save Notes
                    </button>
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
