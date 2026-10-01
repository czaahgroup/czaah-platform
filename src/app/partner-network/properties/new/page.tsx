'use client'

import { useRouter } from 'next/navigation'
import { PropertyForm, EMPTY_PROPERTY, payloadFromForm, type PropertyFormValues } from '../PropertyForm'

export default function AddPartnerPropertyPage() {
  const router = useRouter()

  async function create(values: PropertyFormValues) {
    try {
      const res = await fetch('/api/partner/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(values)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'The property could not be saved.'
      router.push('/partner-network/properties')
    } catch {
      return 'The property could not be saved. Check your connection and try again.'
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="cinzel-text text-2xl text-on-surface mb-2">Add Property</h1>
      <p className="text-sm text-on-surface-variant/70 mb-6">
        CZAAH reviews every new property before it appears on CZAAH Properties. You will be notified when it is approved.
      </p>
      <PropertyForm
        initial={EMPTY_PROPERTY}
        submitLabel="Submit for approval"
        busyLabel="Submitting…"
        onSubmit={create}
        onCancel={() => router.push('/partner-network/properties')}
      />
    </div>
  )
}
