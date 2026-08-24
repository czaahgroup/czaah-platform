'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface EmployerRegistrationModalProps {
  open: boolean;
  onClose: () => void;
}

const industries = ['Construction', 'Oil & Gas', 'Healthcare', 'IT & Telecom', 'Hospitality', 'Manufacturing', 'Security', 'Mining', 'Agriculture', 'Transportation', 'Other'];
const nationalityOptions = ['Pakistan', 'Bangladesh', 'Nepal', 'India', 'Sri Lanka', 'Philippines', 'Other'];

// Country-specific guidance on what proves a company is real — keyed by lowercase country name.
// Falls back to generic wording below when the typed country isn't in this list.
const macedoniaHint = 'For North Macedonia: upload your Central Registry (CRM) trade register extract — shows your registry and tax number — plus the ID/passport of the person registering.';
const bosniaHint = 'For Bosnia and Herzegovina: upload your court register extract (Federation of BiH, Republika Srpska, or Brčko District, as applicable) plus the ID/passport of the person registering.';

const countryDocHints: Record<string, string> = {
  serbia: 'For Serbia: upload your APR extract (Izvod iz APR — shows your matični broj and PIB) plus the ID/passport of the person registering.',
  albania: 'For Albania: upload your QKB extract (Ekstrakt i regjistrit — shows your NIPT tax number) plus the ID/passport of the person registering.',
  kosovo: 'For Kosovo: upload your ARBK business certificate/extract (shows your fiscal number) plus the ID/passport of the person registering.',
  croatia: 'For Croatia: upload your Sudski registar (court register) extract — shows your OIB — plus the ID/passport of the person registering.',
  montenegro: 'For Montenegro: upload your CRPS extract (Centralni registar privrednih subjekata) plus the ID/passport of the person registering.',
  'north macedonia': macedoniaHint,
  macedonia: macedoniaHint,
  'bosnia and herzegovina': bosniaHint,
  bosnia: bosniaHint,
  romania: 'For Romania: upload your Certificat Constatator from ONRC (shows your CUI) plus the ID/passport of the person registering.',
  bulgaria: 'For Bulgaria: upload your Commercial Register (Targovski Registar) extract — shows your EIK — plus the ID/passport of the person registering.',
};

function getDocHint(country: string): string | null {
  const key = country.trim().toLowerCase();
  return countryDocHints[key] || null;
}

export function EmployerRegistrationModal({ open, onClose }: EmployerRegistrationModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    industry: '',
    rolesNeeded: '',
    workersNeeded: 1,
    hiringTimeline: 'immediate',
    preferredNationalities: [] as string[],
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

  function toggleNationality(nat: string) {
    setFormData(prev => {
      const current = prev.preferredNationalities;
      if (current.includes(nat)) {
        return { ...prev, preferredNationalities: current.filter(n => n !== nat) };
      }
      return { ...prev, preferredNationalities: [...current, nat] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.identityDocument) {
      setError('Please upload an identity document — registrations cannot be approved without one.');
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
      const res = await fetch('/api/public/employer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        .erm-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: ermFadeIn 0.25s ease;
        }
        @keyframes ermFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .erm-modal {
          background: #080808; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; max-width: 600px; width: 100%;
          max-height: 90vh; overflow-y: auto; position: relative;
          animation: ermSlideUp 0.3s ease;
        }
        @keyframes ermSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .erm-modal::-webkit-scrollbar { width: 6px; }
        .erm-modal::-webkit-scrollbar-track { background: transparent; }
        .erm-modal::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 3px; }
        .erm-close {
          position: absolute; top: 16px; right: 16px; z-index: 2;
          background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 24px; cursor: pointer; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: all 0.2s;
        }
        .erm-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .erm-header { padding: 32px 32px 0; }
        .erm-icon { margin-bottom: 16px; }
        .erm-title {
          font-family: 'Cinzel', serif; font-size: 22px; font-weight: 600;
          color: #fff; margin: 0 0 8px;
        }
        .erm-subtitle {
          font-family: 'Raleway', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.45); line-height: 1.6; margin: 0;
        }
        .erm-form { padding: 28px 32px 32px; display: flex; flex-direction: column; gap: 18px; }
        .erm-field label {
          display: block; font-family: 'Raleway', sans-serif; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5);
          margin-bottom: 7px; font-weight: 500;
        }
        .erm-field label .req { color: #c9a84c; }
        .erm-input, .erm-select, .erm-textarea {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
          padding: 12px 14px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 14px;
          transition: border-color 0.2s; outline: none;
          box-sizing: border-box;
        }
        .erm-input:focus, .erm-select:focus, .erm-textarea:focus {
          border-color: rgba(201,168,76,0.5);
        }
        .erm-input::placeholder, .erm-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .erm-select { appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c9a84c' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center;
          padding-right: 36px;
        }
        .erm-select option { background: #111; color: #fff; }
        .erm-textarea { resize: vertical; min-height: 70px; }
        .erm-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .erm-pill {
          padding: 7px 16px; border-radius: 999px; font-family: 'Raleway', sans-serif;
          font-size: 12px; font-weight: 400; cursor: pointer; user-select: none;
          border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);
          background: transparent; transition: all 0.2s;
        }
        .erm-pill:hover { border-color: rgba(201,168,76,0.3); color: rgba(255,255,255,0.7); }
        .erm-pill.selected {
          border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.08);
          font-weight: 500;
        }
        .erm-radio-group { display: flex; flex-direction: column; gap: 8px; }
        .erm-radio {
          display: flex; align-items: center; gap: 10px; cursor: pointer;
          font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.55);
          transition: color 0.2s;
        }
        .erm-radio:hover { color: rgba(255,255,255,0.8); }
        .erm-radio input[type="radio"] { display: none; }
        .erm-radio-dot {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.15); transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .erm-radio input:checked + .erm-radio-dot {
          border-color: #c9a84c;
        }
        .erm-radio input:checked + .erm-radio-dot::after {
          content: ''; width: 8px; height: 8px; border-radius: 50%; background: #c9a84c;
        }
        .erm-radio input:checked ~ span { color: #fff; }
        .erm-submit {
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; font-family: 'Raleway', sans-serif; font-weight: 600;
          font-size: 14px; letter-spacing: 0.05em; padding: 14px 32px;
          border-radius: 4px; border: none; cursor: pointer; width: 100%;
          transition: opacity 0.2s; margin-top: 4px;
        }
        .erm-submit:hover { opacity: 0.9; }
        .erm-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .erm-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 6px; padding: 12px 16px; color: #f87171;
          font-family: 'Raleway', sans-serif; font-size: 13px;
        }
        @media (max-width: 640px) {
          .erm-header, .erm-form { padding-left: 20px; padding-right: 20px; }
          .erm-title { font-size: 19px; }
        }
      `}</style>

      <div className="erm-overlay" onClick={handleOverlayClick}>
        <div className="erm-modal">
          <button className="erm-close" onClick={onClose} aria-label="Close">&times;</button>

          <>
            <div className="erm-header">
                <div className="erm-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#c9a84c' }}>apartment</span>
                </div>
                <h2 className="erm-title">Register as an Employer</h2>
                <p className="erm-subtitle">Tell us about your hiring needs. CZAAH sources, vets, and deploys skilled Pakistani professionals across the Gulf, Middle East, and beyond.</p>
              </div>

              <form className="erm-form" onSubmit={handleSubmit}>
                {error && <div className="erm-error">{error}</div>}

                {/* Company Name */}
                <div className="erm-field">
                  <label>Company Name <span className="req">*</span></label>
                  <input className="erm-input" type="text" placeholder="Enter your company name" required
                    value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} />
                </div>

                {/* Identity Document */}
                <div className="erm-field">
                  <label>Identity Document <span className="req">*</span></label>
                  <label className="erm-pill" style={{ padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                    {identityDocName ? identityDocName : 'Upload Document'}
                    <input type="file" accept="image/*,.pdf" onChange={handleIdentityDocChange} style={{ display: 'none' }} />
                  </label>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                    Company registration certificate, personal ID, passport, or any other legal government-approved proof of identity/residence. Required for admin approval. Images or PDF, up to 8MB.
                  </div>
                  {getDocHint(formData.country) && (
                    <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: '#c9a84c', marginTop: '6px' }}>
                      {getDocHint(formData.country)}
                    </div>
                  )}
                </div>

                {/* Contact Person */}
                <div className="erm-field">
                  <label>Contact Person <span className="req">*</span></label>
                  <input className="erm-input" type="text" placeholder="Full name" required
                    value={formData.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} />
                </div>

                {/* Email */}
                <div className="erm-field">
                  <label>Email <span className="req">*</span></label>
                  <input className="erm-input" type="email" placeholder="your.email@company.com" required
                    value={formData.email} onChange={e => updateField('email', e.target.value)} />
                </div>

                {/* Phone */}
                <div className="erm-field">
                  <label>Phone with Country Code <span className="req">*</span></label>
                  <input className="erm-input" type="text" placeholder="+971 50 1234567" required
                    value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>

                {/* Password */}
                <div className="erm-field">
                  <label>Password <span className="req">*</span></label>
                  <input className="erm-input" type="password" placeholder="Min. 8 characters" required
                    value={formData.password} onChange={e => updateField('password', e.target.value)} />
                </div>

                {/* Confirm Password */}
                <div className="erm-field">
                  <label>Confirm Password <span className="req">*</span></label>
                  <input className="erm-input" type="password" placeholder="Re-enter your password" required
                    value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} />
                </div>

                {/* Country */}
                <div className="erm-field">
                  <label>Country <span className="req">*</span></label>
                  <input className="erm-input" type="text" placeholder="e.g. Saudi Arabia, UAE, Qatar" required
                    value={formData.country} onChange={e => updateField('country', e.target.value)} />
                </div>

                {/* Industry */}
                <div className="erm-field">
                  <label>Industry <span className="req">*</span></label>
                  <select className="erm-select" required
                    value={formData.industry} onChange={e => updateField('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                {/* Roles Needed */}
                <div className="erm-field">
                  <label>Roles Needed <span className="req">*</span></label>
                  <input className="erm-input" type="text" placeholder='e.g. "Welders, Electricians, Site Supervisors"' required
                    value={formData.rolesNeeded} onChange={e => updateField('rolesNeeded', e.target.value)} />
                </div>

                {/* Workers Needed */}
                <div className="erm-field">
                  <label>Number of Workers Needed</label>
                  <input className="erm-input" type="number" min="1" placeholder="1"
                    value={formData.workersNeeded} onChange={e => updateField('workersNeeded', parseInt(e.target.value) || 1)} />
                </div>

                {/* Preferred Nationalities */}
                <div className="erm-field">
                  <label>Preferred Worker Nationalities</label>
                  <div className="erm-pills">
                    {nationalityOptions.map(nat => (
                      <div key={nat}
                        className={`erm-pill${formData.preferredNationalities.includes(nat) ? ' selected' : ''}`}
                        onClick={() => toggleNationality(nat)}>
                        {nat}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hiring Timeline */}
                <div className="erm-field">
                  <label>Hiring Timeline</label>
                  <div className="erm-radio-group">
                    {[
                      { value: 'immediate', label: 'Immediate' },
                      { value: 'within_30_days', label: 'Within 30 days' },
                      { value: 'within_60_days', label: 'Within 60 days' },
                      { value: 'within_90_days', label: 'Within 90 days' },
                    ].map(opt => (
                      <label key={opt.value} className="erm-radio">
                        <input type="radio" name="hiringTimeline" value={opt.value}
                          checked={formData.hiringTimeline === opt.value}
                          onChange={e => updateField('hiringTimeline', e.target.value)} />
                        <div className="erm-radio-dot" />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="erm-field">
                  <label>Additional Notes</label>
                  <textarea className="erm-textarea" placeholder="Any additional information about your hiring needs..."
                    value={formData.notes} onChange={e => updateField('notes', e.target.value)} />
                </div>

                <button type="submit" className="erm-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </form>
          </>
        </div>
      </div>
    </>
  );
}
