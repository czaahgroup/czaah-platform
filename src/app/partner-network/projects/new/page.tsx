'use client'

import { useRouter } from 'next/navigation'
import { ProjectForm, EMPTY_PROJECT, payloadFromProject, type ProjectFormValues } from '../ProjectForm'

export default function AddPartnerProjectPage() {
  const router = useRouter()

  async function create(values: ProjectFormValues) {
    try {
      const res = await fetch('/api/partner/developments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromProject(values)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'The project could not be saved.'
      router.push('/partner-network/projects')
    } catch {
      return 'The project could not be saved. Check your connection and try again.'
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="cinzel-text text-2xl text-on-surface mb-2">Add Project</h1>
      <p className="text-sm text-on-surface-variant/70 mb-6">
        CZAAH reviews every new project before it appears on CZAAH Properties. You will be notified when it is live.
      </p>
      <ProjectForm
        initial={EMPTY_PROJECT}
        submitLabel="Submit for approval"
        busyLabel="Submitting…"
        onSubmit={create}
        onCancel={() => router.push('/partner-network/projects')}
      />
    </div>
  )
}
