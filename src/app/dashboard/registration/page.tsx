'use client'
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react'
import { WorkerDigitalCard } from '@/components/WorkerDigitalCard'
import { EmployerDigitalCard } from '@/components/EmployerDigitalCard'
import { OEPDigitalCard } from '@/components/OEPDigitalCard'

const digitalCardLabel: Record<string, string> = {
  worker: 'View Digital ID Card',
  employer: 'View Digital Certificate',
  oep_partner: 'View Digital Certificate',
}

interface RegistrationData {
  role: 'worker' | 'employer' | 'oep_partner'
  kycStatus: string
  registration: Record<string, unknown> | null
}

const kycStatusMeta: Record<string, { label: string; color: string; icon: string }> = {
  pending_kyc_review: { label: 'Pending Review', color: 'text-primary', icon: 'schedule' },
  approved: { label: 'Approved', color: 'text-green-500', icon: 'check_circle' },
  rejected: { label: 'Not Approved', color: 'text-red-500', icon: 'cancel' },
  deactivated: { label: 'Deactivated', color: 'text-on-surface-variant/40', icon: 'block' },
}

const pipelineLabels: Record<string, Record<string, string>> = {
  worker: { registered: 'Registered', shortlisted: 'Shortlisted', placed: 'Placed', inactive: 'Inactive' },
  employer: { registered: 'Registered', contacted: 'Contacted', active_client: 'Active Client', inactive: 'Inactive' },
  oep_partner: { registered: 'Registered', contacted: 'Contacted', verified: 'Verified Partner', inactive: 'Inactive' },
}

const roleLabels: Record<string, string> = {
  worker: 'Worker',
  employer: 'Employer',
  oep_partner: 'Employment Promoter',
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 py-3 border-b border-outline-variant/5 last:border-b-0">
      <span className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/35 md:w-56 shrink-0">{label}</span>
      <span className="raleway-text text-sm text-on-surface/80">{value}</span>
    </div>
  )
}

export default function MyRegistrationPage() {
  const [data, setData] = useState<RegistrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCard, setShowCard] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/member/registration')
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        setError(json.error || 'Failed to load registration.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <div className="raleway-text text-sm text-on-surface-variant/30 p-12 text-center">Loading...</div>
  }

  if (error || !data) {
    return <div className="raleway-text text-sm text-red-500 p-12 text-center">{error || 'Unable to load your registration.'}</div>
  }

  const kyc = kycStatusMeta[data.kycStatus] || kycStatusMeta.pending_kyc_review
  const reg = data.registration
  const pipelineStatus = reg?.status as string | undefined
  const pipelineLabel = pipelineStatus ? (pipelineLabels[data.role]?.[pipelineStatus] || pipelineStatus) : null

  return (
    <div>
      <div className="mb-8">
        <h1 className="cinzel-text text-2xl font-semibold text-on-surface tracking-[4px] m-0">MY REGISTRATION</h1>
        <p className="raleway-text text-sm text-on-surface-variant/40 mt-2">Registered as {roleLabels[data.role] || data.role}</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant/10 p-6 flex items-center gap-4">
          <span className={`material-symbols-outlined ${kyc.color}`} style={{ fontSize: '28px' }}>{kyc.icon}</span>
          <div>
            <div className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/35">Account Verification</div>
            <div className={`cinzel-text text-lg ${kyc.color}`}>{kyc.label}</div>
          </div>
        </div>

        {pipelineLabel && (
          <div className="bg-surface-container-lowest border border-outline-variant/10 p-6 flex items-center gap-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>timeline</span>
            <div>
              <div className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/35">Pipeline Stage</div>
              <div className="cinzel-text text-lg text-primary">{pipelineLabel}</div>
            </div>
          </div>
        )}
      </div>

      {data.kycStatus === 'approved' && reg && (
        <button
          onClick={() => setShowCard(true)}
          className="mb-8 bg-primary/10 border border-primary/30 px-5 py-2.5 cursor-pointer raleway-text text-xs text-primary tracking-wide transition-colors hover:bg-primary/15 inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span>
          {digitalCardLabel[data.role]}
        </button>
      )}

      {data.kycStatus === 'pending_kyc_review' && (
        <div className="border border-primary/20 bg-primary/[0.03] p-5 mb-8">
          <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">
            Our team is reviewing your submitted details and identity document. You&apos;ll be notified once your account is approved.
          </p>
        </div>
      )}

      {data.kycStatus === 'rejected' && (
        <div className="border border-red-500/20 bg-red-500/[0.03] p-5 mb-8">
          <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">
            Your application was not approved. Please contact us at <a href="mailto:info@czaah.com" className="text-primary hover:underline">info@czaah.com</a> for details.
          </p>
        </div>
      )}

      {/* Submitted details */}
      {reg ? (
        <div className="bg-surface-container-lowest border border-outline-variant/10 p-6">
          <h2 className="cinzel-text text-sm tracking-[2px] text-on-surface/70 uppercase mb-2">Submitted Details</h2>

          {data.role === 'worker' && (
            <>
              <DetailRow label="Full Name" value={reg.full_name as string} />
              <DetailRow label="Nationality" value={reg.nationality as string} />
              <DetailRow label="Current Location" value={reg.current_location as string} />
              <DetailRow label="Trade Category" value={reg.trade_category as string} />
              <DetailRow label="Specific Role" value={reg.specific_role as string} />
              <DetailRow label="Years of Experience" value={reg.years_experience as number} />
              <DetailRow label="Certifications" value={reg.certifications as string} />
              <DetailRow label="Preferred Destinations" value={(reg.preferred_destinations as string[])?.join(', ')} />
              <DetailRow label="Availability" value={(reg.availability as string)?.replace(/_/g, ' ')} />
              <DetailRow label="Passport Status" value={(reg.passport_status as string)?.replace(/_/g, ' ')} />
              <DetailRow label="Medical Status" value={(reg.medical_status as string)?.replace(/_/g, ' ')} />
            </>
          )}

          {data.role === 'employer' && (
            <>
              <DetailRow label="Company Name" value={reg.company_name as string} />
              <DetailRow label="Contact Person" value={reg.contact_person as string} />
              <DetailRow label="Country" value={reg.country as string} />
              <DetailRow label="Industry" value={reg.industry as string} />
              <DetailRow label="Roles Needed" value={reg.roles_needed as string} />
              <DetailRow label="Workers Needed" value={reg.workers_needed as number} />
              <DetailRow label="Hiring Timeline" value={(reg.hiring_timeline as string)?.replace(/_/g, ' ')} />
              <DetailRow label="Preferred Nationalities" value={(reg.preferred_nationalities as string[])?.join(', ')} />
            </>
          )}

          {data.role === 'oep_partner' && (
            <>
              <DetailRow label="Company Name" value={reg.company_name as string} />
              <DetailRow label="License Number" value={reg.license_number as string} />
              <DetailRow label="Head Office Location" value={reg.head_office_location as string} />
              <DetailRow label="Years in Operation" value={reg.years_in_operation as number} />
              <DetailRow label="Sector Specialization" value={(reg.sectors_specialization as string[])?.join(', ')} />
              <DetailRow label="Destination Countries" value={(reg.destination_countries as string[])?.join(', ')} />
              <DetailRow label="Monthly Placement Capacity" value={reg.monthly_placement_capacity as number} />
              <DetailRow label="Company Website" value={reg.company_website as string} />
            </>
          )}

          <DetailRow label="Notes" value={reg.notes as string} />
        </div>
      ) : (
        <div className="border border-outline-variant/10 p-6 raleway-text text-sm text-on-surface-variant/40">
          We couldn&apos;t find your submitted registration details. Please contact <a href="mailto:info@czaah.com" className="text-primary hover:underline">info@czaah.com</a>.
        </div>
      )}

      {showCard && reg && data.role === 'worker' && (
        <WorkerDigitalCard
          worker={{
            id: reg.id as string,
            full_name: reg.full_name as string,
            trade_category: reg.trade_category as string,
            specific_role: reg.specific_role as string,
            nationality: reg.nationality as string,
            photo_url: reg.photo_url as string | null,
            status: reg.status as string,
          }}
          onClose={() => setShowCard(false)}
        />
      )}

      {showCard && reg && data.role === 'employer' && (
        <EmployerDigitalCard
          employer={{
            id: reg.id as string,
            company_name: reg.company_name as string,
            industry: reg.industry as string,
            country: reg.country as string,
            status: reg.status as string,
          }}
          onClose={() => setShowCard(false)}
        />
      )}

      {showCard && reg && data.role === 'oep_partner' && (
        <OEPDigitalCard
          oep={{
            id: reg.id as string,
            company_name: reg.company_name as string,
            license_number: reg.license_number as string,
            head_office_location: reg.head_office_location as string,
            status: reg.status as string,
          }}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  )
}
