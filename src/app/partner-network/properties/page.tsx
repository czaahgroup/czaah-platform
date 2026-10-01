'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { publicUrl } from '@/components/PhotoUploader'
import { LISTING_STATUS_LABEL, type OwnerAction } from '@/lib/listingEdits'

interface Listing {
  id: string
  title: string
  property_type: string
  listing_type: string
  price: number | null
  currency: string
  location: string
  city: string
  country: string | null
  images: string[] | null
  status: string
  rejection_notes: string | null
  change_status: 'pending' | 'rejected' | null
  change_note: string | null
  created_at: string
}

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  sold: 'bg-neutral-500/20 text-neutral-400',
  inactive: 'bg-neutral-500/20 text-neutral-400',
}

const CONFIRM: Record<string, string> = {
  mark_sold: 'Mark this property as sold / let? It comes off the site straight away.',
  withdraw: 'Withdraw this property? It comes off the site straight away. You can relist it later, which needs approval again.',
  relist: 'Send this property for approval again?',
  delete: 'Delete this property? This cannot be undone.',
}

const actionClass = 'text-xs raleway-text px-3 py-2 border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors disabled:opacity-50'

export default function PartnerPropertiesPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/properties')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load your properties.')
      setListings(json.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your properties.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(listing: Listing, action: OwnerAction | 'delete', done: string) {
    if (!window.confirm(CONFIRM[action])) return
    setBusy(listing.id)
    setNotice(null)
    try {
      const res = await fetch(`/api/partner/properties/${listing.id}`, action === 'delete'
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'That did not work. Please try again.')
      setNotice(`${listing.title}: ${done}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="text-on-surface-variant py-12 text-center">Loading your properties…</div>

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h1 className="cinzel-text text-2xl text-on-surface">My Properties</h1>
        <Link href="/partner-network/properties/new" className="text-xs px-4 py-2.5 bg-primary text-on-primary raleway-text font-semibold">+ Add Property</Link>
      </div>
      <p className="text-sm text-on-surface-variant/70 mb-6 max-w-2xl">
        New properties and changes to a live property are reviewed by CZAAH before they appear on CZAAH Properties.
        Marking a property sold or withdrawing it takes effect straight away.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>}
      {notice && <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 mb-5"><p className="text-sm text-green-400">{notice}</p></div>}

      {!error && listings.length === 0 ? (
        <div className="bg-surface-container border border-outline-variant/10 px-6 py-16 text-center">
          <p className="text-on-surface-variant text-sm mb-4">You have not added any properties yet.</p>
          <Link href="/partner-network/properties/new" className="text-sm text-primary hover:underline">Add your first property →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((p) => {
            const image = p.images?.[0] ? publicUrl(p.images[0]) : null
            const waiting = busy === p.id
            return (
              <div key={p.id} className="bg-surface-container border border-outline-variant/10 p-4 sm:p-5">
                <div className="flex gap-4">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="w-20 h-20 sm:w-28 sm:h-24 object-cover shrink-0 bg-surface-container-high" />
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-24 shrink-0 bg-surface-container-high flex items-center justify-center text-on-surface-variant/30" aria-hidden="true">
                      <span className="material-symbols-outlined">apartment</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-on-surface break-words">{p.title}</span>
                      <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_BADGES[p.status] || STATUS_BADGES.inactive}`}>{LISTING_STATUS_LABEL[p.status] || p.status}</span>
                      {p.change_status === 'pending' && <span className="text-xs px-2 py-0.5 shrink-0 bg-yellow-500/20 text-yellow-400">Changes awaiting approval</span>}
                    </div>
                    <div className="text-xs text-on-surface-variant/60">
                      {[p.location, p.city, p.country].filter(Boolean).join(', ')}
                    </div>
                    <div className="text-sm text-primary mt-1">
                      {p.price ? `${p.currency} ${Number(p.price).toLocaleString('en-GB')}` : 'Price on request'}
                    </div>
                    {p.status === 'rejected' && p.rejection_notes && (
                      <p className="text-xs text-red-400 mt-2">Not approved: {p.rejection_notes} Edit the property to send it again.</p>
                    )}
                    {p.change_status === 'rejected' && (
                      <p className="text-xs text-orange-400 mt-2">Your last changes were not approved{p.change_note ? `: ${p.change_note}` : '.'} The property is still live as it was.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mt-4">
                  <Link href={`/partner-network/properties/${p.id}`} className={actionClass}>Edit</Link>
                  {p.status === 'approved' && (
                    <>
                      <a href={`https://property.czaah.com/${p.id}`} target="_blank" rel="noopener noreferrer" className={actionClass}>View on site</a>
                      <button type="button" disabled={waiting} className={actionClass} onClick={() => act(p, 'mark_sold', 'marked as sold / let.')}>Mark sold / let</button>
                    </>
                  )}
                  {(p.status === 'approved' || p.status === 'pending') && (
                    <button type="button" disabled={waiting} className={actionClass} onClick={() => act(p, 'withdraw', 'withdrawn.')}>Withdraw</button>
                  )}
                  {(p.status === 'sold' || p.status === 'inactive') && (
                    <button type="button" disabled={waiting} className={actionClass} onClick={() => act(p, 'relist', 'sent for approval.')}>Relist</button>
                  )}
                  {(p.status === 'pending' || p.status === 'rejected') && (
                    <button type="button" disabled={waiting} className={`${actionClass} !text-red-400 !border-red-500/30`} onClick={() => act(p, 'delete', 'deleted.')}>Delete</button>
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
