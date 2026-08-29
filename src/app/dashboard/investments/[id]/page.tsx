'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'


interface Profile { id: string; full_name: string; role: string }
interface InvestmentImage { id: string; image_url: string; caption: string | null; display_order: number }
interface InvestmentDetail {
  id: string; title: string; sector_tag: string | null; status: string
  min_investment_amount: number | null; currency: string; target_return: string | null
  investment_timeline: string | null; description: string | null; key_highlights: string[]
  location: string | null; published_at: string | null; created_at: string
  documents_count: number; images: InvestmentImage[]
}

const STATUS_BADGES: Record<string, string> = { published: 'bg-green-500/10 text-green-400', closing_soon: 'bg-orange-500/10 text-orange-400' }
function formatStatus(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function formatCurrency(a: number | null, c: string) { if (a === null || a === undefined) return '--'; return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(a) }

export default function InvestmentDetailPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [investment, setInvestment] = useState<InvestmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expressing, setExpressing] = useState(false)
  const [expressed, setExpressed] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const id = params.id as string

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: prof } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
        if (!prof) { router.push('/login'); return }
        setProfile(prof)
        const res = await fetch(`/api/investments/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load investment')
        setInvestment(json.data)
      } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong') } finally { setLoading(false) }
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExpressInterest() {
    if (!investment || !profile) return
    setExpressing(true)
    try {
      const res = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectorId: null, productName: `Investment Interest: ${investment.title}`, description: `I am interested in the investment opportunity "${investment.title}". Please provide more details and next steps.`, estimatedQuantity: 'N/A', timeline: investment.investment_timeline || 'To be discussed' }) })
      if (!res.ok) { const json = await res.json(); throw new Error(json.error || 'Failed to express interest') }
      setExpressed(true)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to express interest') } finally { setExpressing(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="raleway-text text-on-surface-variant/50">Loading...</div></div>
  if (error && !investment) return <div className="flex items-center justify-center py-20"><div className="text-center"><p className="text-error mb-4">{error}</p><Link href="/dashboard/investments" className="text-primary text-sm no-underline">Back to Investments</Link></div></div>
  if (!investment) return null

  return (
    <>
      <Link href="/dashboard/investments" className="text-sm text-on-surface-variant/50 hover:text-primary transition-colors mb-6 inline-block raleway-text no-underline">&larr; Back to Investments</Link>

      {error && <div className="bg-error/10 border border-error/20 px-4 py-3 mb-6"><p className="text-sm text-error">{error}</p></div>}

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="cinzel-text text-3xl text-on-surface leading-tight">{investment.title}</h1>
          <span className={`text-xs px-3 py-1 shrink-0 ${STATUS_BADGES[investment.status] || ''}`}>{formatStatus(investment.status)}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-on-surface-variant/50">
          {investment.sector_tag && <span className="bg-primary/10 text-primary px-2.5 py-0.5 text-xs">{investment.sector_tag}</span>}
          {investment.location && <span className="raleway-text">{investment.location}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {investment.description && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6">
              <h2 className="cinzel-text text-lg text-on-surface mb-3">Overview</h2>
              <p className="text-sm text-on-surface-variant/60 leading-relaxed whitespace-pre-wrap raleway-text">{investment.description}</p>
            </div>
          )}
          {investment.key_highlights?.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6">
              <h2 className="cinzel-text text-lg text-on-surface mb-3">Key Highlights</h2>
              <ul className="space-y-2">
                {investment.key_highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant/60 raleway-text">
                    <span className="text-primary mt-0.5 shrink-0">&#9670;</span><span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {investment.images?.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6">
              <h2 className="cinzel-text text-lg text-on-surface mb-3">Gallery</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {investment.images.map((img) => (
                  <div key={img.id} className="overflow-hidden border border-outline-variant/10">
                    <img src={img.image_url} alt={img.caption || investment.title} className="w-full h-48 object-cover" />
                    {img.caption && <p className="text-xs text-on-surface-variant/50 px-3 py-2 raleway-text">{img.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-low border border-outline-variant/10 p-6">
            <h2 className="cinzel-text text-lg text-on-surface mb-4">Investment Details</h2>
            <div className="space-y-4">
              <div><p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-1 raleway-text">Minimum Investment</p><p className="text-xl cinzel-text text-on-surface">{formatCurrency(investment.min_investment_amount, investment.currency)}</p></div>
              <div className="border-t border-outline-variant/10 pt-4"><p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-1 raleway-text">Target Return</p><p className="text-lg font-semibold text-primary raleway-text">{investment.target_return || '--'}</p></div>
              {investment.investment_timeline && <div className="border-t border-outline-variant/10 pt-4"><p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-1 raleway-text">Investment Timeline</p><p className="text-sm text-on-surface raleway-text">{investment.investment_timeline}</p></div>}
              {investment.currency && <div className="border-t border-outline-variant/10 pt-4"><p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-1 raleway-text">Currency</p><p className="text-sm text-on-surface raleway-text">{investment.currency}</p></div>}
              {investment.documents_count > 0 && <div className="border-t border-outline-variant/10 pt-4"><p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-1 raleway-text">Documents Available</p><p className="text-sm text-on-surface raleway-text">{investment.documents_count} document{investment.documents_count !== 1 ? 's' : ''}</p></div>}
            </div>
          </div>

          <div className="bg-surface-container-low border border-primary/20 p-6">
            {expressed ? (
              <div className="text-center">
                <span className="material-symbols-outlined text-green-400 text-3xl mb-3 block">check_circle</span>
                <h3 className="cinzel-text text-lg text-on-surface mb-2">Interest Submitted</h3>
                <p className="text-sm text-on-surface-variant/50 mb-4 raleway-text">Your enquiry has been created. Our team will be in touch shortly.</p>
                <Link href="/dashboard/enquiries" className="text-sm text-primary no-underline raleway-text">View My Enquiries &rarr;</Link>
              </div>
            ) : (
              <>
                <h3 className="cinzel-text text-lg text-on-surface mb-2">Interested?</h3>
                <p className="text-sm text-on-surface-variant/50 mb-4 raleway-text">Express your interest and our team will reach out with further details and documentation.</p>
                <button onClick={handleExpressInterest} disabled={expressing} className="w-full liquid-gold-bg text-on-primary font-semibold px-5 py-3 text-sm transition-colors disabled:opacity-50 raleway-text">{expressing ? 'Submitting...' : 'Express Interest'}</button>
              </>
            )}
          </div>

          {investment.status === 'closing_soon' && (
            <div className="bg-orange-500/10 border border-orange-500/20 p-4">
              <p className="text-sm text-orange-400 font-medium mb-1 raleway-text">Closing Soon</p>
              <p className="text-xs text-orange-400/70 raleway-text">This investment opportunity is closing soon. Express your interest now to secure your place.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
