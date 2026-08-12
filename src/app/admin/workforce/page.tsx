'use client';
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';


interface WorkforceRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  current_location: string;
  trade_category: string;
  specific_role: string;
  years_experience: number;
  certifications: string | null;
  preferred_destinations: string[];
  availability: string;
  passport_status: string;
  medical_status: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  registered: { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
  shortlisted: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  placed: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  inactive: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.35)' },
};

const tabs = [
  { label: 'All', value: '' },
  { label: 'Registered', value: 'registered' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Placed', value: 'placed' },
];

export default function WorkforcePage() {
  const [records, setRecords] = useState<WorkforceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkforceRecord | null>(null);
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

      const res = await fetch(`/api/admin/workforce?${params}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch workforce records:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchDebounced]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, searchDebounced]);

  function openDetail(record: WorkforceRecord) {
    setSelected(record);
    setEditNotes(record.notes || '');
    setEditStatus(record.status);
  }

  async function saveChanges() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/workforce/${selected.id}`, {
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
    const headers = ['Name', 'Email', 'Phone', 'Nationality', 'Location', 'Trade', 'Role', 'Experience', 'Certifications', 'Destinations', 'Availability', 'Passport', 'Medical', 'Status', 'Notes', 'Date'];
    const rows = records.map(r => [
      r.full_name, r.email, r.phone, r.nationality, r.current_location,
      r.trade_category, r.specific_role, r.years_experience,
      r.certifications || '', (r.preferred_destinations || []).join('; '),
      r.availability, r.passport_status, r.medical_status, r.status,
      r.notes || '', new Date(r.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce-registry-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatAvailability(val: string) {
    return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatPassport(val: string) {
    if (val === 'valid') return 'Valid';
    if (val === 'expired') return 'Expired / Renewal';
    if (val === 'none') return 'No Passport';
    return val;
  }

  function formatMedical(val: string) {
    if (val === 'gamca_cleared') return 'GAMCA Cleared';
    if (val === 'other_medical') return 'Other Medical';
    if (val === 'not_done') return 'Not Done';
    return val;
  }

  return (
    <>
      <style>{`
        .wf-page { padding: 32px; max-width: 1400px; }
        .wf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .wf-title { font-family: 'Cinzel', serif; font-size: 24px; color: #fff; font-weight: 600; margin: 0; }
        .wf-title span { color: #c9a84c; }
        .wf-count { font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.35); margin-left: 12px; }
        .wf-actions { display: flex; gap: 10px; align-items: center; }
        .wf-export {
          padding: 9px 20px; border-radius: 4px; border: 1px solid rgba(201,168,76,0.3);
          background: transparent; color: #c9a84c; font-family: 'Raleway', sans-serif;
          font-size: 12px; cursor: pointer; transition: all 0.2s; font-weight: 500;
          letter-spacing: 0.5px;
        }
        .wf-export:hover { border-color: #c9a84c; background: rgba(201,168,76,0.06); }
        .wf-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .wf-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 3px; }
        .wf-tab {
          padding: 8px 18px; border-radius: 4px; border: none; background: transparent;
          color: rgba(255,255,255,0.4); font-family: 'Raleway', sans-serif; font-size: 12px;
          cursor: pointer; transition: all 0.2s; font-weight: 500; letter-spacing: 0.3px;
        }
        .wf-tab:hover { color: rgba(255,255,255,0.7); }
        .wf-tab.active { background: rgba(201,168,76,0.1); color: #c9a84c; }
        .wf-search {
          flex: 1; min-width: 200px; max-width: 320px; padding: 9px 14px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px; color: #fff; font-family: 'Raleway', sans-serif;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .wf-search:focus { border-color: rgba(201,168,76,0.4); }
        .wf-search::placeholder { color: rgba(255,255,255,0.2); }
        .wf-table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
        .wf-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .wf-table th {
          text-align: left; padding: 12px 14px; font-family: 'Raleway', sans-serif;
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .wf-table td {
          padding: 12px 14px; font-family: 'Raleway', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.65); border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .wf-table tbody tr { cursor: pointer; transition: background 0.15s; }
        .wf-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        .wf-table tbody tr.active { background: rgba(201,168,76,0.04); }
        .wf-name { color: #fff; font-weight: 500; }
        .wf-badge {
          display: inline-block; padding: 3px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: capitalize;
        }
        .wf-dest-pills { display: flex; flex-wrap: wrap; gap: 4px; }
        .wf-dest-pill {
          padding: 2px 8px; border-radius: 999px; font-size: 10px;
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45);
          white-space: nowrap;
        }
        .wf-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
        .wf-page-btn {
          padding: 7px 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);
          background: transparent; color: rgba(255,255,255,0.5); font-family: 'Raleway', sans-serif;
          font-size: 12px; cursor: pointer; transition: all 0.2s;
        }
        .wf-page-btn:hover:not(:disabled) { border-color: rgba(201,168,76,0.3); color: #c9a84c; }
        .wf-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .wf-page-info { font-family: 'Raleway', sans-serif; font-size: 12px; color: rgba(255,255,255,0.35); }
        .wf-empty {
          text-align: center; padding: 60px 20px; font-family: 'Raleway', sans-serif;
          font-size: 14px; color: rgba(255,255,255,0.3);
        }
        .wf-loading { text-align: center; padding: 60px 20px; color: rgba(201,168,76,0.5); font-family: 'Raleway', sans-serif; }

        /* Detail Panel */
        .wf-detail-overlay {
          position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.6);
          display: flex; justify-content: flex-end; animation: wfFadeIn 0.2s ease;
        }
        @keyframes wfFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .wf-detail-panel {
          width: 480px; max-width: 100%; height: 100%; background: #0a0a0a;
          border-left: 1px solid rgba(255,255,255,0.06); overflow-y: auto;
          animation: wfSlideIn 0.25s ease; padding: 28px;
        }
        @keyframes wfSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .wf-detail-close {
          float: right; background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 22px; cursor: pointer; width: 32px; height: 32px; display: flex;
          align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;
        }
        .wf-detail-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .wf-detail-name { font-family: 'Cinzel', serif; font-size: 20px; color: #fff; font-weight: 600; margin: 8px 0 4px; }
        .wf-detail-role { font-family: 'Raleway', sans-serif; font-size: 14px; color: #c9a84c; margin-bottom: 20px; }
        .wf-detail-section { margin-bottom: 20px; }
        .wf-detail-label {
          font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; font-weight: 500;
        }
        .wf-detail-value { font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6; }
        .wf-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .wf-detail-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 20px 0; }
        .wf-detail-select {
          width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 13px; outline: none;
          appearance: none; cursor: pointer;
        }
        .wf-detail-select:focus { border-color: rgba(201,168,76,0.4); }
        .wf-detail-select option { background: #111; color: #fff; }
        .wf-detail-textarea {
          width: 100%; min-height: 80px; padding: 10px 12px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 13px; outline: none; resize: vertical;
          box-sizing: border-box;
        }
        .wf-detail-textarea:focus { border-color: rgba(201,168,76,0.4); }
        .wf-detail-save {
          padding: 10px 24px; border-radius: 4px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; font-family: 'Raleway', sans-serif; font-size: 13px; font-weight: 600;
          transition: opacity 0.2s; margin-top: 8px;
        }
        .wf-detail-save:hover { opacity: 0.9; }
        .wf-detail-save:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 768px) { .wf-page { padding: 16px; } .wf-detail-panel { width: 100%; } }
      `}</style>

      <div className="wf-page">
        <div className="wf-header">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <h1 className="wf-title">Workforce <span>Registry</span></h1>
            <span className="wf-count">{total} total</span>
          </div>
          <div className="wf-actions">
            <button className="wf-export" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>

        <div className="wf-controls">
          <div className="wf-tabs">
            {tabs.map(tab => (
              <button
                key={tab.value}
                className={`wf-tab${statusFilter === tab.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            className="wf-search"
            type="text"
            placeholder="Search name, trade, role, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="wf-loading">Loading...</div>
        ) : records.length === 0 ? (
          <div className="wf-empty">No workforce registrations found.</div>
        ) : (
          <>
            <div className="wf-table-wrap">
              <table className="wf-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Trade</th>
                    <th>Role</th>
                    <th>Location</th>
                    <th>Exp</th>
                    <th>Destinations</th>
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
                        <td className="wf-name">{record.full_name}</td>
                        <td>{record.trade_category}</td>
                        <td>{record.specific_role}</td>
                        <td>{record.current_location}</td>
                        <td>{record.years_experience}y</td>
                        <td>
                          <div className="wf-dest-pills">
                            {(record.preferred_destinations || []).slice(0, 3).map(d => (
                              <span key={d} className="wf-dest-pill">{d}</span>
                            ))}
                            {(record.preferred_destinations || []).length > 3 && (
                              <span className="wf-dest-pill">+{record.preferred_destinations.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="wf-badge" style={{ background: sc.bg, color: sc.text }}>
                            {record.status}
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
              <div className="wf-pagination">
                <button className="wf-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="wf-page-info">Page {page} of {totalPages}</span>
                <button className="wf-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="wf-detail-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="wf-detail-panel">
            <button className="wf-detail-close" onClick={() => setSelected(null)}>&times;</button>
            <div className="wf-detail-name">{selected.full_name}</div>
            <div className="wf-detail-role">{selected.specific_role} &mdash; {selected.trade_category}</div>

            <div className="wf-detail-grid">
              <div className="wf-detail-section">
                <div className="wf-detail-label">Email</div>
                <div className="wf-detail-value">{selected.email}</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Phone</div>
                <div className="wf-detail-value">{selected.phone}</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Nationality</div>
                <div className="wf-detail-value">{selected.nationality}</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Location</div>
                <div className="wf-detail-value">{selected.current_location}</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Experience</div>
                <div className="wf-detail-value">{selected.years_experience} years</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Availability</div>
                <div className="wf-detail-value">{formatAvailability(selected.availability)}</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Passport</div>
                <div className="wf-detail-value">{formatPassport(selected.passport_status)}</div>
              </div>
              <div className="wf-detail-section">
                <div className="wf-detail-label">Medical</div>
                <div className="wf-detail-value">{formatMedical(selected.medical_status)}</div>
              </div>
            </div>

            {selected.certifications && (
              <div className="wf-detail-section">
                <div className="wf-detail-label">Certifications</div>
                <div className="wf-detail-value">{selected.certifications}</div>
              </div>
            )}

            {(selected.preferred_destinations || []).length > 0 && (
              <div className="wf-detail-section">
                <div className="wf-detail-label">Preferred Destinations</div>
                <div className="wf-dest-pills" style={{ marginTop: '4px' }}>
                  {selected.preferred_destinations.map(d => (
                    <span key={d} className="wf-dest-pill">{d}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="wf-detail-divider" />

            <div className="wf-detail-section">
              <div className="wf-detail-label">Status</div>
              <select className="wf-detail-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                <option value="registered">Registered</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="placed">Placed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="wf-detail-section">
              <div className="wf-detail-label">Admin Notes</div>
              <textarea
                className="wf-detail-textarea"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Add notes about this candidate..."
              />
            </div>

            <button className="wf-detail-save" onClick={saveChanges} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <div style={{ marginTop: '16px', fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
              Ref: WR-{selected.id.substring(0, 6).toUpperCase()} &middot; Registered {formatDate(selected.created_at)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
