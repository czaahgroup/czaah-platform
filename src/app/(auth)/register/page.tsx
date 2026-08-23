'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SECTORS = [
  'Agriculture & Agribusiness',
  'Professional',
  'Energy & Power',
  'Financial Services',
  'Healthcare & Pharmaceuticals',
  'Infrastructure & Construction',
  'Manufacturing & Industrials',
  'Mining & Natural Resources',
  'Oil & Gas',
  'Real Estate',
  'Technology & Telecommunications',
  'Tourism & Hospitality',
  'Transportation & Logistics',
  'Water & Sanitation',
] as const

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia',
  'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
] as const

const STEP_LABELS = ['Account Details', 'Company Information', 'Identity Verification', 'Confirmation'] as const

interface FormData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  companyName: string
  registrationNumber: string
  countryOfIncorporation: string
  sectors: string[]
  otherSector: string
  companyWebsite: string
  businessDescription: string
  partnerCode: string
  idFront: File | null
  idBack: File | null
  registrationCertificate: File | null
  proofOfAddress: File | null
  termsAccepted: boolean
}

interface FormErrors {
  [key: string]: string
}

// Shared inline styles
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '12px',
  letterSpacing: '0.05em',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  marginBottom: '6px',
}

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#131313',
  border: '1px solid #4d4637',
  borderRadius: '0.125rem',
  padding: '12px 16px',
  color: '#e5e2e1',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '14px',
  transition: 'border-color 0.3s',
  outline: 'none',
  boxSizing: 'border-box',
}

const errorInputStyle: React.CSSProperties = {
  ...baseInputStyle,
  border: '1px solid #ffb4ab',
}

const headingStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '20px',
  marginBottom: '24px',
  color: '#e5e2e1',
}

const errorTextStyle: React.CSSProperties = {
  color: '#ffb4ab',
  fontFamily: "'Raleway', sans-serif",
  fontSize: '12px',
  marginTop: '6px',
}

const goldButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #e6c364 0%, #c9a84c 100%)',
  color: '#3d2e00',
  fontFamily: "'Raleway', sans-serif",
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  padding: '16px 32px',
  borderRadius: '0.125rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s',
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    registrationNumber: '',
    countryOfIncorporation: '',
    sectors: [],
    otherSector: '',
    companyWebsite: '',
    businessDescription: '',
    partnerCode: '',
    idFront: null,
    idBack: null,
    registrationCertificate: null,
    proofOfAddress: null,
    termsAccepted: false,
  })

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const toggleSector = useCallback((sector: string) => {
    setFormData(prev => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
        ? prev.sectors.filter(s => s !== sector)
        : [...prev.sectors, sector],
    }))
    setErrors(prev => {
      const next = { ...prev }
      delete next.sectors
      return next
    })
  }, [])

  function validateStep(currentStep: number): boolean {
    const newErrors: FormErrors = {}

    if (currentStep === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email address'
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      if (!formData.password) newErrors.password = 'Password is required'
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    }

    if (currentStep === 2) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required'
      if (!formData.registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required'
      if (!formData.countryOfIncorporation) newErrors.countryOfIncorporation = 'Country is required'
      if (formData.sectors.length === 0 && !formData.otherSector.trim()) newErrors.sectors = 'Select at least one sector or specify Other'
    }

    if (currentStep === 3) {
      if (!formData.idFront) newErrors.idFront = 'Government-issued ID (front) is required'
      if (!formData.idBack) newErrors.idBack = 'Government-issued ID (back) is required'
      if (!formData.registrationCertificate) newErrors.registrationCertificate = 'Company registration certificate is required'
      if (!formData.proofOfAddress) newErrors.proofOfAddress = 'Proof of address is required'
    }

    if (currentStep === 4) {
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 4))
    }
  }

  function handleBack() {
    setStep(prev => Math.max(prev - 1, 1))
  }

  async function handleSubmit() {
    if (!validateStep(4)) return

    setLoading(true)
    setSubmitError('')

    try {
      // Convert files to base64 for API transport
      async function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1]) // strip data:...;base64, prefix
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const documents = await Promise.all([
        { docType: 'government_id_front', file: formData.idFront! },
        { docType: 'government_id_back', file: formData.idBack! },
        { docType: 'company_registration', file: formData.registrationCertificate! },
        { docType: 'proof_of_address', file: formData.proofOfAddress! },
      ].map(async ({ docType, file }) => ({
        docType,
        fileName: file.name,
        fileData: await fileToBase64(file),
      })))

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          companyName: formData.companyName.trim(),
          companyRegistrationNumber: formData.registrationNumber.trim(),
          country: formData.countryOfIncorporation,
          industryInterests: formData.otherSector.trim()
            ? [...formData.sectors, formData.otherSector.trim()]
            : formData.sectors,
          companyWebsite: formData.companyWebsite.trim() || null,
          companyDescription: formData.businessDescription.trim() || null,
          partnerCode: formData.partnerCode.trim() || null,
          documents,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Sign in the user after successful registration
      const supabase = createClient()
      await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      router.push('/pending')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: '#0e0e0e' }}>
      <div style={{ width: '100%', maxWidth: '42rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <svg viewBox="-5 -12 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '96px', width: 'auto', display: 'block', margin: '0 auto' }}>
              <defs>
                <linearGradient id="authHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a6f2e"/>
                  <stop offset="40%" stopColor="#c9a84c"/>
                  <stop offset="60%" stopColor="#e8c97a"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
                <linearGradient id="authBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c9a84c"/>
                  <stop offset="100%" stopColor="#8a6f2e"/>
                </linearGradient>
              </defs>
              <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#authHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#authHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#authHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#authHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#authBodyGrad)" opacity="0.9"/>
              <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
              <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
            </svg>
          </Link>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1
              const isActive = step === stepNum
              const isCompleted = step > stepNum
              return (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      fontFamily: "'Raleway', sans-serif",
                      transition: 'all 0.3s',
                      ...(isActive
                        ? { background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)', color: '#000' }
                        : isCompleted
                          ? { background: 'transparent', border: '1px solid #C9A84C', color: '#C9A84C' }
                          : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                      ),
                    }}
                  >
                    {isCompleted ? (
                      <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    marginTop: '6px',
                    textAlign: 'center',
                    fontFamily: "'Raleway', sans-serif",
                    color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.3)',
                  }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', height: '4px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 50%, #8a6f2e 100%)',
                height: '4px',
                borderRadius: '9999px',
                transition: 'width 0.3s',
                width: `${((step - 1) / 3) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#131313',
          border: '1px solid rgba(77, 70, 55, 0.2)',
          borderRadius: '0.125rem',
          padding: 'clamp(20px, 4vw, 40px) clamp(16px, 3vw, 40px)',
        }}>
          {/* Step 1: Account Details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={headingStyle}>Account Details</h2>

              <FieldGroup label="Full Name" error={errors.fullName}>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => updateField('fullName', e.target.value)}
                  required
                  style={errors.fullName ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.fullName ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="John Doe"
                />
              </FieldGroup>

              <FieldGroup label="Email Address" error={errors.email}>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  required
                  style={errors.email ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.email ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="your@email.com"
                />
              </FieldGroup>

              <FieldGroup label="Phone Number (with country code)" error={errors.phone}>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  required
                  style={errors.phone ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.phone ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="+1 (555) 000-0000"
                />
              </FieldGroup>

              <FieldGroup label="Password" error={errors.password}>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => updateField('password', e.target.value)}
                  required
                  style={errors.password ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.password ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="Min. 8 characters"
                />
              </FieldGroup>

              <FieldGroup label="Confirm Password" error={errors.confirmPassword}>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  required
                  style={errors.confirmPassword ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="Re-enter your password"
                />
              </FieldGroup>
            </div>
          )}

          {/* Step 2: Company Information */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={headingStyle}>Company Information</h2>

              <FieldGroup label="Company Name" error={errors.companyName}>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => updateField('companyName', e.target.value)}
                  required
                  style={errors.companyName ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.companyName ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="Acme Corporation"
                />
              </FieldGroup>

              <FieldGroup label="Company Registration Number" error={errors.registrationNumber}>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={e => updateField('registrationNumber', e.target.value)}
                  required
                  style={errors.registrationNumber ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.registrationNumber ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                  placeholder="e.g., RC-123456"
                />
              </FieldGroup>

              <FieldGroup label="Country of Incorporation" error={errors.countryOfIncorporation}>
                <select
                  value={formData.countryOfIncorporation}
                  onChange={e => updateField('countryOfIncorporation', e.target.value)}
                  required
                  style={errors.countryOfIncorporation ? errorInputStyle : baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = errors.countryOfIncorporation ? '#ef4444' : 'rgba(255,255,255,0.08)'}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Industry / Sector of Interest" error={errors.sectors}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '4px' }}>
                  {SECTORS.map(sector => {
                    const isSelected = formData.sectors.includes(sector)
                    return (
                      <button
                        key={sector}
                        type="button"
                        onClick={() => toggleSector(sector)}
                        style={{
                          background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent',
                          border: isSelected ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: isSelected ? '#C9A84C' : 'rgba(255,255,255,0.4)',
                          fontFamily: "'Raleway', sans-serif",
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.3s',
                          boxShadow: isSelected ? '0 0 12px rgba(201,168,76,0.15)' : 'none',
                        }}
                      >
                        {sector}
                      </button>
                    )
                  })}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={{
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    display: 'block',
                    marginBottom: '6px',
                  }}>Other (please specify)</label>
                  <input
                    type="text"
                    value={formData.otherSector}
                    onChange={e => updateField('otherSector', e.target.value)}
                    placeholder="e.g. Renewable Energy, Fintech, etc."
                    style={{
                      width: '100%',
                      background: '#000',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '14px',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#C9A84C'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="Company Website (optional)">
                <input
                  type="url"
                  value={formData.companyWebsite}
                  onChange={e => updateField('companyWebsite', e.target.value)}
                  style={baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  placeholder="https://www.example.com"
                />
              </FieldGroup>

              <FieldGroup label="Partner ID or Referral Code (optional)">
                <input
                  type="text"
                  value={formData.partnerCode}
                  onChange={e => updateField('partnerCode', e.target.value)}
                  style={baseInputStyle}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  placeholder="If someone referred you, enter their code here"
                />
              </FieldGroup>

              <FieldGroup label="Brief Description of Business">
                <textarea
                  value={formData.businessDescription}
                  onChange={e => updateField('businessDescription', e.target.value)}
                  rows={4}
                  style={{ ...baseInputStyle, resize: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  placeholder="Describe your business activities, products, and services..."
                />
              </FieldGroup>
            </div>
          )}

          {/* Step 3: Identity Verification */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ ...headingStyle, marginBottom: '8px' }}>Identity Verification</h2>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '14px', marginBottom: '8px', marginTop: '-12px' }}>
                Upload clear, legible copies of the following documents. Accepted formats: images (JPG, PNG) and PDF.
              </p>

              <FileUploadField
                label="Government-Issued ID (Front)"
                file={formData.idFront}
                error={errors.idFront}
                onSelect={file => updateField('idFront', file)}
              />

              <FileUploadField
                label="Government-Issued ID (Back)"
                file={formData.idBack}
                error={errors.idBack}
                onSelect={file => updateField('idBack', file)}
              />

              <FileUploadField
                label="Company Registration Certificate"
                file={formData.registrationCertificate}
                error={errors.registrationCertificate}
                onSelect={file => updateField('registrationCertificate', file)}
              />

              <FileUploadField
                label="Proof of Address (utility bill or bank statement within 3 months)"
                file={formData.proofOfAddress}
                error={errors.proofOfAddress}
                onSelect={file => updateField('proofOfAddress', file)}
              />
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={headingStyle}>Review Your Application</h2>

              <SummarySection title="Account Details">
                <SummaryRow label="Full Name" value={formData.fullName} />
                <SummaryRow label="Email" value={formData.email} />
                <SummaryRow label="Phone" value={formData.phone} />
              </SummarySection>

              <SummarySection title="Company Information">
                <SummaryRow label="Company Name" value={formData.companyName} />
                <SummaryRow label="Registration Number" value={formData.registrationNumber} />
                <SummaryRow label="Country" value={formData.countryOfIncorporation} />
                <SummaryRow label="Sectors" value={formData.sectors.join(', ')} />
                {formData.companyWebsite && (
                  <SummaryRow label="Website" value={formData.companyWebsite} />
                )}
                {formData.businessDescription && (
                  <SummaryRow label="Description" value={formData.businessDescription} />
                )}
              </SummarySection>

              <SummarySection title="Documents">
                <SummaryRow label="ID Front" value={formData.idFront?.name || 'Not uploaded'} />
                <SummaryRow label="ID Back" value={formData.idBack?.name || 'Not uploaded'} />
                <SummaryRow label="Registration Certificate" value={formData.registrationCertificate?.name || 'Not uploaded'} />
                <SummaryRow label="Proof of Address" value={formData.proofOfAddress?.name || 'Not uploaded'} />
              </SummarySection>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={e => updateField('termsAccepted', e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#C9A84C' }}
                  />
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Raleway', sans-serif" }}>
                    I confirm that all information provided is accurate and I agree to the{' '}
                    <span style={{ color: '#C9A84C' }}>Terms &amp; Conditions</span>{' '}
                    and{' '}
                    <span style={{ color: '#C9A84C' }}>Privacy Policy</span>.
                  </span>
                </label>
                {errors.termsAccepted && (
                  <p style={{ ...errorTextStyle, marginLeft: '28px' }}>{errors.termsAccepted}</p>
                )}
              </div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
              <p style={{ color: '#ef4444', fontFamily: "'Raleway', sans-serif", fontSize: '12px', margin: 0 }}>{submitError}</p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '16px' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                style={{
                  padding: '14px 24px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '0.05em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                style={goldButtonStyle}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  ...goldButtonStyle,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        {/* Footer link */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Raleway', sans-serif" }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#C9A84C', fontFamily: "'Raleway', sans-serif", textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ============================
   Reusable sub-components
   ============================ */

function FieldGroup({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errorTextStyle}>{error}</p>}
    </div>
  )
}

function FileUploadField({
  label,
  file,
  error,
  onSelect,
}: {
  label: string
  file: File | null
  error?: string
  onSelect: (file: File | null) => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <FieldGroup label={label} error={error}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          border: error ? '1px dashed #ef4444' : isHovered ? '1px dashed #C9A84C' : '1px dashed rgba(255,255,255,0.08)',
          borderRadius: '6px',
          background: '#000',
          padding: '16px',
          transition: 'border-color 0.3s',
        }}
      >
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={e => onSelect(e.target.files?.[0] || null)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {file ? (
            <span style={{ fontSize: '14px', color: '#fff', fontFamily: "'Raleway', sans-serif" }}>{file.name}</span>
          ) : (
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Raleway', sans-serif" }}>Click to upload or drag and drop</span>
          )}
        </div>
      </div>
    </FieldGroup>
  )
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
      <h3 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '12px',
        color: '#C9A84C',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px' }}>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', width: '160px', flexShrink: 0, fontFamily: "'Raleway', sans-serif" }}>{label}:</span>
      <span style={{ fontSize: '14px', color: '#fff', wordBreak: 'break-word', fontFamily: "'Raleway', sans-serif" }}>{value}</span>
    </div>
  )
}
