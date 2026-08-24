'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface OEPRegistrationModalProps {
  open: boolean;
  onClose: () => void;
}

const sectorOptions = ['Construction', 'Oil & Gas', 'Healthcare', 'IT & Telecom', 'Hospitality', 'Manufacturing', 'Security', 'Mining', 'Domestic & Household', 'Agriculture', 'Other'];
const destinationOptions = ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Malaysia', 'UK', 'Germany', 'Poland', 'Romania', 'Italy', 'Other'];

export function OEPRegistrationModal({ open, onClose }: OEPRegistrationModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    licenseNumber: '',
    contactPerson: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    headOfficeLocation: '',
    yearsInOperation: 1,
    sectorsSpecialization: [] as string[],
    destinationCountries: [] as string[],
    monthlyPlacementCapacity: '',
    companyWebsite: '',
    notes: '',
    identityDocument: '',
  });
  const [identityDocName, setIdentityDocName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function updateField(field: string, value: unknown) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleIdentityDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Identity document must be under 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdentityDocName(file.name);
      updateField('identityDocument', reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function toggleValue(field: 'sectorsSpecialization' | 'destinationCountries', value: string) {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.identityDocument) {
      setError('Please upload a copy of your OEP license certificate — registrations cannot be approved without one.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/public/oep/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monthlyPlacementCapacity: formData.monthlyPlacementCapacity ? parseInt(formData.monthlyPlacementCapacity, 10) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      router.push('/pending');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      <style>{`
        .oep-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: oepFadeIn 0.25s ease;
        }
        @keyframes oepFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .oep-modal {
          background: #080808; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; max-width: 600px; width: 100%;
          max-height: 90vh; overflow-y: auto; position: relative;
          animation: oepSlideUp 0.3s ease;
        }
        @keyframes oepSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .oep-modal::-webkit-scrollbar { width: 6px; }
        .oep-modal::-webkit-scrollbar-track { background: transparent; }
        .oep-modal::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 3px; }
        .oep-close {
          position: absolute; top: 16px; right: 16px; z-index: 2;
          background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 24px; cursor: pointer; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: all 0.2s;
        }
        .oep-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .oep-header { padding: 32px 32px 0; }
        .oep-icon { margin-bottom: 16px; }
        .oep-title {
          font-family: 'Cinzel', serif; font-size: 22px; font-weight: 600;
          color: #fff; margin: 0 0 8px;
        }
        .oep-subtitle {
          font-family: 'Raleway', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.45); line-height: 1.6; margin: 0;
        }
        .oep-form { padding: 28px 32px 32px; display: flex; flex-direction: column; gap: 18px; }
        .oep-field label {
          display: block; font-family: 'Raleway', sans-serif; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5);
          margin-bottom: 7px; font-weight: 500;
        }
        .oep-field label .req { color: #c9a84c; }
        .oep-input, .oep-select, .oep-textarea {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
          padding: 12px 14px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 14px;
          transition: border-color 0.2s; outline: none;
          box-sizing: border-box;
        }
        .oep-input:focus, .oep-select:focus, .oep-textarea:focus {
          border-color: rgba(201,168,76,0.5);
        }
        .oep-input::placeholder, .oep-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .oep-textarea { resize: vertical; min-height: 70px; }
        .oep-hint {
          font-family: 'Raleway', sans-serif; font-size: 11px;
          color: rgba(255,255,255,0.3); margin-top: 6px;
        }
        .oep-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .oep-pill {
          padding: 7px 16px; border-radius: 999px; font-family: 'Raleway', sans-serif;
          font-size: 12px; font-weight: 400; cursor: pointer; user-select: none;
          border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);
          background: transparent; transition: all 0.2s;
        }
        .oep-pill:hover { border-color: rgba(201,168,76,0.3); color: rgba(255,255,255,0.7); }
        .oep-pill.selected {
          border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.08);
          font-weight: 500;
        }
        .oep-submit {
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; font-family: 'Raleway', sans-serif; font-weight: 600;
          font-size: 14px; letter-spacing: 0.05em; padding: 14px 32px;
          border-radius: 4px; border: none; cursor: pointer; width: 100%;
          transition: opacity 0.2s; margin-top: 4px;
        }
        .oep-submit:hover { opacity: 0.9; }
        .oep-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .oep-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 6px; padding: 12px 16px; color: #f87171;
          font-family: 'Raleway', sans-serif; font-size: 13px;
        }
        @media (max-width: 640px) {
          .oep-header, .oep-form { padding-left: 20px; padding-right: 20px; }
          .oep-title { font-size: 19px; }
        }
      `}</style>

      <div className="oep-overlay" onClick={handleOverlayClick}>
        <div className="oep-modal">
          <button className="oep-close" onClick={onClose} aria-label="Close">&times;</button>

          <>
            <div className="oep-header">
                <div className="oep-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#c9a84c' }}>flight_takeoff</span>
                </div>
                <h2 className="oep-title">Register as an Employment Promoter</h2>
                <p className="oep-subtitle">Licensed recruitment agencies can register with CZAAH to join our verified partner network for cross-border workforce deployment.</p>
              </div>

              <form className="oep-form" onSubmit={handleSubmit}>
                {error && <div className="oep-error">{error}</div>}

                {/* Company Name */}
                <div className="oep-field">
                  <label>Company Name <span className="req">*</span></label>
                  <input className="oep-input" type="text" placeholder="Enter your agency's registered name" required
                    value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} />
                </div>

                {/* License Number */}
                <div className="oep-field">
                  <label>OEP License Number <span className="req">*</span></label>
                  <input className="oep-input" type="text" placeholder="e.g. BE&OE/OEP/1234" required
                    value={formData.licenseNumber} onChange={e => updateField('licenseNumber', e.target.value)} />
                  <div className="oep-hint">As issued by the Bureau of Emigration &amp; Overseas Employment (or relevant licensing authority).</div>
                </div>

                {/* Identity Document */}
                <div className="oep-field">
                  <label>OEP License Certificate <span className="req">*</span></label>
                  <label className="oep-pill" style={{ padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                    {identityDocName ? identityDocName : 'Upload Certificate'}
                    <input type="file" accept="image/*,.pdf" onChange={handleIdentityDocChange} style={{ display: 'none' }} />
                  </label>
                  <div className="oep-hint">A scanned copy of your license certificate. Required for admin approval. Images or PDF, up to 8MB.</div>
                </div>

                {/* Contact Person */}
                <div className="oep-field">
                  <label>Contact Person <span className="req">*</span></label>
                  <input className="oep-input" type="text" placeholder="Full name" required
                    value={formData.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} />
                </div>

                {/* Email */}
                <div className="oep-field">
                  <label>Email <span className="req">*</span></label>
                  <input className="oep-input" type="email" placeholder="your.email@agency.com" required
                    value={formData.email} onChange={e => updateField('email', e.target.value)} />
                </div>

                {/* Phone */}
                <div className="oep-field">
                  <label>Phone with Country Code <span className="req">*</span></label>
                  <input className="oep-input" type="text" placeholder="+92 300 1234567" required
                    value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>

                {/* Password */}
                <div className="oep-field">
                  <label>Password <span className="req">*</span></label>
                  <input className="oep-input" type="password" placeholder="Min. 8 characters" required
                    value={formData.password} onChange={e => updateField('password', e.target.value)} />
                </div>

                {/* Confirm Password */}
                <div className="oep-field">
                  <label>Confirm Password <span className="req">*</span></label>
                  <input className="oep-input" type="password" placeholder="Re-enter your password" required
                    value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} />
                </div>

                {/* Head Office Location */}
                <div className="oep-field">
                  <label>Head Office Location <span className="req">*</span></label>
                  <input className="oep-input" type="text" placeholder="e.g. Lahore, Punjab, Pakistan" required
                    value={formData.headOfficeLocation} onChange={e => updateField('headOfficeLocation', e.target.value)} />
                </div>

                {/* Years in Operation */}
                <div className="oep-field">
                  <label>Years in Operation</label>
                  <input className="oep-input" type="number" min="0" placeholder="1"
                    value={formData.yearsInOperation} onChange={e => updateField('yearsInOperation', parseInt(e.target.value) || 0)} />
                </div>

                {/* Sectors Specialization */}
                <div className="oep-field">
                  <label>Sector Specialization</label>
                  <div className="oep-pills">
                    {sectorOptions.map(s => (
                      <div key={s}
                        className={`oep-pill${formData.sectorsSpecialization.includes(s) ? ' selected' : ''}`}
                        onClick={() => toggleValue('sectorsSpecialization', s)}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Destination Countries */}
                <div className="oep-field">
                  <label>Destination Countries Served</label>
                  <div className="oep-pills">
                    {destinationOptions.map(d => (
                      <div key={d}
                        className={`oep-pill${formData.destinationCountries.includes(d) ? ' selected' : ''}`}
                        onClick={() => toggleValue('destinationCountries', d)}>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Placement Capacity */}
                <div className="oep-field">
                  <label>Average Monthly Placement Capacity</label>
                  <input className="oep-input" type="number" min="0" placeholder="e.g. 50"
                    value={formData.monthlyPlacementCapacity} onChange={e => updateField('monthlyPlacementCapacity', e.target.value)} />
                </div>

                {/* Company Website */}
                <div className="oep-field">
                  <label>Company Website</label>
                  <input className="oep-input" type="url" placeholder="https://www.example.com"
                    value={formData.companyWebsite} onChange={e => updateField('companyWebsite', e.target.value)} />
                </div>

                {/* Additional Notes */}
                <div className="oep-field">
                  <label>Additional Notes</label>
                  <textarea className="oep-textarea" placeholder="Any additional information about your agency..."
                    value={formData.notes} onChange={e => updateField('notes', e.target.value)} />
                </div>

                <button type="submit" className="oep-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </form>
          </>
        </div>
      </div>
    </>
  );
}
