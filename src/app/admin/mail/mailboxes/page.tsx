'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Mailbox {
  id: string
  address: string
  displayName: string | null
  kind: 'partner' | 'team'
}

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [localPart, setLocalPart] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [creating, setCreating] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<Mailbox | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/mail/mailboxes')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load mailboxes')
      setMailboxes(j.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    const clean = localPart.trim().toLowerCase().replace(/@czaah\.com$/, '').replace(/[^a-z0-9._%+-]/g, '')
    if (!clean) {
      setError('Enter the part before @czaah.com')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: `${clean}@czaah.com`, displayName: displayName.trim() }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create mailbox')
      setLocalPart('')
      setDisplayName('')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(mb: Mailbox) {
    try {
      const res = await fetch(`/api/mail/mailboxes?mailboxId=${encodeURIComponent(mb.id)}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Delete failed')
      setDeleteConfirm(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirm(null)
    }
  }

  const teamBoxes = mailboxes.filter((m) => m.kind === 'team')
  const partnerBoxes = mailboxes.filter((m) => m.kind === 'partner')

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading mailboxes...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Mailboxes</h1>
        <Link href="/admin/mail" className="text-xs text-primary hover:text-primary/80 transition-colors">
          Open Mail &rarr;
        </Link>
      </div>
      <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
        Team addresses on <span className="font-mono">@czaah.com</span>. Create one here, then read and
        send from it in <Link href="/admin/mail" className="text-primary">Mail</Link> using the mailbox
        picker. Inbound delivery also needs a Cloudflare Email Routing rule for the address (see note
        below).
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Create */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-none p-5 mb-8">
        <h2 className="font-[family-name:var(--font-heading)] text-sm text-on-surface mb-4 uppercase tracking-wider">
          New team mailbox
        </h2>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Address</label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/10">
              <input
                type="text"
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                className="flex-1 bg-transparent px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none"
                placeholder="info"
              />
              <span className="px-3 text-sm text-on-surface-variant/60 select-none">@czaah.com</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Display name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
              placeholder="CZAAH Support"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-primary text-on-primary font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Team mailboxes */}
      <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">Team ({teamBoxes.length})</h2>
      {teamBoxes.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-10 text-center mb-10">
          <p className="text-on-surface-variant text-sm">No team mailboxes yet.</p>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden mb-10">
          <table className="w-full text-sm">
            <tbody>
              {teamBoxes.map((mb) => (
                <tr key={mb.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-on-surface">{mb.address}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{mb.displayName || '--'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setDeleteConfirm(mb)}
                      className="text-xs text-error/70 hover:text-error transition-colors px-2 py-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Partner mailboxes (read-only here) */}
      {partnerBoxes.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">
            Partner ({partnerBoxes.length}) &mdash; managed from Partners
          </h2>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden mb-10">
            <table className="w-full text-sm">
              <tbody>
                {partnerBoxes.map((mb) => (
                  <tr key={mb.id} className="border-b border-outline-variant/10 last:border-0">
                    <td className="px-5 py-3 font-mono text-on-surface-variant">{mb.address}</td>
                    <td className="px-5 py-3 text-on-surface-variant/60">{mb.displayName || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="bg-surface-container-lowest/50 border border-outline-variant/10 rounded-none px-5 py-4 text-xs text-on-surface-variant/80 max-w-2xl leading-relaxed">
        <strong className="text-on-surface-variant">Inbound delivery:</strong> creating a mailbox here lets
        the app store and send from it. For mail sent <em>to</em> the address to arrive, Cloudflare Email
        Routing must forward it to the <span className="font-mono">czaah-mail-worker</span>. If a
        catch-all rule is set, new addresses work immediately; otherwise add a routing rule for each
        address in the Cloudflare dashboard (Email &rarr; Email Routing).
      </div>
    </div>
  )
}
