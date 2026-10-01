'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PropertyForm, formFromListing, payloadFromForm, type PropertyFormValues } from '../PropertyForm'
import { LISTING_STATUS_LABEL } from '@/lib/listingEdits'

interface Loaded {
  status: string
  rejection_notes: string | null
  change: { changes: Record<string, unknown>; status: 'pending' | 'rejected'; note: string | null } | null
  [key: string]: unknown
}

// What saving does depends on where the listing is.
const SAVE: Record<string, { label: string; busy: string; help: string }> = {
  approved: {
    label: 'Send changes for approval',
    busy: 'Sending…',
    help: 'This property is live. Your changes go to CZAAH for approval, and the property stays on the site as it is until they are accepted.',
  },
  rejected: {
    label: 'Save and resubmit',
    busy: 'Sending…',
    help: 'Saving sends the property back to CZAAH for approval.',
  },
  pending: { label: 'Save changes', busy: 'Saving…', help: 'This property is awaiting approval. Your changes are saved straight away.' },
  sold: { label: 'Save changes', busy: 'Saving…', help: 'This property is not on the site. Save your changes here, then use Relist on My Properties to send it for approval.' },
  inactive: { label: 'Save changes', busy: 'Saving…', help: 'This property is not on the site. Save your changes here, then use Relist on My Properties to send it for approval.' },
}

export default function EditPartnerPropertyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/partner/properties/${id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setError(json.error || 'This property could not be loaded.')
        else setListing(json.data)
      })
      .catch(() => { if (!cancelled) setError('This property could not be loaded.') })
    return () => { cancelled = true }
  }, [id])

  async function save(values: PropertyFormValues) {
    try {
      const res = await fetch(`/api/partner/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(values)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'Your changes could not be saved.'
      router.push('/partner-network/properties')
    } catch {
      return 'Your changes could not be saved. Check your connection and try again.'
    }
  }

  async function cancelChanges() {
    setCancelling(true)
    const res = await fetch(`/api/partner/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_changes' }),
    }).catch(() => null)
    if (res?.ok) window.location.reload()
    else {
      setError('The pending changes could not be cancelled.')
      setCancelling(false)
    }
  }

  if (error && !listing) {
    return (
      <div className="max-w-3xl">
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>
        <Link href="/partner-network/properties" className="text-sm text-primary hover:underline">← My Properties</Link>
      </div>
    )
  }
  if (!listing) return <div className="text-on-surface-variant py-12 text-center">Loading…</div>

  const save_ = SAVE[listing.status] || SAVE.pending
  const waiting = listing.change?.status === 'pending'
  // While changes are waiting, the form shows them — that is what the partner last wrote.
  const initial = formFromListing(waiting ? { ...listing, ...listing.change!.changes } : listing)

  return (
    <div className="max-w-3xl">
      <Link href="/partner-network/properties" className="text-xs text-on-surface-variant/60 hover:text-primary">← My Properties</Link>
      <h1 className="cinzel-text text-2xl text-on-surface mt-2 mb-2">Edit Property</h1>
      <p className="text-sm text-on-surface-variant/70 mb-5">
        <span className="text-on-surface">{LISTING_STATUS_LABEL[listing.status] || listing.status}.</span> {save_.help}
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>}

      {listing.status === 'rejected' && listing.rejection_notes && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5">
          <p className="text-sm text-red-400">Not approved: {listing.rejection_notes}</p>
        </div>
      )}
      {waiting && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 mb-5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-yellow-400">Changes are awaiting approval. The form shows them; the site still shows the approved version.</p>
          <button type="button" disabled={cancelling} onClick={cancelChanges} className="text-xs raleway-text px-3 py-2 border border-yellow-500/30 text-yellow-400 disabled:opacity-50">
            {cancelling ? 'Cancelling…' : 'Cancel these changes'}
          </button>
        </div>
      )}
      {listing.change?.status === 'rejected' && (
        <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-3 mb-5">
          <p className="text-sm text-orange-400">
            Your last changes were not approved{listing.change.note ? `: ${listing.change.note}` : '.'} The property is still live as it was.
          </p>
        </div>
      )}

      <PropertyForm
        initial={initial}
        submitLabel={save_.label}
        busyLabel={save_.busy}
        onSubmit={save}
        onCancel={() => router.push('/partner-network/properties')}
      />
    </div>
  )
}
