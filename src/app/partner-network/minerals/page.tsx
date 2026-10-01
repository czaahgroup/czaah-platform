'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { publicUrl } from '@/components/PhotoUploader'
import { OFFER_STATUS_LABEL, OFFER_TYPE_LABEL, offerPrice, offerQuantity, type MineralAction, type PublicOffer } from '@/lib/minerals'

type Offer = PublicOffer & { status: string; rejection_notes: string | null }

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  sold: 'bg-neutral-500/20 text-neutral-400',
  inactive: 'bg-neutral-500/20 text-neutral-400',
}

const CONFIRM: Record<string, string> = {
  mark_sold: 'Mark this offer as sold / closed? It comes off the site straight away.',
  withdraw: 'Withdraw this offer? It comes off the site straight away. You can relist it later, which needs approval again.',
  relist: 'Send this offer for approval again?',
  delete: 'Delete this offer? This cannot be undone.',
}

const actionClass = 'text-xs raleway-text px-3 py-2 border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors disabled:opacity-50'

export default function PartnerMineralsPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/minerals')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load your offers.')
      setOffers(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your offers.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(offer: Offer, action: MineralAction | 'delete', done: string) {
    if (!window.confirm(CONFIRM[action])) return
    setBusy(offer.id)
    setNotice(null)
    try {
      const res = await fetch(`/api/partner/minerals/${offer.id}`, action === 'delete'
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'That did not work. Please try again.')
      setNotice(`${offer.title}: ${done}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading your offers…</div>

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h1 className="cinzel-text text-2xl text-on-surface">My Minerals</h1>
        <Link href="/partner-network/minerals/new" className="text-xs px-4 py-2.5 bg-primary text-on-primary raleway-text font-semibold">+ Add Offer</Link>
      </div>
      <p className="text-sm text-on-surface-variant/70 mb-6 max-w-2xl">
        Minerals for sale, joint ventures, licences and investment opportunities. CZAAH reviews every offer before it appears on
        CZAAH Minerals, and reviews it again if you change it. Marking an offer sold or withdrawing it takes effect straight away.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>}
      {notice && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-5"><p className="text-sm text-green-400">{notice}</p></div>}

      {!error && offers.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant text-sm mb-4">You have not added any mineral offers yet.</p>
          <Link href="/partner-network/minerals/new" className="text-sm text-primary hover:underline">Add your first offer →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => {
            const image = o.images?.[0] ? publicUrl(o.images[0]) : null
            const waiting = busy === o.id
            return (
              <div key={o.id} className="bg-surface-container border border-outline-variant/10 p-4 sm:p-5">
                <div className="flex gap-4">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="w-20 h-20 sm:w-28 sm:h-24 object-cover shrink-0 bg-surface-container-high" />
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-24 shrink-0 bg-surface-container-high flex items-center justify-center text-on-surface-variant/30" aria-hidden="true">
                      <span className="material-symbols-outlined">diamond</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-on-surface break-words">{o.title}</span>
                      <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[o.status] || STATUS_BADGES.inactive}`}>{OFFER_STATUS_LABEL[o.status] || o.status}</span>
                      {o.verified && <span className="text-xs px-2 py-0.5 shrink-0 bg-green-500/20 text-green-400">Verified</span>}
                    </div>
                    <div className="text-xs text-on-surface-variant/60">
                      {o.reference} · {OFFER_TYPE_LABEL[o.offer_type]} · {[o.origin_region, o.origin_country].filter(Boolean).join(', ')}
                    </div>
                    <div className="text-sm text-primary mt-1">
                      {[offerQuantity(o.quantity_available, o.quantity_unit), offerPrice(o) || 'Price on request'].filter(Boolean).join(' · ')}
                    </div>
                    {o.status === 'rejected' && o.rejection_notes && (
                      <p className="text-xs text-red-400 mt-2">Not approved: {o.rejection_notes} Edit the offer to send it again.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mt-4">
                  <Link href={`/partner-network/minerals/${o.id}`} className={actionClass}>{o.status === 'approved' ? 'Edit (needs approval again)' : 'Edit'}</Link>
                  {o.status === 'approved' && (
                    <>
                      <a href={`https://minerals.czaah.com/offers/${o.id}`} target="_blank" rel="noopener noreferrer" className={actionClass}>View on site</a>
                      <button type="button" disabled={waiting} className={actionClass} onClick={() => act(o, 'mark_sold', 'marked as sold / closed.')}>Mark sold / closed</button>
                    </>
                  )}
                  {(o.status === 'approved' || o.status === 'pending') && (
                    <button type="button" disabled={waiting} className={actionClass} onClick={() => act(o, 'withdraw', 'withdrawn.')}>Withdraw</button>
                  )}
                  {(o.status === 'sold' || o.status === 'inactive') && (
                    <button type="button" disabled={waiting} className={actionClass} onClick={() => act(o, 'relist', 'sent for approval.')}>Relist</button>
                  )}
                  {o.status !== 'approved' && (
                    <button type="button" disabled={waiting} className={`${actionClass} !text-red-400 !border-red-500/30`} onClick={() => act(o, 'delete', 'deleted.')}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
