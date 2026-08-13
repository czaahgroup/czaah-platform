'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface WorkerDigitalCardProps {
  worker: {
    id: string;
    full_name: string;
    trade_category: string;
    specific_role: string;
    nationality: string;
    photo_url: string | null;
    status: string;
  };
  onClose: () => void;
}

const statusMeta: Record<string, { label: string; color: string }> = {
  registered: { label: 'Registered', color: '#eab308' },
  shortlisted: { label: 'Shortlisted', color: '#3b82f6' },
  placed: { label: 'Placed', color: '#22c55e' },
  inactive: { label: 'Inactive', color: 'rgba(255,255,255,0.4)' },
};

export function WorkerDigitalCard({ worker, onClose }: WorkerDigitalCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const reference = `WR-${worker.id.substring(0, 6).toUpperCase()}`;
  const photoSrc = worker.photo_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/worker-photos/${worker.photo_url}`
    : null;

  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify/worker/${worker.id}`;
    QRCode.toDataURL(verifyUrl, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(err => console.error('QR generation failed:', err));
  }, [worker.id]);

  const sc = statusMeta[worker.status] || statusMeta.registered;

  return (
    <>
      <style>{`
        .wdc-overlay {
          position: fixed; inset: 0; z-index: 10001;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .wdc-close-btn {
          position: fixed; top: 24px; right: 24px; z-index: 10002;
          background: rgba(255,255,255,0.06); border: none; color: #fff;
          width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
          font-size: 20px; display: flex; align-items: center; justify-content: center;
        }
        .wdc-print-btn {
          position: fixed; top: 24px; right: 76px; z-index: 10002;
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; border: none; padding: 0 20px; height: 40px; border-radius: 20px;
          font-family: 'Raleway', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .wdc-card {
          width: 380px; max-width: 100%; border-radius: 16px; overflow: hidden;
          background: linear-gradient(160deg, #0d0d0d 0%, #050505 100%);
          border: 1px solid rgba(201,168,76,0.25);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .wdc-header {
          padding: 20px 24px; text-align: center;
          background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.02));
          border-bottom: 1px solid rgba(201,168,76,0.2);
        }
        .wdc-logo { font-family: 'Cinzel', serif; font-size: 20px; letter-spacing: 5px; color: #c9a84c; }
        .wdc-tagline { font-family: 'Raleway', sans-serif; font-size: 9px; letter-spacing: 2.5px; color: rgba(255,255,255,0.35); margin-top: 4px; }
        .wdc-body { padding: 28px 24px; text-align: center; }
        .wdc-photo {
          width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 16px;
          overflow: hidden; border: 2px solid rgba(201,168,76,0.5);
          background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center;
        }
        .wdc-photo img { width: 100%; height: 100%; object-fit: cover; }
        .wdc-name { font-family: 'Cinzel', serif; font-size: 19px; color: #fff; font-weight: 600; }
        .wdc-role { font-family: 'Raleway', sans-serif; font-size: 13px; color: #c9a84c; margin-top: 4px; }
        .wdc-badge {
          display: inline-block; margin-top: 12px; padding: 4px 14px; border-radius: 999px;
          font-family: 'Raleway', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .wdc-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 22px 0; }
        .wdc-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; text-align: left; margin-bottom: 22px; }
        .wdc-info-label { font-family: 'Raleway', sans-serif; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 3px; }
        .wdc-info-value { font-family: 'Raleway', sans-serif; font-size: 12px; color: rgba(255,255,255,0.8); }
        .wdc-qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .wdc-qr-wrap img { width: 120px; height: 120px; border-radius: 8px; background: #fff; padding: 6px; }
        .wdc-qr-caption { font-family: 'Raleway', sans-serif; font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.05em; }
        .wdc-footer { padding: 14px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); }
        .wdc-footer-text { font-family: 'Raleway', sans-serif; font-size: 9px; color: rgba(255,255,255,0.25); letter-spacing: 0.03em; }
        @media print {
          body * { visibility: hidden; }
          #wdc-print-area, #wdc-print-area * { visibility: visible; }
          #wdc-print-area { position: absolute; top: 0; left: 0; width: 100%; display: flex; justify-content: center; padding-top: 40px; }
          .wdc-close-btn, .wdc-print-btn { display: none !important; }
        }
      `}</style>

      <div className="wdc-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <button className="wdc-close-btn" onClick={onClose} aria-label="Close">&times;</button>
        <button className="wdc-print-btn" onClick={() => window.print()}>Print / Save PDF</button>

        <div id="wdc-print-area">
          <div className="wdc-card">
            <div className="wdc-header">
              <div className="wdc-logo">CZAAH</div>
              <div className="wdc-tagline">DIGITAL WORKFORCE ID</div>
            </div>

            <div className="wdc-body">
              <div className="wdc-photo">
                {photoSrc ? (
                  <img src={photoSrc} alt={worker.full_name} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'rgba(255,255,255,0.2)' }}>person</span>
                )}
              </div>
              <div className="wdc-name">{worker.full_name}</div>
              <div className="wdc-role">{worker.specific_role} &mdash; {worker.trade_category}</div>
              <div className="wdc-badge" style={{ background: `${sc.color}22`, color: sc.color, border: `1px solid ${sc.color}55` }}>
                {sc.label}
              </div>

              <div className="wdc-divider" />

              <div className="wdc-info-grid">
                <div>
                  <div className="wdc-info-label">Nationality</div>
                  <div className="wdc-info-value">{worker.nationality}</div>
                </div>
                <div>
                  <div className="wdc-info-label">Reference</div>
                  <div className="wdc-info-value">{reference}</div>
                </div>
              </div>

              <div className="wdc-qr-wrap">
                {qrDataUrl && <img src={qrDataUrl} alt="Verification QR code" />}
                <div className="wdc-qr-caption">SCAN TO VERIFY AUTHENTICITY</div>
              </div>
            </div>

            <div className="wdc-footer">
              <div className="wdc-footer-text">This card confirms genuine CZAAH workforce registration &middot; czaah.com</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
