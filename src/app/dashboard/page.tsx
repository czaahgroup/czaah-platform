'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WorkerDigitalCard } from '@/components/WorkerDigitalCard'
import { EmployerDigitalCard } from '@/components/EmployerDigitalCard'
import { OEPDigitalCard } from '@/components/OEPDigitalCard'

const REGISTRANT_ROLES = ['worker', 'employer', 'oep_partner']

const digitalCardLabel: Record<string, string> = {
  worker: 'View Digital ID Card',
  employer: 'View Digital Certificate',
  oep_partner: 'View Digital Certificate',
}

const pipelineLabels: Record<string, Record<string, string>> = {
  worker: { registered: 'Registered', shortlisted: 'Shortlisted', placed: 'Placed', inactive: 'Inactive' },
  employer: { registered: 'Registered', contacted: 'Contacted', active_client: 'Active Client', inactive: 'Inactive' },
  oep_partner: { registered: 'Registered', contacted: 'Contacted', verified: 'Verified Partner', inactive: 'Inactive' },
}

const registrantStatLabel: Record<string, string> = {
  worker: 'Trade Category',
  employer: 'Industry',
  oep_partner: 'License Number',
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  company_name: string | null
}

interface Enquiry {
  id: string
  reference_number: string
  product_name: string | null
  status: string
  created_at: string
  member_id: string
  assigned_admin_id: string | null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [registration, setRegistration] = useState<Record<string, unknown> | null>(null)
  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [showCard, setShowCard] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status, company_name')
        .eq('id', user.id)
        .single()

      if (!prof) { router.push('/pending'); return }
      setProfile(prof)

      if (REGISTRANT_ROLES.includes(prof.role)) {
        const regRes = await fetch('/api/member/registration')
        if (regRes.ok) {
          const regJson = await regRes.json()
          setRegistration(regJson.registration || null)
          setKycStatus(regJson.kycStatus || null)
        }
      } else {
        // Load enquiries — use API route which handles role-based filtering
        const res = await fetch('/api/enquiries')
        if (res.ok) {
          const json = await res.json()
          setEnquiries((json.data || []).slice(0, 10))
        }
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-primary/10 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const firstName = profile.full_name.split(' ')[0]
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const activeEnquiries = enquiries.filter(e => ['submitted', 'assigned', 'active', 'waiting'].includes(e.status))
  const resolvedEnquiries = enquiries.filter(e => e.status === 'resolved')
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const isRegistrant = REGISTRANT_ROLES.includes(profile.role)
  const pipelineStatus = registration?.status as string | undefined
  const pipelineLabel = pipelineStatus ? (pipelineLabels[profile.role]?.[pipelineStatus] || pipelineStatus) : null
  const registrantStatValue = registration
    ? (profile.role === 'worker' ? registration.trade_category
      : profile.role === 'employer' ? registration.industry
      : profile.role === 'oep_partner' ? registration.license_number
      : null) as string | null
    : null
  const assignedEnquiries = isAdmin ? enquiries.filter(e => e.assigned_admin_id === profile.id && e.member_id !== profile.id) : []
  const myEnquiries = isAdmin ? enquiries.filter(e => e.member_id === profile.id) : enquiries

  const tierLabels: Record<string, string> = {
    super_admin: 'SUPER ADMIN',
    admin: 'ADMIN',
    elite_member: 'ELITE MEMBER',
    investment_partner: 'INVESTMENT PARTNER',
    real_estate_partner: 'REAL ESTATE PARTNER',
    worker: 'WORKER',
    employer: 'EMPLOYER',
    oep_partner: 'EMPLOYMENT PROMOTER',
  }
  const tierLabel = tierLabels[profile.role] || 'MEMBER'

  const statusConfig: Record<string, { bg: string; color: string }> = {
    submitted: { bg: 'bg-primary/10', color: 'text-primary' },
    assigned: { bg: 'bg-tertiary/10', color: 'text-tertiary' },
    active: { bg: 'bg-green-500/10', color: 'text-green-400' },
    waiting: { bg: 'bg-yellow-500/10', color: 'text-yellow-400' },
    resolved: { bg: 'bg-on-surface/10', color: 'text-on-surface-variant' },
    archived: { bg: 'bg-on-surface/5', color: 'text-on-surface-variant/50' },
  }

  // Build recent activity from enquiries
  const recentActivity = [...enquiries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2 flex-wrap">
          <h1 className="cinzel-text text-3xl text-on-surface m-0 font-medium tracking-wide">
            Welcome back, {firstName}
          </h1>
          <span className="raleway-text text-[11px] font-semibold tracking-[2px] px-4 py-1 border border-primary/25 text-primary bg-primary/5">
            {tierLabel}
          </span>
        </div>
        <p className="raleway-text text-sm text-on-surface-variant/50 m-0">
          {dateStr}
          {profile.company_name && <span className="text-primary/50 mx-2">&middot;</span>}
          {profile.company_name && <span>{profile.company_name}</span>}
        </p>
      </div>

      {isRegistrant && (
        <div className="bg-surface-container-low border border-outline-variant/10 border-l-2 border-l-primary/40 p-6 mb-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '32px' }}>badge</span>
            <div>
              <div className="cinzel-text text-base text-on-surface mb-0.5">
                {kycStatus === 'approved' ? 'Your account is verified' : 'Account verification pending'}
              </div>
              <div className="raleway-text text-xs text-on-surface-variant/50">
                {kycStatus === 'approved'
                  ? 'View your Digital ID Card, or see your full registration details.'
                  : 'Your Digital ID Card will be available once your account is approved.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {kycStatus === 'approved' && registration && (
              <button
                onClick={() => setShowCard(true)}
                className="liquid-gold-bg text-on-primary raleway-text font-semibold text-xs tracking-wide px-5 py-2.5"
              >
                {digitalCardLabel[profile.role]}
              </button>
            )}
            <Link href="/dashboard/registration" className="raleway-text text-xs text-primary no-underline hover:text-primary/80 transition-colors">
              My Registration &rarr;
            </Link>
          </div>
        </div>
      )}

      {isRegistrant && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden">
            <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">Account Verification</p>
            <p className={`cinzel-text text-2xl m-0 font-semibold leading-none capitalize ${kycStatus === 'approved' ? 'text-green-400' : kycStatus === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
              {kycStatus === 'approved' ? 'Approved' : kycStatus === 'rejected' ? 'Rejected' : 'Pending'}
            </p>
            <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>shield</span>
          </div>

          {pipelineLabel && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden">
              <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">Pipeline Stage</p>
              <p className="cinzel-text text-2xl text-primary m-0 font-semibold leading-none">{pipelineLabel}</p>
              <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>timeline</span>
            </div>
          )}

          {registrantStatValue && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden">
              <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">{registrantStatLabel[profile.role]}</p>
              <p className="cinzel-text text-lg text-on-surface m-0 font-semibold leading-tight">{registrantStatValue}</p>
              <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>work</span>
            </div>
          )}

          {registration?.created_at != null && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden">
              <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">Registered Since</p>
              <p className="cinzel-text text-lg text-on-surface m-0 font-semibold leading-tight">
                {new Date(registration.created_at as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>event</span>
            </div>
          )}
        </div>
      )}

      {!isRegistrant && (
      <>
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
          <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">Active Enquiries</p>
          <p className="cinzel-text text-3xl text-primary m-0 font-semibold leading-none">{activeEnquiries.length}</p>
          <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>task_alt</span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
          <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">Resolved</p>
          <p className="cinzel-text text-3xl text-on-surface m-0 font-semibold leading-none">{resolvedEnquiries.length}</p>
          <span className="material-symbols-outlined absolute top-6 right-6 text-green-500/15" style={{ fontSize: '28px' }}>check_circle</span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
          <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">KYC Status</p>
          <p className={`cinzel-text text-2xl m-0 font-semibold leading-none capitalize ${profile.status === 'approved' ? 'text-green-400' : 'text-yellow-400'}`}>
            {profile.status === 'approved' ? 'Approved' : profile.status}
          </p>
          <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>shield</span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 p-6 relative overflow-hidden transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
          <p className="raleway-text text-[11px] tracking-[1.5px] uppercase text-on-surface-variant/50 mb-2">Total Enquiries</p>
          <p className="cinzel-text text-3xl text-on-surface m-0 font-semibold leading-none">{enquiries.length}</p>
          <span className="material-symbols-outlined absolute top-6 right-6 text-primary/15" style={{ fontSize: '28px' }}>forum</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="cinzel-text text-lg text-on-surface tracking-wide mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/enquiries/new', icon: 'add_circle', title: 'New Enquiry', desc: 'Submit a new request' },
            { href: '/dashboard/investments', icon: 'layers', title: 'Browse Investments', desc: 'Explore opportunities' },
            { href: '/dashboard/documents', icon: 'description', title: 'View Documents', desc: 'Access your files' },
            { href: '/dashboard/enquiries', icon: 'calendar_month', title: 'All Enquiries', desc: 'Track your activity' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-surface-container-low border border-outline-variant/10 border-l-2 border-l-primary/30 p-5 flex items-center gap-4 no-underline transition-all duration-300 hover:border-primary/20 hover:border-l-primary hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>{action.icon}</span>
              <div>
                <div className="cinzel-text text-sm text-on-surface mb-0.5">{action.title}</div>
                <div className="raleway-text text-xs text-on-surface-variant/40">{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="mb-10">
          <h2 className="cinzel-text text-lg text-on-surface tracking-wide mb-5">Recent Activity</h2>
          <div className="bg-surface-container-low border border-outline-variant/10 px-6 py-2">
            {recentActivity.map((item, idx) => (
              <div key={item.id} className={`flex gap-4 py-4 ${idx < recentActivity.length - 1 ? 'border-b border-outline-variant/10' : ''}`}>
                <div className="w-2.5 h-2.5 bg-primary mt-1.5 shrink-0" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <Link href={`/dashboard/enquiries/${item.id}`} className="raleway-text text-sm text-on-surface no-underline hover:text-primary transition-colors">
                      {item.product_name || 'General Enquiry'}
                    </Link>
                    <span className="raleway-text text-[11px] text-on-surface/25">{timeAgo(item.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="raleway-text text-[11px] text-on-surface/30">{item.reference_number}</span>
                    <span className={`text-[10px] raleway-text font-semibold px-2 py-0.5 capitalize ${statusConfig[item.status]?.bg || 'bg-on-surface/5'} ${statusConfig[item.status]?.color || 'text-on-surface-variant'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enquiry Lists */}
      {isAdmin ? (
        <>
          <div className="mb-6">
            <h2 className="cinzel-text text-lg text-on-surface tracking-wide mb-4">Assigned Enquiries</h2>
            {assignedEnquiries.length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant/10 p-12 text-center">
                <p className="raleway-text text-sm text-on-surface-variant/40 m-0">No enquiries assigned to you.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {assignedEnquiries.map((enq) => (
                  <Link key={enq.id} href={`/dashboard/enquiries/${enq.id}`} className="block bg-surface-container-low border border-outline-variant/10 px-6 py-5 no-underline transition-all duration-300 hover:border-primary/20 hover:-translate-y-px">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-primary bg-primary/10 px-2.5 py-0.5 tracking-wide">{enq.reference_number}</span>
                        <span className="raleway-text text-sm text-on-surface">{enq.product_name || 'General Enquiry'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] raleway-text font-semibold px-3 py-0.5 capitalize ${statusConfig[enq.status]?.bg || 'bg-on-surface/5'} ${statusConfig[enq.status]?.color || 'text-on-surface-variant'}`}>{enq.status}</span>
                        <span className="raleway-text text-xs text-on-surface/25">{new Date(enq.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="cinzel-text text-lg text-on-surface tracking-wide">My Enquiries</h2>
              <Link href="/dashboard/enquiries/new" className="raleway-text text-xs text-primary no-underline transition-colors hover:text-primary/80">New Enquiry &rarr;</Link>
            </div>
            {myEnquiries.length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant/10 p-12 text-center">
                <p className="raleway-text text-sm text-on-surface-variant/40 mb-4">You haven&apos;t submitted any enquiries yet.</p>
                <Link href="/dashboard/enquiries/new" className="inline-block liquid-gold-bg text-on-primary raleway-text font-semibold text-sm px-6 py-2.5 no-underline">Submit an Enquiry</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {myEnquiries.map((enq) => (
                  <Link key={enq.id} href={`/dashboard/enquiries/${enq.id}`} className="block bg-surface-container-low border border-outline-variant/10 px-6 py-5 no-underline transition-all duration-300 hover:border-primary/20 hover:-translate-y-px">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-primary bg-primary/10 px-2.5 py-0.5 tracking-wide">{enq.reference_number}</span>
                        <span className="raleway-text text-sm text-on-surface">{enq.product_name || 'General Enquiry'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] raleway-text font-semibold px-3 py-0.5 capitalize ${statusConfig[enq.status]?.bg || 'bg-on-surface/5'} ${statusConfig[enq.status]?.color || 'text-on-surface-variant'}`}>{enq.status}</span>
                        <span className="raleway-text text-xs text-on-surface/25">{new Date(enq.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="cinzel-text text-lg text-on-surface tracking-wide">My Enquiries</h2>
            <Link href="/dashboard/enquiries/new" className="raleway-text text-xs text-primary no-underline">New Enquiry &rarr;</Link>
          </div>
          {enquiries.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/10 p-16 text-center">
              <p className="raleway-text text-sm text-on-surface-variant/40 mb-5">No enquiries yet.</p>
              <Link href="/dashboard/enquiries/new" className="inline-block liquid-gold-bg text-on-primary raleway-text font-semibold text-sm px-7 py-3 no-underline">Submit Your First Enquiry</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {enquiries.map((enq) => (
                <Link key={enq.id} href={`/dashboard/enquiries/${enq.id}`} className="block bg-surface-container-low border border-outline-variant/10 px-6 py-5 no-underline transition-all duration-300 hover:border-primary/20 hover:-translate-y-px">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-primary bg-primary/10 px-2.5 py-0.5 tracking-wide">{enq.reference_number}</span>
                      <span className="raleway-text text-sm text-on-surface">{enq.product_name || 'General Enquiry'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] raleway-text font-semibold px-3 py-0.5 capitalize ${statusConfig[enq.status]?.bg || 'bg-on-surface/5'} ${statusConfig[enq.status]?.color || 'text-on-surface-variant'}`}>{enq.status}</span>
                      <span className="raleway-text text-xs text-on-surface/25">{new Date(enq.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {showCard && registration && profile.role === 'worker' && (
        <WorkerDigitalCard
          worker={{
            id: registration.id as string,
            full_name: registration.full_name as string,
            trade_category: registration.trade_category as string,
            specific_role: registration.specific_role as string,
            nationality: registration.nationality as string,
            photo_url: registration.photo_url as string | null,
            status: registration.status as string,
          }}
          onClose={() => setShowCard(false)}
        />
      )}

      {showCard && registration && profile.role === 'employer' && (
        <EmployerDigitalCard
          employer={{
            id: registration.id as string,
            company_name: registration.company_name as string,
            industry: registration.industry as string,
            country: registration.country as string,
            status: registration.status as string,
          }}
          onClose={() => setShowCard(false)}
        />
      )}

      {showCard && registration && profile.role === 'oep_partner' && (
        <OEPDigitalCard
          oep={{
            id: registration.id as string,
            company_name: registration.company_name as string,
            license_number: registration.license_number as string,
            head_office_location: registration.head_office_location as string,
            status: registration.status as string,
          }}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  )
}
