'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminSidebarWrapper } from '@/components/AdminSidebarWrapper'
import { PartnerCallProvider } from '@/lib/contexts/PartnerCallContext'
import { MemberCallProvider } from '@/lib/contexts/MemberCallContext'
import { StaffCallProvider } from '@/lib/contexts/StaffCallContext'
import { NewMeetingMenu } from '@/components/NewMeetingMenu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [userId, setUserId] = useState('')
  const [roleLabel, setRoleLabel] = useState('Super Admin')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single()
      if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        window.location.href = '/dashboard'
        return
      }
      setFullName(profile.full_name || '')
      setRoleLabel(profile.role === 'super_admin' ? 'Super Admin' : 'Admin')
      setIsSuperAdmin(profile.role === 'super_admin')
      setUserId(session.user.id)
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <span className="raleway-text text-sm text-on-surface-variant/40">Loading...</span>
      </div>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo Area */}
      <div style={{
        padding: '28px 24px 22px',
        borderBottom: '1px solid var(--color-outline-variant, #4d4637)',
      }}>
        <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg className="markhor-mark" viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '32px', width: 'auto' }}>
            <defs>
              <linearGradient id="sideHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8a6f2e"/>
                <stop offset="40%" stopColor="#c9a84c"/>
                <stop offset="60%" stopColor="#e8c97a"/>
                <stop offset="100%" stopColor="#8a6f2e"/>
              </linearGradient>
              <linearGradient id="sideBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c9a84c"/>
                <stop offset="100%" stopColor="#8a6f2e"/>
              </linearGradient>
            </defs>
            <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#sideHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#sideHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
            <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#sideHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#sideHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
            <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#sideBodyGrad)" opacity="0.9"/>
            <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#sideHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
            <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#sideHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
            <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#sideHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
            <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
            <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
            <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#sideBodyGrad)" opacity="0.5"/>
            <line x1="35" y1="108" x2="55" y2="108" stroke="url(#sideHornGrad)" strokeWidth="1.5" opacity="0.7"/>
          </svg>
          <div>
            <span className="cinzel-text" style={{
              fontWeight: 600, fontSize: '18px', letterSpacing: '6px',
              color: 'transparent',
              background: 'linear-gradient(135deg, #8a6f2e 0%, #c9a84c 30%, #e8c97a 50%, #c9a84c 70%, #8a6f2e 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              lineHeight: 1, display: 'block',
            }}>CZAAH</span>
            <span className="raleway-text" style={{
              fontSize: '10px', letterSpacing: '3px',
              textTransform: 'uppercase' as const, color: '#e6c364',
              opacity: 0.4, marginTop: '4px', display: 'block',
            }}>{roleLabel}</span>
          </div>
        </Link>
      </div>

      {/* View Main Site */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant, #4d4637)', display: 'flex', flexDirection: 'column' }}>
        <Link href="/" className="admin-nav-link" style={{ opacity: 0.5, fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '6px 16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          View Main Site
        </Link>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <NavLink href="/admin" label="Overview" icon="dashboard" />
        {isSuperAdmin && <NavLink href="/admin/control-plane" label="Control Plane" icon="hub" />}
        {isSuperAdmin && <NavLink href="/admin/ai" label="AI" icon="auto_awesome" />}
        <NavLink href="/admin/registrant-messages" label="Live Chat" icon="support_agent" />
        {isSuperAdmin ? <NewMeetingMenu /> : <NavLink href="/admin/meetings" label="Meetings" icon="event" />}
        <NavLink href="/admin/analytics" label="Analytics" icon="analytics" />
        <NavLink href="/admin/notifications" label="Notifications" icon="notifications" />
        <NavLink href="/admin/membership-card" label="Membership Card" icon="card_membership" />

        <SectionHeader label="Members" />
        <NavLink href="/admin/kyc" label="KYC Review" icon="verified_user" />
        <NavLink href="/admin/workforce" label="Workforce" icon="engineering" />
        <NavLink href="/admin/employers" label="Employers" icon="apartment" />
        <NavLink href="/admin/oep" label="Employment Promoters" icon="flight_takeoff" />
        <NavLink href="/admin/elite-members" label="Elite Members" icon="workspace_premium" />
        <NavLink href="/admin/users" label="Users" icon="group" />

        <SectionHeader label="Recruitment" />
        <NavLink href="/admin/recruitment" label="Overview" icon="insights" />
        <NavLink href="/admin/recruitment/orders" label="Job Orders" icon="assignment" />

        <SectionHeader label="CRM" />
        <NavLink href="/admin/crm/dashboard" label="Overview" icon="dashboard" />
        <NavLink href="/admin/crm/search" label="Search" icon="search" />
        <NavLink href="/admin/crm/contacts" label="Contacts" icon="badge" />
        <NavLink href="/admin/crm/companies" label="Companies" icon="domain" />
        <NavLink href="/admin/crm/leads" label="Lead Board" icon="filter_alt" />
        <NavLink href="/admin/crm/pipeline" label="Pipeline" icon="view_kanban" />
        <NavLink href="/admin/crm/deals" label="Deals" icon="handshake" />
        <NavLink href="/admin/crm/tasks" label="Tasks" icon="checklist" />
        <NavLink href="/admin/crm/documents" label="Documents" icon="folder" />
        {isSuperAdmin && <NavLink href="/admin/crm/duplicates" label="Duplicates" icon="join_inner" />}
        <NavLink href="/admin/portal" label="Client Portal" icon="share" />

        <SectionHeader label="Enquiries" />
        <NavLink href="/admin/enquiries" label="All Enquiries" icon="contact_mail" />

        <SectionHeader label="Partner Network" />
        <NavLink href="/admin/partners" label="Partners" icon="handshake" />
        <NavLink href="/admin/partner-opportunities" label="Opportunities" icon="work" />
        <NavLink href="/admin/mail" label="Partner Mail" icon="forward_to_inbox" />
        <NavLink href="/admin/mail/dashboard" label="Mail Dashboard" icon="query_stats" />
        {isSuperAdmin && <NavLink href="/admin/mail/mailboxes" label="Mailboxes" icon="alternate_email" />}

        <SectionHeader label="Real Estate" />
        <NavLink href="/admin/properties" label="Properties" icon="apartment" />

        <SectionHeader label="Construction" />
        <NavLink href="/admin/construction" label="Overview" icon="insights" />
        <NavLink href="/admin/construction/projects" label="Projects" icon="engineering" />

        <SectionHeader label="Trading" />
        <NavLink href="/admin/trading" label="Overview" icon="insights" />
        <NavLink href="/admin/trading/trades" label="Trades" icon="local_shipping" />

        <SectionHeader label="Content" />
        <NavLink href="/admin/content/sectors" label="Sectors" icon="category" />
        <NavLink href="/admin/content/services" label="Services" icon="design_services" />
        <NavLink href="/admin/content/products" label="Products" icon="inventory_2" />

        <SectionHeader label="Investments" />
        <NavLink href="/admin/content/investments" label="All Investments" icon="trending_up" />
        <NavLink href="/admin/content/investments/pending" label="Pending Deals" icon="hourglass_top" />

        <SectionHeader label="System" />
        <NavLink href="/admin/contacts" label="Team Tools" icon="groups" />
        <NavLink href="/admin/settings" label="Settings" icon="settings" />
        <NavLink href="/admin/account" label="Account & Security" icon="lock" />
        <NavLink href="/admin/history" label="History" icon="history" />
        <NavLink href="/admin/audit-log" label="Audit Log" icon="history" />
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--color-outline-variant, #4d4637)',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <Link href="/dashboard/enquiries/new" className="raleway-text" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#e6c364', opacity: 0.5, textDecoration: 'none' }}>+ New Enquiry</Link>
        <p className="raleway-text" style={{ fontSize: '12px', color: '#e5e2e1', opacity: 0.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</p>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="admin-signout-btn raleway-text" style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: '11px', letterSpacing: '1px', color: '#e6c364', opacity: 0.5, transition: 'opacity 0.3s ease',
          }}>Sign Out</button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <PartnerCallProvider userId={userId} userName={fullName}>
        <MemberCallProvider userId={userId} userName={fullName} canManageGroup={isSuperAdmin}>
          <StaffCallProvider userId={userId} userName={fullName}>
            <AdminSidebarWrapper sidebar={sidebarContent} userName={fullName}>
              {children}
            </AdminSidebarWrapper>
          </StaffCallProvider>
        </MemberCallProvider>
      </PartnerCallProvider>

      <style>{`
        .admin-nav-link {
          display: flex; align-items: center; gap: 10px; padding: 10px 16px;
          font-family: 'Raleway', sans-serif; font-size: 13px; color: #d0c5b2;
          opacity: 0.6; text-decoration: none; border-left: 2px solid transparent;
          transition: all 0.25s ease; letter-spacing: 0.5px;
        }
        .admin-nav-link:hover { color: #e5e2e1; opacity: 1; border-left-color: rgba(230,195,100,0.3); background: rgba(230,195,100,0.03); }
        .admin-footer-link:hover { opacity: 0.8 !important; }
        .admin-signout-btn:hover { opacity: 1 !important; }
      `}</style>
    </>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ paddingTop: '20px', paddingBottom: '8px', paddingLeft: '16px' }}>
      <p className="cinzel-text" style={{ fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' as const, color: '#d0c5b2', opacity: 0.35, margin: 0 }}>{label}</p>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon?: string }) {
  return (
    <Link href={href} className="admin-nav-link">
      {icon && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>}
      {label}
    </Link>
  )
}
