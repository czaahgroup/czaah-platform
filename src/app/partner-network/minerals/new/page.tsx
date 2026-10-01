'use client'

import { useRouter } from 'next/navigation'
import { MineralOfferForm, EMPTY_MINERAL, payloadFromMineral, type MineralFormValues } from '@/components/MineralOfferForm'
import { PARTNER_MAX_PHOTOS } from '@/lib/uploadSafety'

export default function AddPartnerMineralPage() {
  const router = useRouter()

  async function create(values: MineralFormValues) {
    try {
      const res = await fetch('/api/partner/minerals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromMineral(values)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'The offer could not be saved.'
      router.push('/partner-network/minerals')
    } catch {
      return 'The offer could not be saved. Check your connection and try again.'
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="cinzel-text text-2xl text-on-surface mb-2">Add Mineral Offer</h1>
      <p className="text-sm text-on-surface-variant/70 mb-6">
        CZAAH reviews every offer before it appears on CZAAH Minerals. Your name and contact details are never shown on the site:
        buyers send their request to CZAAH.
      </p>
      <MineralOfferForm
        initial={EMPTY_MINERAL}
        submitLabel="Submit for approval"
        busyLabel="Submitting…"
        onSubmit={create}
        onCancel={() => router.push('/partner-network/minerals')}
        uploadEndpoint="/api/partner/media/upload-url"
        maxPhotos={PARTNER_MAX_PHOTOS}
      />
    </div>
  )
}
