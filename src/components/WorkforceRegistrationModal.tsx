'use client';

import { useState } from 'react';

interface WorkforceRegistrationModalProps {
  open: boolean;
  onClose: () => void;
}

const nationalities = ['Pakistan', 'Bangladesh', 'Nepal', 'India', 'Sri Lanka', 'Philippines', 'Other'];
const tradeCategories = ['Construction', 'Oil & Gas', 'Healthcare', 'IT & Telecom', 'Hospitality', 'Manufacturing', 'Security', 'Mining', 'Agriculture', 'Transportation', 'Other'];
const destinationOptions = ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Pakistan', 'Other'];

export function WorkforceRegistrationModal({ open, onClose }: WorkforceRegistrationModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationality: '',
    currentLocation: '',
    tradeCategory: '',
    specificRole: '',
    yearsExperience: 0,
    certifications: '',
    preferredDestinations: [] as string[],
    availability: 'immediate',
    passportStatus: 'valid',
    medicalStatus: 'not_done',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function updateField(field: string, value: unknown) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function toggleDestination(dest: string) {
    setFormData(prev => {
      const current = prev.preferredDestinations;
      if (current.includes(dest)) {
        return { ...prev, preferredDestinations: current.filter(d => d !== dest) };
      }
      return { ...prev, preferredDestinations: [...current, dest] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/public/workforce/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(data.reference || 'WR-XXXXXX');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      <style>{`
        .wfm-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: wfmFadeIn 0.25s ease;
        }
        @keyframes wfmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .wfm-modal {
          background: #080808; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; max-width: 600px; width: 100%;
          max-height: 90vh; overflow-y: auto; position: relative;
          animation: wfmSlideUp 0.3s ease;
        }
        @keyframes wfmSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .wfm-modal::-webkit-scrollbar { width: 6px; }
        .wfm-modal::-webkit-scrollbar-track { background: transparent; }
        .wfm-modal::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 3px; }
        .wfm-close {
          position: absolute; top: 16px; right: 16px; z-index: 2;
          background: none; border: none; color: rgba(255,255,255,0.4);
          font-size: 24px; cursor: pointer; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: all 0.2s;
        }
        .wfm-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .wfm-header { padding: 32px 32px 0; }
        .wfm-icon { margin-bottom: 16px; }
        .wfm-title {
          font-family: 'Cinzel', serif; font-size: 22px; font-weight: 600;
          color: #fff; margin: 0 0 8px;
        }
        .wfm-subtitle {
          font-family: 'Raleway', sans-serif; font-size: 13px;
          color: rgba(255,255,255,0.45); line-height: 1.6; margin: 0;
        }
        .wfm-form { padding: 28px 32px 32px; display: flex; flex-direction: column; gap: 18px; }
        .wfm-field label {
          display: block; font-family: 'Raleway', sans-serif; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5);
          margin-bottom: 7px; font-weight: 500;
        }
        .wfm-field label .req { color: #c9a84c; }
        .wfm-input, .wfm-select, .wfm-textarea {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
          padding: 12px 14px; color: #fff;
          font-family: 'Raleway', sans-serif; font-size: 14px;
          transition: border-color 0.2s; outline: none;
          box-sizing: border-box;
        }
        .wfm-input:focus, .wfm-select:focus, .wfm-textarea:focus {
          border-color: rgba(201,168,76,0.5);
        }
        .wfm-input::placeholder, .wfm-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .wfm-select { appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c9a84c' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center;
          padding-right: 36px;
        }
        .wfm-select option { background: #111; color: #fff; }
        .wfm-textarea { resize: vertical; min-height: 70px; }
        .wfm-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .wfm-pill {
          padding: 7px 16px; border-radius: 999px; font-family: 'Raleway', sans-serif;
          font-size: 12px; font-weight: 400; cursor: pointer; user-select: none;
          border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);
          background: transparent; transition: all 0.2s;
        }
        .wfm-pill:hover { border-color: rgba(201,168,76,0.3); color: rgba(255,255,255,0.7); }
        .wfm-pill.selected {
          border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.08);
          font-weight: 500;
        }
        .wfm-radio-group { display: flex; flex-direction: column; gap: 8px; }
        .wfm-radio {
          display: flex; align-items: center; gap: 10px; cursor: pointer;
          font-family: 'Raleway', sans-serif; font-size: 13px; color: rgba(255,255,255,0.55);
          transition: color 0.2s;
        }
        .wfm-radio:hover { color: rgba(255,255,255,0.8); }
        .wfm-radio input[type="radio"] { display: none; }
        .wfm-radio-dot {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.15); transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .wfm-radio input:checked + .wfm-radio-dot {
          border-color: #c9a84c;
        }
        .wfm-radio input:checked + .wfm-radio-dot::after {
          content: ''; width: 8px; height: 8px; border-radius: 50%; background: #c9a84c;
        }
        .wfm-radio input:checked ~ span { color: #fff; }
        .wfm-submit {
          background: linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%);
          color: #000; font-family: 'Raleway', sans-serif; font-weight: 600;
          font-size: 14px; letter-spacing: 0.05em; padding: 14px 32px;
          border-radius: 4px; border: none; cursor: pointer; width: 100%;
          transition: opacity 0.2s; margin-top: 4px;
        }
        .wfm-submit:hover { opacity: 0.9; }
        .wfm-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .wfm-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 6px; padding: 12px 16px; color: #f87171;
          font-family: 'Raleway', sans-serif; font-size: 13px;
        }
        .wfm-success {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 32px; text-align: center;
        }
        .wfm-success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(34,197,94,0.1); border: 2px solid rgba(34,197,94,0.3);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px; font-size: 28px; color: #22c55e;
        }
        .wfm-success h3 {
          font-family: 'Cinzel', serif; font-size: 22px; color: #fff;
          margin: 0 0 12px; font-weight: 600;
        }
        .wfm-success p {
          font-family: 'Raleway', sans-serif; font-size: 14px;
          color: rgba(255,255,255,0.5); line-height: 1.7; margin: 0 0 6px;
        }
        .wfm-success .ref-code {
          font-family: 'Raleway', sans-serif; font-size: 13px;
          color: #c9a84c; font-weight: 600; letter-spacing: 1px; margin-top: 8px;
        }
        .wfm-success-close {
          margin-top: 28px; padding: 12px 32px; border-radius: 4px;
          border: 1px solid rgba(201,168,76,0.3); background: transparent;
          color: #c9a84c; font-family: 'Raleway', sans-serif; font-size: 13px;
          cursor: pointer; transition: all 0.2s; font-weight: 500;
        }
        .wfm-success-close:hover { border-color: #c9a84c; background: rgba(201,168,76,0.06); }
        @media (max-width: 640px) {
          .wfm-header, .wfm-form { padding-left: 20px; padding-right: 20px; }
          .wfm-title { font-size: 19px; }
        }
      `}</style>

      <div className="wfm-overlay" onClick={handleOverlayClick}>
        <div className="wfm-modal">
          <button className="wfm-close" onClick={onClose} aria-label="Close">&times;</button>

          {success ? (
            <div className="wfm-success">
              <div className="wfm-success-icon">&#10003;</div>
              <h3>Registration Submitted!</h3>
              <p>We&apos;ll review your profile and contact you if a matching opportunity arises.</p>
              <div className="ref-code">Reference: {success}</div>
              <button className="wfm-success-close" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <div className="wfm-header">
                <div className="wfm-icon">
                  <svg viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '40px', width: 'auto' }}>
                    <defs>
                      <linearGradient id="wfHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8a6f2e"/>
                        <stop offset="40%" stopColor="#c9a84c"/>
                        <stop offset="60%" stopColor="#e8c97a"/>
                        <stop offset="100%" stopColor="#8a6f2e"/>
                      </linearGradient>
                      <linearGradient id="wfBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#c9a84c"/>
                        <stop offset="100%" stopColor="#8a6f2e"/>
                      </linearGradient>
                    </defs>
                    <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#wfHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#wfHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#wfBodyGrad)" opacity="0.9"/>
                    <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                    <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
                    <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#wfBodyGrad)" opacity="0.5"/>
                  </svg>
                </div>
                <h2 className="wfm-title">Register as a Worker</h2>
                <p className="wfm-subtitle">Join CZAAH&apos;s workforce database. We connect skilled Pakistani professionals with employers across the Gulf, Middle East, and beyond.</p>
              </div>

              <form className="wfm-form" onSubmit={handleSubmit}>
                {error && <div className="wfm-error">{error}</div>}

                {/* Full Name */}
                <div className="wfm-field">
                  <label>Full Name <span className="req">*</span></label>
                  <input className="wfm-input" type="text" placeholder="Enter your full name" required
                    value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} />
                </div>

                {/* Email */}
                <div className="wfm-field">
                  <label>Email <span className="req">*</span></label>
                  <input className="wfm-input" type="email" placeholder="your.email@example.com" required
                    value={formData.email} onChange={e => updateField('email', e.target.value)} />
                </div>

                {/* Phone */}
                <div className="wfm-field">
                  <label>Phone with Country Code <span className="req">*</span></label>
                  <input className="wfm-input" type="text" placeholder="+92 300 1234567" required
                    value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>

                {/* Nationality */}
                <div className="wfm-field">
                  <label>Nationality <span className="req">*</span></label>
                  <select className="wfm-select" required
                    value={formData.nationality} onChange={e => updateField('nationality', e.target.value)}>
                    <option value="">Select nationality</option>
                    {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* Current Location */}
                <div className="wfm-field">
                  <label>Current Location / City <span className="req">*</span></label>
                  <input className="wfm-input" type="text" placeholder="e.g. Lahore, Karachi, Riyadh" required
                    value={formData.currentLocation} onChange={e => updateField('currentLocation', e.target.value)} />
                </div>

                {/* Trade Category */}
                <div className="wfm-field">
                  <label>Trade Category <span className="req">*</span></label>
                  <select className="wfm-select" required
                    value={formData.tradeCategory} onChange={e => updateField('tradeCategory', e.target.value)}>
                    <option value="">Select trade category</option>
                    {tradeCategories.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Specific Role */}
                <div className="wfm-field">
                  <label>Specific Role <span className="req">*</span></label>
                  <input className="wfm-input" type="text" placeholder='e.g. "Welder", "Staff Nurse", "Civil Engineer"' required
                    value={formData.specificRole} onChange={e => updateField('specificRole', e.target.value)} />
                </div>

                {/* Years of Experience */}
                <div className="wfm-field">
                  <label>Years of Experience</label>
                  <input className="wfm-input" type="number" min="0" max="50" placeholder="0"
                    value={formData.yearsExperience} onChange={e => updateField('yearsExperience', parseInt(e.target.value) || 0)} />
                </div>

                {/* Certifications */}
                <div className="wfm-field">
                  <label>Certifications</label>
                  <textarea className="wfm-textarea" placeholder='e.g. "AWS Welding, PEC Registered, NEBOSH"'
                    value={formData.certifications} onChange={e => updateField('certifications', e.target.value)} />
                </div>

                {/* Preferred Destinations */}
                <div className="wfm-field">
                  <label>Preferred Destinations</label>
                  <div className="wfm-pills">
                    {destinationOptions.map(dest => (
                      <div key={dest}
                        className={`wfm-pill${formData.preferredDestinations.includes(dest) ? ' selected' : ''}`}
                        onClick={() => toggleDestination(dest)}>
                        {dest}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="wfm-field">
                  <label>Availability</label>
                  <div className="wfm-radio-group">
                    {[
                      { value: 'immediate', label: 'Immediate' },
                      { value: 'within_30_days', label: 'Within 30 days' },
                      { value: 'within_60_days', label: 'Within 60 days' },
                      { value: 'within_90_days', label: 'Within 90 days' },
                    ].map(opt => (
                      <label key={opt.value} className="wfm-radio">
                        <input type="radio" name="availability" value={opt.value}
                          checked={formData.availability === opt.value}
                          onChange={e => updateField('availability', e.target.value)} />
                        <div className="wfm-radio-dot" />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Passport Status */}
                <div className="wfm-field">
                  <label>Passport Status</label>
                  <div className="wfm-radio-group">
                    {[
                      { value: 'valid', label: 'Valid passport' },
                      { value: 'expired', label: 'Expired / Need renewal' },
                      { value: 'none', label: 'No passport' },
                    ].map(opt => (
                      <label key={opt.value} className="wfm-radio">
                        <input type="radio" name="passportStatus" value={opt.value}
                          checked={formData.passportStatus === opt.value}
                          onChange={e => updateField('passportStatus', e.target.value)} />
                        <div className="wfm-radio-dot" />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Medical Status */}
                <div className="wfm-field">
                  <label>Medical Status</label>
                  <div className="wfm-radio-group">
                    {[
                      { value: 'gamca_cleared', label: 'GAMCA cleared' },
                      { value: 'other_medical', label: 'Other medical done' },
                      { value: 'not_done', label: 'Not yet done' },
                    ].map(opt => (
                      <label key={opt.value} className="wfm-radio">
                        <input type="radio" name="medicalStatus" value={opt.value}
                          checked={formData.medicalStatus === opt.value}
                          onChange={e => updateField('medicalStatus', e.target.value)} />
                        <div className="wfm-radio-dot" />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="wfm-field">
                  <label>Additional Notes</label>
                  <textarea className="wfm-textarea" placeholder="Any additional information..."
                    value={formData.notes} onChange={e => updateField('notes', e.target.value)} />
                </div>

                <button type="submit" className="wfm-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
