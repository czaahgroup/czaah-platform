'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { MineralOfferForm, formFromOffer, payloadFromMineral, type MineralFormValues } from '@/components/MineralOfferForm'
import { PARTNER_MAX_PHOTOS } from '@/lib/uploadSafety'
import { OFFER_STATUS_LABEL } from '@/lib/minerals'

// What saving does depends on where the offer is.
const SAVE: Record<string, { label: string; busy: string; help: string }> = {
  approved: {
    label: 'Save and send for approval',
    busy: 'Sending…',
    help: 'This offer is live. Saving a change takes it off the site until CZAAH approves it again.',
  },
  rejected: { label: 'Save and resubmit', busy: 'Sending…', help: 'Saving sends the offer back to CZAAH for approval.' },
  pending: { label: 'Save changes', busy: 'Saving…', help: 'This offer is awaiting approval. Your changes are saved straight away.' },
  sold: { label: 'Save changes', busy: 'Saving…', help: 'This offer is not on the site. Save your changes here, then use Relist on My Minerals.' },
  inactive: { label: 'Save changes', busy: 'Saving…', help: 'This offer is not on the site. Save your changes here, then use Relist on My Minerals.' },
}

export default function EditPartnerMineralPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [offer, setOffer] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/partner/minerals/${id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setError(json.error || 'This offer could not be loaded.')
        else setOffer(json.data)
      })
      .catch(() => { if (!cancelled) setError('This offer could not be loaded.') })
    return () => { cancelled = true }
  }, [id])

  async function save(values: MineralFormValues) {
    try {
      const res = await fetch(`/api/partner/minerals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromMineral(values)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'Your changes could not be saved.'
      router.push('/partner-network/minerals')
    } catch {
      return 'Your changes could not be saved. Check your connection and try again.'
    }
  }

  if (error && !offer) {
    return (
      <div className="max-w-3xl">
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>
        <Link href="/partner-network/minerals" className="text-sm text-primary hover:underline">← My Minerals</Link>
      </div>
    )
  }
  if (!offer) return <div className="text-on-surface-variant py-12 text-center">Loading…</div>

  const status = String(offer.status)
  const save_ = SAVE[status] || SAVE.pending
  return (
    <div className="max-w-3xl">
      <Link href="/partner-network/minerals" className="text-xs text-on-surface-variant/60 hover:text-primary">← My Minerals</Link>
      <h1 className="cinzel-text text-2xl text-on-surface mt-2 mb-2">Edit Mineral Offer</h1>
      <p className="text-sm text-on-surface-variant/70 mb-5">
        <span className="text-on-surface">{OFFER_STATUS_LABEL[status] || status}.</span> {save_.help}
      </p>
      {status === 'rejected' && typeof offer.rejection_notes === 'string' && offer.rejection_notes && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5">
          <p className="text-sm text-red-400">Not approved: {offer.rejection_notes}</p>
        </div>
      )}
      <MineralOfferForm
        initial={formFromOffer(offer)}
        submitLabel={save_.label}
        busyLabel={save_.busy}
        onSubmit={save}
        onCancel={() => router.push('/partner-network/minerals')}
        uploadEndpoint="/api/partner/media/upload-url"
        maxPhotos={PARTNER_MAX_PHOTOS}
      />
    </div>
  )
}
