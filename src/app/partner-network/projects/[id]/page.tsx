'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ProjectForm, formFromProject, payloadFromProject, type ProjectFormValues } from '../ProjectForm'
import { PROJECT_STATUS_LABEL } from '@/lib/partnerDevelopments'

const HELP: Record<string, string> = {
  draft: 'This project is awaiting approval. Your changes are saved straight away and CZAAH reviews the latest version.',
  archived: 'This project is not on the site. Save your changes here, then use "Send for approval" on My Projects.',
  published: 'This project is live and cannot be edited in place. Use "Edit" on My Projects to take it off the site first.',
}

export default function EditPartnerProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/partner/developments/${id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setError(json.error || 'This project could not be loaded.')
        else setProject(json.data)
      })
      .catch(() => { if (!cancelled) setError('This project could not be loaded.') })
    return () => { cancelled = true }
  }, [id])

  async function save(values: ProjectFormValues) {
    try {
      const res = await fetch(`/api/partner/developments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromProject(values)),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'Your changes could not be saved.'
      router.push('/partner-network/projects')
    } catch {
      return 'Your changes could not be saved. Check your connection and try again.'
    }
  }

  if (error && !project) {
    return (
      <div className="max-w-3xl">
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 mb-5"><p className="text-sm text-red-400">{error}</p></div>
        <Link href="/partner-network/projects" className="text-sm text-primary hover:underline">← My Projects</Link>
      </div>
    )
  }
  if (!project) return <div className="text-on-surface-variant py-12 text-center">Loading…</div>

  const status = String(project.status)
  return (
    <div className="max-w-3xl">
      <Link href="/partner-network/projects" className="text-xs text-on-surface-variant/60 hover:text-primary">← My Projects</Link>
      <h1 className="cinzel-text text-2xl text-on-surface mt-2 mb-2">Edit Project</h1>
      <p className="text-sm text-on-surface-variant/70 mb-5">
        <span className="text-on-surface">{PROJECT_STATUS_LABEL[status] || status}.</span> {HELP[status] || ''}
      </p>
      {status !== 'published' && (
        <ProjectForm
          initial={formFromProject(project)}
          submitLabel="Save changes"
          busyLabel="Saving…"
          onSubmit={save}
          onCancel={() => router.push('/partner-network/projects')}
        />
      )}
    </div>
  )
}
