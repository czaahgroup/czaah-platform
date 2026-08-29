'use client'
// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import MailComposeModal from './MailComposeModal'
import MailMessageBody from './MailMessageBody'
import RichTextEditor from './RichTextEditor'
import AttachmentPicker from './AttachmentPicker'
import MailAssist from './MailAssist'
import SignatureModal from './SignatureModal'
import ContactPanel from './ContactPanel'
import MailContacts from './MailContacts'
import { MAIL_THEME_CSS } from './mail-theme'
import { buildQuote } from '@/lib/mailFormat'

const NAV = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'starred', label: 'Starred' },
  { key: 'archived', label: 'Archived' },
] as const

function avatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return `hsl(${h} 45% 42%)`
}

export default function MailWorkspace({
  heading,
  outboundLabel,
  monitorNote,
}: {
  heading: string
  outboundLabel: string
  monitorNote?: string
}) {
  const supabase = createClient()

  const [mailboxes, setMailboxes] = useState<any[]>([])
  const [mailboxId, setMailboxId] = useState('')
  const [labels, setLabels] = useState<any[]>([])

  const [threads, setThreads] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [threadInfo, setThreadInfo] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<'inbox' | 'starred' | 'archived'>('inbox')
  const [labelFilter, setLabelFilter] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const [replyHtml, setReplyHtml] = useState('')
  const [replyAll, setReplyAll] = useState(false)
  const [replyFiles, setReplyFiles] = useState<any[]>([])
  const [replyOpen, setReplyOpen] = useState(false)

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeInitial, setComposeInitial] = useState<any>(null)
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const [sigOpen, setSigOpen] = useState(false)
  const [view, setView] = useState<'mail' | 'contacts'>('mail')
  const [contactOpen, setContactOpen] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)

  // Mobile: single-pane layout with a slide-in nav drawer.
  const [isNarrow, setIsNarrow] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  const closeNav = () => setNavOpen(false)

  const activeMailbox = useMemo(() => mailboxes.find((m) => m.id === mailboxId) || null, [mailboxes, mailboxId])

  // ---- bootstrap --------------------------------------------------------
  useEffect(() => {
    fetch('/api/mail/mailboxes')
      .then((r) => r.json())
      .then((j) => {
        const list = j.data || []
        setMailboxes(list)
        if (list.length && !mailboxId) setMailboxId(list[0].id)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mailboxId) return
    fetch(`/api/mail/labels?mailboxId=${mailboxId}`).then((r) => r.json()).then((j) => setLabels(j.data || []))
  }, [mailboxId])

  // ---- thread list ----------------------------------------------------
  const loadThreads = useCallback(async () => {
    if (!mailboxId) return
    const params = new URLSearchParams({ mailboxId, filter })
    if (labelFilter) params.set('labelId', labelFilter)
    if (query.trim()) params.set('q', query.trim())
    const res = await fetch(`/api/mail/threads?${params}`)
    const json = await res.json()
    if (res.ok) setThreads(json.data || [])
    setLoading(false)
  }, [mailboxId, filter, labelFilter, query])

  useEffect(() => {
    setLoading(true)
    setSelectedId(null)
    setMessages([])
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // ---- open thread --------------------------------------------------
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setThreadLoading(true)
    setReplyHtml(''); setReplyAll(false); setReplyFiles([]); setReplyOpen(false); setContactOpen(false)
    fetch(`/api/mail/threads/${selectedId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        setMessages(j.messages || [])
        setThreadInfo(j.thread || null)
        loadThreads()
      })
      .finally(() => { if (!cancelled) setThreadLoading(false) })
    return () => { cancelled = true }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll the message list to the bottom WITHOUT scrolling outer ancestors
  // (scrollIntoView would push the app chrome off-screen).
  useEffect(() => {
    const el = endRef.current?.parentElement
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, replyOpen])

  useEffect(() => {
    if (!selectedId) return
    const channel = supabase
      .channel(`mail-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mailbox_messages', filter: `thread_id=eq.${selectedId}` },
        (p: any) => setMessages((prev) => (prev.some((m) => m.id === p.new.id) ? prev : [...prev, p.new])))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- actions ------------------------------------------------------
  async function sendReply() {
    const plain = replyHtml.replace(/<[^>]+>/g, '').trim()
    const goodFiles = replyFiles.filter((f: any) => f.path && !f.failed)
    if (!selectedId || (!plain && !goodFiles.length) || sending) return
    if (replyFiles.some((f: any) => f.uploading)) { setError('Wait for attachments to finish uploading.'); return }
    setSending(true); setError(null)
    try {
      const res = await fetch(`/api/mail/threads/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyHtml: replyHtml, replyAll, attachments: replyFiles.filter((f: any) => f.path && !f.failed) }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to send.'); return }
      setMessages((prev) => (prev.some((m) => m.id === json.data.id) ? prev : [...prev, json.data]))
      setReplyHtml(''); setReplyFiles([]); setReplyOpen(false)
      loadThreads()
    } finally {
      setSending(false)
    }
  }

  async function threadAction(action: string, extra: any = {}) {
    if (!selectedId || acting) return
    setActing(true); setError(null)
    try {
      const res = await fetch(`/api/mail/threads/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Action failed.')
        return
      }
      const drops =
        action === 'delete' ||
        (action === 'archive' && filter === 'inbox') ||
        (action === 'unarchive' && filter === 'archived') ||
        (action === 'unstar' && filter === 'starred')
      if (drops) { setSelectedId(null); setMessages([]) }
      else fetch(`/api/mail/threads/${selectedId}`).then((r) => r.json()).then((j) => setThreadInfo(j.thread || null))
      loadThreads()
    } finally {
      setActing(false)
    }
  }

  async function quickStar(threadId: string, starred: boolean) {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, starred: !starred } : t)))
    await fetch(`/api/mail/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: starred ? 'unstar' : 'star' }),
    })
    loadThreads()
  }

  async function createLabel() {
    const name = window.prompt('New label name')
    if (!name) return
    const res = await fetch('/api/mail/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mailboxId }),
    })
    const j = await res.json()
    if (res.ok) setLabels((prev) => [...prev, j.data].sort((a, b) => a.name.localeCompare(b.name)))
    else setError(j.error || 'Could not create label.')
  }

  async function openAttachment(id: string) {
    const res = await fetch(`/api/mail/attachments/${id}`)
    const j = await res.json()
    if (j.url) window.open(j.url, '_blank', 'noopener')
    else setError(j.error || 'Could not open attachment.')
  }

  function openForward() {
    const src = [...messages].reverse()[0]
    if (!src) return
    setComposeInitial({
      subject: 'Fwd: ' + (threadInfo?.subject || '').replace(/^(fwd?:\s*)/i, ''),
      bodyHtml: buildQuote({
        fromLabel: src.from_address,
        dateLabel: new Date(src.created_at).toLocaleString(),
        bodyHtml: src.body_html,
        bodyText: src.body_text,
      }),
    })
    setComposeOpen(true)
  }

  function fmt(dateStr: string, full = false) {
    const d = new Date(dateStr)
    if (full) return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff === 0) return time
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const replyPlain = replyHtml.replace(/<[^>]+>/g, '').trim()

  return (
    <div className="czaah-mail" style={{ height: 'calc(100dvh - 92px)', display: 'flex', flexDirection: 'column', background: 'var(--mail-panel)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--mail-border)', boxShadow: 'var(--mail-shadow)' }}>
      <style>{MAIL_THEME_CSS}</style>

      {/* ---- top bar ---- */}
      <div className="mi-topbar" style={{ height: '56px', flexShrink: 0, borderBottom: '1px solid var(--mail-border)', display: 'flex', alignItems: 'center', gap: '18px', padding: '0 20px', background: 'var(--mail-panel)' }}>
        <button className="mi-menu-btn" onClick={() => setNavOpen(true)} aria-label="Menu">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        {!isNarrow && (
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '15px', letterSpacing: '0.18em', color: 'var(--mail-text)', whiteSpace: 'nowrap' }}>
            CZAAH <span style={{ color: 'var(--mail-gold)' }}>MAIL</span>
          </div>
        )}
        <div className="mi-search" style={{ flex: 1, maxWidth: '620px', position: 'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mail-text-faint)' }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail"
            className="mi-input"
            style={{ paddingLeft: '34px', background: 'var(--mail-panel-2)' }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {mailboxes.length > 1 ? (
            <select
              value={mailboxId}
              onChange={(e) => setMailboxId(e.target.value)}
              style={{ background: 'var(--mail-panel-2)', border: '1px solid var(--mail-border)', color: 'var(--mail-text)', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', fontFamily: 'inherit', maxWidth: '230px' }}
            >
              {mailboxes.map((m) => <option key={m.id} value={m.id}>{(m.displayName || m.address)} — {m.address}</option>)}
            </select>
          ) : activeMailbox ? (
            <span style={{ fontSize: '12px', color: 'var(--mail-text-dim)' }}>{activeMailbox.address}</span>
          ) : null}
        </div>
      </div>

      {/* ---- body ---- */}
      <div className="mi-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 190px) minmax(240px, 300px) minmax(0, 1fr)' }}>
        {isNarrow && navOpen && <div className="mi-backdrop" onClick={closeNav} />}
        {/* nav rail */}
        <div className={`mi-navrail ${navOpen ? 'is-open' : ''}`} style={{ position: 'relative', borderRight: '1px solid var(--mail-border)', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '3px', background: 'var(--mail-sidebar)', overflowY: 'auto' }}>
          <button
            onClick={() => { closeNav(); setComposeInitial(null); setComposeOpen(true) }}
            disabled={!mailboxId}
            className="mi-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
            Compose
          </button>

          {NAV.map((n) => (
            <button key={n.key} className={`mi-nav ${view === 'mail' && filter === n.key ? 'is-active' : ''}`} onClick={() => { closeNav(); setView('mail'); setFilter(n.key); setLabelFilter(''); setSelectedId(null) }}>
              {n.label}
            </button>
          ))}
          <button className={`mi-nav ${view === 'contacts' ? 'is-active' : ''}`} onClick={() => { closeNav(); setView('contacts') }}>
            Contacts
          </button>

          <div style={{ borderTop: '1px solid var(--mail-border)', margin: '12px 4px', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 6px' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mail-text-faint)' }}>Labels</span>
              <button onClick={createLabel} style={{ background: 'none', border: 'none', color: 'var(--mail-text-dim)', cursor: 'pointer', fontSize: '15px', lineHeight: 1 }}>+</button>
            </div>
            {labels.length === 0 && <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', padding: '0 8px' }}>None yet</p>}
            {labels.map((l) => (
              <button key={l.id} className={`mi-nav ${labelFilter === l.id ? 'is-active' : ''}`} onClick={() => { closeNav(); setView('mail'); setSelectedId(null); setLabelFilter(labelFilter === l.id ? '' : l.id) }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: l.color, flexShrink: 0 }} />
                {l.name}
              </button>
            ))}
          </div>

          <button className="mi-nav" style={{ marginTop: 'auto' }} onClick={() => { closeNav(); setSigOpen(true) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /><path d="M14.06 6.19l3.75 3.75" /></svg>
            Signature
          </button>
        </div>

        {view === 'contacts' && (
          <MailContacts
            mailboxId={mailboxId}
            onOpenThread={(tid, mid) => { setView('mail'); if (mid && mid !== mailboxId) setMailboxId(mid); setSelectedId(tid) }}
          />
        )}

        {view === 'mail' && (
        <>
        {/* thread list */}
        {(!isNarrow || !selectedId) && (
        <div style={{ borderRight: '1px solid var(--mail-border)', display: 'flex', flexDirection: 'column', background: 'var(--mail-bg)', minWidth: 0 }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--mail-border)', fontSize: '15px', color: 'var(--mail-text)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', letterSpacing: '-0.01em', textTransform: 'capitalize' }}>
            <span>{labelFilter ? (labels.find((l) => l.id === labelFilter)?.name || 'Label') : filter}</span>
            <span style={{ fontSize: '12px', color: 'var(--mail-text-faint)', fontWeight: 400 }}>{threads.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Empty>Loading…</Empty>
            ) : threads.length === 0 ? (
              <Empty>{query ? 'No matches.' : filter === 'archived' ? 'Nothing archived.' : filter === 'starred' ? 'Nothing starred.' : 'No mail yet.'}</Empty>
            ) : (
              threads.map((t) => {
                const sel = t.id === selectedId
                const unread = t.unreadCount > 0
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="mi-row"
                    data-sel={sel ? '1' : undefined}
                    style={{
                      display: 'grid', gridTemplateColumns: '14px 1fr', gap: '8px', padding: '10px 16px 11px', cursor: 'pointer',
                      borderBottom: '1px solid var(--mail-border)',
                    }}
                  >
                    <span style={{ paddingTop: '5px' }}>
                      {unread ? (
                        <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mail-gold)' }} />
                      ) : null}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13px', color: 'var(--mail-text)', fontWeight: unread ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.externalAddress}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {t.starred && <span style={{ color: 'var(--mail-gold)', fontSize: '11px' }}>★</span>}
                          <span style={{ fontSize: '11px', color: 'var(--mail-text-faint)' }}>{fmt(t.lastMessageAt)}</span>
                          <span
                            onClick={(e) => { e.stopPropagation(); quickStar(t.id, t.starred) }}
                            className="mi-row-star"
                            title={t.starred ? 'Unflag' : 'Flag'}
                            style={{ color: 'var(--mail-text-faint)', fontSize: '13px', cursor: 'pointer' }}
                          >
                            {t.starred ? '☆' : '★'}
                          </span>
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: unread ? 'var(--mail-text)' : 'var(--mail-text-dim)', fontWeight: unread ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{t.subject}</div>
                      <div style={{ fontSize: '12px', color: 'var(--mail-text-faint)', marginTop: '2px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.preview}</div>
                      {(t.labels || []).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {t.labels.map((l: any) => (
                            <span key={l.id} style={{ fontSize: '9px', color: '#fff', background: l.color, padding: '1px 7px', borderRadius: '7px', fontWeight: 600 }}>{l.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        )}

        {/* reader */}
        {(!isNarrow || selectedId) && (
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--mail-panel)', minWidth: 0, position: 'relative' }}>
          {selectedId && threadInfo && contactOpen && (
            <ContactPanel
              email={threadInfo.externalAddress}
              onClose={() => setContactOpen(false)}
              onOpenThread={(tid, mid) => { if (mid && mid !== mailboxId) setMailboxId(mid); setSelectedId(tid); setContactOpen(false) }}
            />
          )}
          {!selectedId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--mail-text-faint)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg>
              <p style={{ fontSize: '13px' }}>Select a conversation</p>
            </div>
          ) : threadLoading ? (
            <Empty>Loading…</Empty>
          ) : (
            <>
              {threadInfo && (
                <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--mail-border)', background: 'var(--mail-panel)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {isNarrow && (
                    <button className="mi-icon" onClick={() => setSelectedId(null)} aria-label="Back" style={{ flexShrink: 0, marginTop: '-2px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ fontSize: '17px', color: 'var(--mail-text)', margin: 0, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{threadInfo.subject}</h2>
                    <p style={{ fontSize: '12px', color: 'var(--mail-text-faint)', margin: '3px 0 0' }}>{threadInfo.externalAddress}</p>
                    {(threadInfo.labels || []).length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {threadInfo.labels.map((l: any) => (
                          <span key={l.id} style={{ fontSize: '10px', color: '#fff', background: l.color, padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>{l.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: isNarrow ? '116px' : undefined }}>
                    <TB title={threadInfo.starred ? 'Unflag' : 'Flag'} active={threadInfo.starred} onClick={() => threadAction(threadInfo.starred ? 'unstar' : 'star')} d="M4 21V4h11l-1 4h6v9H9l1-4H4" style={threadInfo.starred ? { color: 'var(--mail-gold)' } : undefined} />
                    <div style={{ position: 'relative' }}>
                      <TB title="Labels" active={labelMenuOpen} onClick={() => setLabelMenuOpen((v) => !v)} d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2a2 2 0 01-.6-1.4V4a2 2 0 012-2h7.6a2 2 0 011.4.6l6.4 6.4a2 2 0 010 2.8zM7 8h.01" />
                      {labelMenuOpen && (
                        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--mail-panel)', border: '1px solid var(--mail-border-strong)', borderRadius: '10px', padding: '8px', zIndex: 30, minWidth: '190px', boxShadow: 'var(--mail-shadow)' }}>
                          {labels.length === 0 && <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', margin: '0 0 6px' }}>No labels yet.</p>}
                          {labels.map((l) => {
                            const on = (threadInfo.labels || []).some((x: any) => x.id === l.id)
                            return (
                              <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 4px', cursor: 'pointer', fontSize: '12px', color: 'var(--mail-text)' }}>
                                <input type="checkbox" checked={on} onChange={() => threadAction(on ? 'remove_label' : 'add_label', { labelId: l.id })} />
                                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }} />
                                {l.name}
                              </label>
                            )
                          })}
                          <button className="mi-btn" style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }} onClick={createLabel}>+ New label</button>
                        </div>
                      )}
                    </div>
                    <TB title="Contact info" active={contactOpen} onClick={() => setContactOpen((v) => !v)} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                    <TB title="Mark unread" onClick={() => threadAction('mark_unread')} d="M4 4h16v16H4zM4 8l8 5 8-5" />
                    <TB title="Forward" onClick={openForward} d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                    <TB title={threadInfo.archived ? 'Unarchive' : 'Archive'} onClick={() => threadAction(threadInfo.archived ? 'unarchive' : 'archive')} d="M3 8h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1zM1 4h22v4H1zM9 12h6" />
                    <TB title="Delete" danger onClick={() => threadAction('delete')} d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </div>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
                {messages.map((m, mi) => {
                  const mine = m.direction === 'outbound'
                  const who = mine ? outboundLabel : m.from_address
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: '13px', padding: '16px 26px', borderTop: mi ? '1px solid var(--mail-border)' : 'none' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: mine ? 'var(--mail-gold)' : avatarColor(m.from_address || 'x'), color: mine ? '#241c04' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                        {(who || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '13.5px', color: 'var(--mail-text)', fontWeight: 600 }}>{who}</span>
                          <span style={{ fontSize: '11px', color: 'var(--mail-text-faint)', flexShrink: 0 }}>{fmt(m.created_at, true)}</span>
                        </div>
                        {m.cc_addresses?.length > 0 && (
                          <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', margin: '1px 0 0' }}>cc: {m.cc_addresses.join(', ')}</p>
                        )}
                        <div style={{ marginTop: '9px' }}>
                          <MailMessageBody bodyText={m.body_text} bodyHtml={m.body_html} accent="var(--mail-text)" />
                        </div>
                        {m.mailbox_attachments?.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {m.mailbox_attachments.map((a: any) => (
                              <button key={a.id} className="mi-btn" onClick={() => openAttachment(a.id)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
                                {a.filename || 'attachment'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              {/* reply */}
              <div style={{ borderTop: '1px solid var(--mail-border)', background: 'var(--mail-panel)', padding: '14px 22px' }}>
                {monitorNote && <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', margin: '0 0 8px' }}>{monitorNote}</p>}
                {error && <p style={{ color: 'var(--mail-danger)', fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
                {!replyOpen ? (
                  <button className="mi-btn" onClick={() => setReplyOpen(true)} style={{ padding: '9px 16px' }}>
                    Reply{threadInfo ? ` to ${threadInfo.externalAddress}` : ''}
                  </button>
                ) : (
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <MailAssist
                        mode="reply"
                        canShareTemplates={mailboxes.length > 1}
                        ctx={{
                          threadId: selectedId,
                          mailboxId,
                          recipientEmail: threadInfo?.externalAddress,
                          subject: threadInfo?.subject,
                          myName: activeMailbox?.displayName || activeMailbox?.address,
                          myEmail: activeMailbox?.address,
                        }}
                        getHtml={() => replyHtml}
                        onInsert={setReplyHtml}
                      />
                    </div>
                    <RichTextEditor value={replyHtml} onChange={setReplyHtml} placeholder="Write a reply…" minHeight={90} />
                    <div style={{ margin: '8px 0' }}>
                      <AttachmentPicker files={replyFiles} setFiles={setReplyFiles} mailboxId={mailboxId} compact />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--mail-text-dim)' }}>
                        <input type="checkbox" checked={replyAll} onChange={(e) => setReplyAll(e.target.checked)} /> Reply all
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="mi-btn" onClick={() => { setReplyOpen(false); setReplyHtml(''); setReplyFiles([]) }}>Cancel</button>
                        <button className="mi-primary" onClick={sendReply} disabled={sending || replyFiles.some((f: any) => f.uploading) || (!replyPlain && !replyFiles.some((f: any) => f.path && !f.failed))}>
                          {sending ? 'Sending…' : replyFiles.some((f: any) => f.uploading) ? 'Uploading…' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        )}
        </>
        )}
      </div>

      <MailComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        mailboxId={mailboxId}
        fromLabel={activeMailbox ? (activeMailbox.displayName || activeMailbox.address) : undefined}
        fromEmail={activeMailbox?.address}
        canShareTemplates={mailboxes.length > 1}
        initial={composeInitial}
        onSent={(threadId) => {
          setComposeOpen(false)
          setFilter('inbox'); setLabelFilter(''); setSearch(''); setQuery('')
          loadThreads()
          setSelectedId(threadId)
        }}
      />

      {sigOpen && activeMailbox && (
        <SignatureModal
          mailbox={activeMailbox}
          onClose={() => setSigOpen(false)}
          onSaved={(html: string) => {
            setMailboxes((prev) => prev.map((m) => (m.id === activeMailbox.id ? { ...m, signatureHtml: html } : m)))
            setSigOpen(false)
          }}
        />
      )}
    </div>
  )
}

function TB({ title, d, onClick, active, danger, disabled, style }: any) {
  return (
    <button
      className={`mi-icon ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={style}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  )
}

function Empty({ children }: any) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center', color: 'var(--mail-text-faint)', fontSize: '13px' }}>
      {children}
    </div>
  )
}
