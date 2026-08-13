'use client';
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';


interface EmployerRecord {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  roles_needed: string;
  workers_needed: number;
  hiring_timeline: string;
  preferred_nationalities: string[];
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  registered: { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
  contacted: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  active_client: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  inactive: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.35)' },
};

const tabs = [
  { label: 'All', value: '' },
  { label: 'Registered', value: 'registered' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Active Client', value: 'active_client' },
];

export default function EmployersPage() {
  const [records, setRecords] = useState<EmployerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployerRecord | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (searchDebounced) params.set('search', searchDebounced);

      const res = await fetch(`/api/admin/employers?${params}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch employer records:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchDebounced]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced]);

  function openDetail(record: EmployerRecord) {
    setSelected(record);
    setEditNotes(record.notes || '');
    setEditStatus(record.status);
  }

  async function saveChanges() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employers/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, notes: editNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        setSelected(updated);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    if (!records.length) return;
    const headers = ['Company', 'Contact Person', 'Email', 'Phone', 'Country', 'Industry', 'Roles Needed', 'Workers Needed', 'Timeline', 'Preferred Nationalities', 'Status', 'Notes', 'Date'];
    const rows = records.map(r => [
      r.company_name, r.contact_person, r.email, r.phone, r.country,
      r.industry, r.roles_needed, r.workers_needed, r.hiring_timeline,
      (r.preferred_nationalities || []).join('; '), r.status,
      r.notes || '', new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employer-registry-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTimeline(val: string) {
    return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatStatus(val: string) {
    return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return (
    <>
      <style>{`
        .em-page { padding: 32px; max-width: 1400px; }
        .em-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .em-title { font-family: 'Cinzel', serif; font-size: 24px; color: #fff; font-weight: 600; margin: 0; }
        .em-title span { color: #c9a84c; }
        .em-count { font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.35); margin-left: 12px; }
        .em-actions { display: flex; gap: 10px; align-items: center; }
        .em-export {
          padding: 9px 20px; border-radius: 4px; border: 1px solid rgba(201,168,76,0.3);
          background: transparent; color: #c9a84c; font-family: 'Raleway', sans-serif;
          font-size: 12px; cursor: pointer; transition: all 0.2s; font-weight: 500;
          letter-spacing: 0.5px;
        }
        .em-export:hover { border-color: #c9a84c; background: rgba(201,168,76,0.06); }
        .em-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .em-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 3px; }
        .em-tab {
          padding: 8px 18px; border-radius: 4px; border: none; background: transparent;
          color: rgba(255,255,255,0.4); font-family: 'Raleway', sans-serif; font-size: 12px;
          cursor: pointer; transition: all 0.2s; font-weight: 500; letter-spacing: 0.3px;
        }
        .em-tab:hover { color: rgba(255,255,255,0.7); }
        .em-tab.active { background: rgba(201,168,76,0.1); color: #c9a84c; }
        .em-search {
          flex: 1; min-width: 200px; max-width: 320px; padding: 9px 14px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px; color: #fff; font-family: 'Raleway', sans-serif;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .em-search:focus { border-color: rgba(201,168,76,0.4); }
        .em-search::placeholder { color: rgba(255,255,255,0.2); }
        .em-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
        .em-table { width: 100%; border-collapse: collapse; min-width: 900px; }
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
        }
        .em-dest-pills { display: flex; flex-wrap: wrap; gap: 4px; }
        .em-dest-pill {
          padding: 2px 8px; border-radius: 999px; font-size: 10px;
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45);
          white-space: nowrap;
        }
        .em-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
        .em-page-btn {
          padding: 7px 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);
          background: transparent; color: rgba(255,255,255,0.5); font-family: 'Raleway', sans-serif;
          font-size: 12px; cursor: pointer; transition: all 0.2s;
        }
        .em-page-btn:hover:not(:disabled) { border-color: rgba(201,168,76,0.3); color: #c9a84c; }
        .em-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .em-page-info { font-family: 'Raleway', sans-serif; font-size: 12px; color: rgba(255,255,255,0.35); }
        .em-empty {
          text-align: center; padding: 60px 20px; font-family: 'Raleway', sans-serif;
          font-size: 14px; color: rgba(255,255,255,0.3);
        }
        .em-loading { text-align: center; padding: 60px 20px; color: rgba(201,168,76,0.5); font-family: 'Raleway', sans-serif; }

        /* Detail Panel */
        .em-detail-overlay {
          position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.6);
          display: flex; justify-content: flex-end; animation: emFadeIn 0.2s ease;
        }
        @keyframes emFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .em-detail-panel {
          width: 480px; max-width: 100%; height: 100%; background: #0a0a0a;
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
        .em-detail-role { font-family: 'Raleway', sans-serif; font-size: 14px; color: #c9a84c; margin-bottom: 20px; }
        .em-detail-section { margin-bottom: 20px; }
        .em-detail-label {
          font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; font-weight: 500;
        }
        .em-detail-value { font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6; }
        .em-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .em-detail-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 20px 0; }
        .em-detail-select {
          width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 13px; outline: none;
          appearance: none; cursor: pointer;
        }
        .em-detail-select:focus { border-color: rgba(201,168,76,0.4); }
        .em-detail-select option { background: #111; color: #fff; }
        .em-detail-textarea {
          width: 100%; min-height: 80px; padding: 10px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 13px; outline: none; resize: vertical;
          box-sizing: border-box;
        }
        .em-detail-textarea:focus { border-color: rgba(201,168,76,0.4); }
        .em-detail-save {
          padding: 10px 24px; border-radius: 4px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; font-family: 'Raleway', sans-serif; font-size: 13px; font-weight: 600;
          transition: opacity 0.2s; margin-top: 8px;
        }
        .em-detail-save:hover { opacity: 0.9; }
        .em-detail-save:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 768px) { .em-page { padding: 16px; } .em-detail-panel { width: 100%; } }
      `}</style>

      <div className="em-page">
        <div className="em-header">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <h1 className="em-title">Employer <span>Registry</span></h1>
            <span className="em-count">{total} total</span>
          </div>
          <div className="em-actions">
            <button className="em-export" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>

        <div className="em-controls">
          <div className="em-tabs">
            {tabs.map(tab => (
              <button
                key={tab.value}
                className={`em-tab${statusFilter === tab.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            className="em-search"
            type="text"
            placeholder="Search company, contact, industry, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="em-loading">Loading...</div>
        ) : records.length === 0 ? (
          <div className="em-empty">No employer registrations found.</div>
        ) : (
          <>
            <div className="em-table-wrap">
              <table className="em-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Industry</th>
                    <th>Roles Needed</th>
                    <th>Workers</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => {
                    const sc = statusColors[record.status] || statusColors.registered;
                    return (
                      <tr
                        key={record.id}
                        className={selected?.id === record.id ? 'active' : ''}
                        onClick={() => openDetail(record)}
                      >
                        <td className="em-name">{record.company_name}</td>
                        <td>{record.contact_person}</td>
                        <td>{record.industry}</td>
                        <td>{record.roles_needed}</td>
                        <td>{record.workers_needed}</td>
                        <td>{record.country}</td>
                        <td>
                          <span className="em-badge" style={{ background: sc.bg, color: sc.text }}>
                            {formatStatus(record.status)}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(record.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="em-pagination">
                <button className="em-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="em-page-info">Page {page} of {totalPages}</span>
                <button className="em-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="em-detail-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="em-detail-panel">
            <button className="em-detail-close" onClick={() => setSelected(null)}>&times;</button>
            <div className="em-detail-name">{selected.company_name}</div>
            <div className="em-detail-role">{selected.contact_person} &mdash; {selected.industry}</div>

            <div className="em-detail-grid">
              <div className="em-detail-section">
                <div className="em-detail-label">Email</div>
                <div className="em-detail-value">{selected.email}</div>
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Phone</div>
                <div className="em-detail-value">{selected.phone}</div>
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Country</div>
                <div className="em-detail-value">{selected.country}</div>
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Workers Needed</div>
                <div className="em-detail-value">{selected.workers_needed}</div>
              </div>
              <div className="em-detail-section">
                <div className="em-detail-label">Hiring Timeline</div>
                <div className="em-detail-value">{formatTimeline(selected.hiring_timeline)}</div>
              </div>
            </div>

            <div className="em-detail-section">
              <div className="em-detail-label">Roles Needed</div>
              <div className="em-detail-value">{selected.roles_needed}</div>
            </div>

            {(selected.preferred_nationalities || []).length > 0 && (
              <div className="em-detail-section">
                <div className="em-detail-label">Preferred Nationalities</div>
                <div className="em-dest-pills" style={{ marginTop: '4px' }}>
                  {selected.preferred_nationalities.map(n => (
                    <span key={n} className="em-dest-pill">{n}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="em-detail-divider" />

            <div className="em-detail-section">
              <div className="em-detail-label">Status</div>
              <select className="em-detail-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                <option value="registered">Registered</option>
                <option value="contacted">Contacted</option>
                <option value="active_client">Active Client</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="em-detail-section">
              <div className="em-detail-label">Admin Notes</div>
              <textarea
                className="em-detail-textarea"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Add notes about this employer..."
              />
            </div>

            <button className="em-detail-save" onClick={saveChanges} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <div style={{ marginTop: '16px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
              Ref: ER-{selected.id.substring(0, 6).toUpperCase()} &middot; Registered {formatDate(selected.created_at)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
