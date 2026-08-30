'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Mailbox {
  id: string
  address: string
  displayName: string | null
  kind: 'partner' | 'team'
  partnerId: string | null
  webmailEnabled: boolean
}

interface PartnerOpt {
  id: string
  code: string
  name: string
  company: string | null
  hasMailbox: boolean
}

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [partners, setPartners] = useState<PartnerOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create form
  const [localPart, setLocalPart] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [owner, setOwner] = useState('') // '' = team, else partner id
  const [creating, setCreating] = useState(false)

  // edit modal
  const [editBox, setEditBox] = useState<Mailbox | null>(null)
  const [editLocal, setEditLocal] = useState('')
  const [editName, setEditName] = useState('')
  const [editPw, setEditPw] = useState('')
  const [editDisableWebmail, setEditDisableWebmail] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteBox, setDeleteBox] = useState<Mailbox | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/mail/mailboxes?withPartners=1')
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to load mailboxes')
      setMailboxes(j.data || [])
      setPartners(j.partners || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function cleanLocal(v: string) {
    return v.trim().toLowerCase().replace(/@czaah\.com$/, '').replace(/[^a-z0-9._%+-]/g, '')
  }

  async function handleCreate() {
    const clean = cleanLocal(localPart)
    if (!clean) { setError('Enter the part before @czaah.com'); return }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: `${clean}@czaah.com`,
          displayName: displayName.trim(),
          partnerId: owner || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not create mailbox')
      setLocalPart(''); setDisplayName(''); setOwner('')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(mb: Mailbox) {
    setEditBox(mb)
    setEditLocal(mb.address.replace(/@czaah\.com$/, ''))
    setEditName(mb.displayName || '')
    setEditPw('')
    setEditDisableWebmail(false)
    setError(null)
  }

  async function handleSaveEdit() {
    if (!editBox) return
    const clean = cleanLocal(editLocal)
    if (!clean) { setError('Address cannot be empty'); return }
    if (editPw && editPw.length < 8) { setError('Webmail password must be at least 8 characters'); return }
    setSavingEdit(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        mailboxId: editBox.id,
        address: `${clean}@czaah.com`,
        displayName: editName.trim(),
      }
      if (editDisableWebmail) payload.webmailPassword = ''
      else if (editPw) payload.webmailPassword = editPw

      const res = await fetch('/api/mail/mailboxes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Save failed')
      setEditBox(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(mb: Mailbox) {
    try {
      const qs = new URLSearchParams({ mailboxId: mb.id })
      if (mb.kind === 'partner') qs.set('confirmPartner', '1')
      const res = await fetch(`/api/mail/mailboxes?${qs}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Delete failed')
      setDeleteBox(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteBox(null)
    }
  }

  const teamBoxes = mailboxes.filter((m) => m.kind === 'team')
  const partnerBoxes = mailboxes.filter((m) => m.kind === 'partner')
  const availablePartners = partners.filter((p) => !p.hasMailbox)

  if (loading) {
    return <div className="text-on-surface-variant py-12 text-center">Loading mailboxes...</div>
  }

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface">Mailboxes</h1>
        <Link href="/admin/mail" className="text-xs text-primary hover:text-primary/80 transition-colors">Open Mail &rarr;</Link>
      </div>
      <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
        Addresses on <span className="font-mono">@czaah.com</span>. Create a <strong>team</strong> address
        or assign one to a <strong>partner</strong>, then read and send from it in{' '}
        <Link href="/admin/mail" className="text-primary">Mail</Link> via the mailbox picker. Give a
        mailbox a <strong>webmail password</strong> (Edit) and its owner can sign in directly at{' '}
        <span className="font-mono">czaah.com/webmail</span>.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-none px-4 py-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Create */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-none p-5 mb-8">
        <h2 className="font-[family-name:var(--font-heading)] text-sm text-on-surface mb-4 uppercase tracking-wider">New mailbox</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Address</label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/10">
              <input
                type="text" value={localPart}
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
              type="text" value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              className={inputCls}
              placeholder="CZAAH Support"
            />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Owner</label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
              <option value="">Team (worked by admins)</option>
              {availablePartners.length > 0 && <option disabled>──────────</option>}
              {availablePartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.company ? ` · ${p.company}` : ''} ({p.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreate} disabled={creating}
              className="bg-primary text-on-primary font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 w-full md:w-auto"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>

      {/* Team */}
      <MailboxTable
        title={`Team (${teamBoxes.length})`}
        rows={teamBoxes}
        emptyText="No team mailboxes yet."
        onEdit={openEdit}
        onDelete={setDeleteBox}
      />

      {/* Partner */}
      <MailboxTable
        title={`Partner (${partnerBoxes.length})`}
        rows={partnerBoxes}
        emptyText="No partner mailboxes."
        onEdit={openEdit}
        onDelete={setDeleteBox}
      />

      <div className="bg-surface-container-lowest/50 border border-outline-variant/10 rounded-none px-5 py-4 text-xs text-on-surface-variant/80 max-w-2xl leading-relaxed mt-4">
        <strong className="text-on-surface-variant">Receiving mail:</strong> a mailbox here can send right
        away (czaah.com is verified in Resend). For mail sent <em>to</em> the address to arrive, Cloudflare
        Email Routing must forward it to <span className="font-mono">czaah-mail-worker</span> — a catch-all
        rule covers every address, otherwise add one per address (Cloudflare &rarr; Email &rarr; Email Routing).
      </div>

      {/* Edit modal */}
      {editBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditBox(null)}>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-1">Edit mailbox</h3>
            <p className="text-xs text-on-surface-variant/60 mb-5">{editBox.kind === 'partner' ? 'Partner mailbox' : 'Team mailbox'}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Address</label>
                <div className="flex items-center bg-surface-container-lowest border border-outline-variant/10">
                  <input type="text" value={editLocal} onChange={(e) => setEditLocal(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2.5 text-on-surface text-sm outline-none" />
                  <span className="px-3 text-sm text-on-surface-variant/60 select-none">@czaah.com</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/50 mt-1">Changing this needs a matching Cloudflare Email Routing rule.</p>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Display name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} placeholder="(none)" />
              </div>

              <div className="border-t border-outline-variant/10 pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-on-surface-variant">Webmail login</label>
                  <span className={`text-[11px] px-1.5 py-0.5 ${editBox.webmailEnabled ? 'bg-green-500/20 text-green-400' : 'bg-neutral-500/20 text-neutral-400'}`}>
                    {editBox.webmailEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <input
                  type="text" value={editPw}
                  onChange={(e) => { setEditPw(e.target.value); setEditDisableWebmail(false) }}
                  className={inputCls}
                  placeholder={editBox.webmailEnabled ? 'New password (leave blank to keep)' : 'Set a password (min 8 chars)'}
                  disabled={editDisableWebmail}
                />
                <p className="text-[11px] text-on-surface-variant/50 mt-1">
                  Lets this address sign in at <span className="font-mono">czaah.com/webmail</span> with just the address + this password.
                </p>
                {editBox.webmailEnabled && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant cursor-pointer">
                    <input type="checkbox" checked={editDisableWebmail} onChange={(e) => { setEditDisableWebmail(e.target.checked); if (e.target.checked) setEditPw('') }} className="accent-primary" />
                    Turn off webmail login for this mailbox
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditBox(null)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-primary text-on-primary font-semibold px-5 py-2 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteBox(null)}>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-none w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-on-surface mb-2">Delete {deleteBox.address}?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {deleteBox.kind === 'partner'
                ? 'This is a partner mailbox. Deleting it permanently removes all of that partner’s mail threads, messages and attachments.'
                : 'This permanently removes the mailbox and all its threads, messages and attachments.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteBox(null)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface border border-outline-variant/10 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteBox)} className="bg-error text-white font-semibold px-5 py-2 text-sm hover:bg-error/80 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MailboxTable({ title, rows, emptyText, onEdit, onDelete }: {
  title: string
  rows: Mailbox[]
  emptyText: string
  onEdit: (mb: Mailbox) => void
  onDelete: (mb: Mailbox) => void
}) {
  return (
    <div className="mb-10">
      <h2 className="text-xs uppercase tracking-wider text-on-surface-variant/60 mb-3">{title}</h2>
      {rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none px-6 py-8 text-center">
          <p className="text-on-surface-variant text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-none overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((mb) => (
                <tr key={mb.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-on-surface">
                    {mb.address}
                    {mb.webmailEnabled && (
                      <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 align-middle" title="Webmail login enabled">webmail</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{mb.displayName || '--'}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(mb)} className="text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1">Edit</button>
                    <button onClick={() => onDelete(mb)} className="text-xs text-error/70 hover:text-error transition-colors px-2 py-1">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
