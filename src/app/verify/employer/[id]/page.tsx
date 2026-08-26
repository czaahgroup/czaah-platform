'use client';

import { useEffect, useState, use } from 'react';

interface VerifyData {
  id: string;
  company_name: string;
  industry: string;
  country: string;
  status: string;
  created_at: string;
  reference: string;
}

const statusMeta: Record<string, { label: string; color: string }> = {
  registered: { label: 'Registered', color: '#eab308' },
  contacted: { label: 'Contacted', color: '#3b82f6' },
  active_client: { label: 'Active Client', color: '#22c55e' },
  inactive: { label: 'Inactive', color: 'rgba(255,255,255,0.4)' },
};

export default function VerifyEmployerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<VerifyData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/public/employer/verify/${id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', letterSpacing: '6px', color: '#c9a84c' }}>CZAAH</div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
            EMPLOYER VERIFICATION
          </div>
        </div>

        <div style={{ padding: '32px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: "'Raleway', sans-serif", color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              Verifying&hellip;
            </div>
          ) : notFound || !data ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ef4444',
              }}>&times;</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Not Verified</div>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                This reference does not match any record in CZAAH&apos;s employer database.
              </p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 16px',
                  border: '2px solid rgba(201,168,76,0.4)',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(201,168,76,0.6)' }}>apartment</span>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '999px', padding: '5px 14px', marginBottom: '14px',
                }}>
                  <span style={{ color: '#22c55e', fontSize: '14px' }}>&#10003;</span>
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#22c55e', textTransform: 'uppercase' }}>
                    Verified Employer
                  </span>
                </div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: '#fff', fontWeight: 600 }}>{data.company_name}</div>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#c9a84c', marginTop: '4px' }}>
                  {data.industry}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Country</div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{data.country}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: statusMeta[data.status]?.color || '#fff', fontWeight: 600 }}>
                    {statusMeta[data.status]?.label || data.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Reference</div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{data.reference}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Registered</div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                    {new Date(data.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, marginTop: '20px', textAlign: 'center' }}>
                This is an official verification record from CZAAH Group&apos;s employer database. For workforce enquiries, contact us at czaah.com.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
