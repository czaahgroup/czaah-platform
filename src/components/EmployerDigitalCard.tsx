'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface EmployerDigitalCardProps {
  employer: {
    id: string;
    company_name: string;
    industry: string;
    country: string;
    status: string;
  };
  onClose: () => void;
}

const statusMeta: Record<string, { label: string; color: string }> = {
  registered: { label: 'Registered', color: '#eab308' },
  contacted: { label: 'Contacted', color: '#3b82f6' },
  active_client: { label: 'Active Client', color: '#22c55e' },
  inactive: { label: 'Inactive', color: 'rgba(255,255,255,0.4)' },
};

export function EmployerDigitalCard({ employer, onClose }: EmployerDigitalCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const reference = `ER-${employer.id.substring(0, 6).toUpperCase()}`;

  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify/employer/${employer.id}`;
    QRCode.toDataURL(verifyUrl, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(err => console.error('QR generation failed:', err));
  }, [employer.id]);

  const sc = statusMeta[employer.status] || statusMeta.registered;

  return (
    <>
      <style>{`
        .edc-overlay {
          position: fixed; inset: 0; z-index: 10001;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .edc-close-btn {
          position: fixed; top: 24px; right: 24px; z-index: 10002;
          background: rgba(255,255,255,0.06); border: none; color: #fff;
          width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
          font-size: 20px; display: flex; align-items: center; justify-content: center;
        }
        .edc-print-btn {
          position: fixed; top: 24px; right: 76px; z-index: 10002;
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; border: none; padding: 0 20px; height: 40px; border-radius: 20px;
          font-family: 'Raleway', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .edc-card {
          width: 380px; max-width: 100%; border-radius: 16px; overflow: hidden;
          background: linear-gradient(160deg, #0d0d0d 0%, #050505 100%);
          border: 1px solid rgba(201,168,76,0.25);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .edc-header {
          padding: 20px 24px; text-align: center;
          background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.02));
          border-bottom: 1px solid rgba(201,168,76,0.2);
        }
        .edc-logo { font-family: 'Cinzel', serif; font-size: 20px; letter-spacing: 5px; color: #c9a84c; }
        .edc-tagline { font-family: 'Raleway', sans-serif; font-size: 9px; letter-spacing: 2.5px; color: rgba(255,255,255,0.35); margin-top: 4px; }
        .edc-body { padding: 28px 24px; text-align: center; }
        .edc-icon {
          width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 16px;
          border: 2px solid rgba(201,168,76,0.5);
          background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center;
        }
        .edc-name { font-family: 'Cinzel', serif; font-size: 19px; color: #fff; font-weight: 600; }
        .edc-role { font-family: 'Raleway', sans-serif; font-size: 13px; color: #c9a84c; margin-top: 4px; }
        .edc-badge {
          display: inline-block; margin-top: 12px; padding: 4px 14px; border-radius: 999px;
          font-family: 'Raleway', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .edc-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 22px 0; }
        .edc-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; text-align: left; margin-bottom: 22px; }
        .edc-info-label { font-family: 'Raleway', sans-serif; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 3px; }
        .edc-info-value { font-family: 'Raleway', sans-serif; font-size: 12px; color: rgba(255,255,255,0.8); }
        .edc-qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .edc-qr-wrap img { width: 120px; height: 120px; border-radius: 8px; background: #fff; padding: 6px; }
        .edc-qr-caption { font-family: 'Raleway', sans-serif; font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.05em; }
        .edc-footer { padding: 14px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); }
        .edc-footer-text { font-family: 'Raleway', sans-serif; font-size: 9px; color: rgba(255,255,255,0.25); letter-spacing: 0.03em; }
        @media print {
          body * { visibility: hidden; }
          #edc-print-area, #edc-print-area * { visibility: visible; }
          #edc-print-area { position: absolute; top: 0; left: 0; width: 100%; display: flex; justify-content: center; padding-top: 40px; }
          .edc-close-btn, .edc-print-btn { display: none !important; }
        }
      `}</style>

      <div className="edc-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <button className="edc-close-btn" onClick={onClose} aria-label="Close">&times;</button>
        <button className="edc-print-btn" onClick={() => window.print()}>Print / Save PDF</button>

        <div id="edc-print-area">
          <div className="edc-card">
            <div className="edc-header">
              <div className="edc-logo">CZAAH</div>
              <div className="edc-tagline">EMPLOYER CERTIFICATE</div>
            </div>

            <div className="edc-body">
              <div className="edc-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(201,168,76,0.7)' }}>apartment</span>
              </div>
              <div className="edc-name">{employer.company_name}</div>
              <div className="edc-role">{employer.industry}</div>
              <div className="edc-badge" style={{ background: `${sc.color}22`, color: sc.color, border: `1px solid ${sc.color}55` }}>
                {sc.label}
              </div>

              <div className="edc-divider" />

              <div className="edc-info-grid">
                <div>
                  <div className="edc-info-label">Country</div>
                  <div className="edc-info-value">{employer.country}</div>
                </div>
                <div>
                  <div className="edc-info-label">Reference</div>
                  <div className="edc-info-value">{reference}</div>
                </div>
              </div>

              <div className="edc-qr-wrap">
                {qrDataUrl && <img src={qrDataUrl} alt="Verification QR code" />}
                <div className="edc-qr-caption">SCAN TO VERIFY AUTHENTICITY</div>
              </div>
            </div>

            <div className="edc-footer">
              <div className="edc-footer-text">This certificate confirms genuine CZAAH employer registration &middot; czaah.com</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
