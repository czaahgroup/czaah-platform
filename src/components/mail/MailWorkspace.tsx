'use client'
// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import MailComposeModal from './MailComposeModal'
import MailMessageBody, { stripQuotedText } from './MailMessageBody'
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
  exitHref,
  exitLabel,
  onSignOut,
}: {
  heading: string
  outboundLabel: string
  monitorNote?: string
  /** Phone layout is full-screen, so the drawer offers the way back out. */
  exitHref?: string
  exitLabel?: string
  onSignOut?: () => void
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

  const scrollerRef = useRef<HTMLDivElement>(null)
  const lastMsgRef = useRef<HTMLDivElement>(null)
  // Older messages in a thread start collapsed to a one-line summary (like
  // Gmail) so every message in the conversation is visible at a glance.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

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

  // Phone: opening a conversation adds a history entry, so the device back
  // button (or swipe-back) returns to the inbox instead of leaving the page.
  const pushedThreadRef = useRef(false)
  const openThread = (id: string) => {
    if (isNarrow && !pushedThreadRef.current) {
      const url = new URL(window.location.href)
      url.searchParams.set('thread', id)
      window.history.pushState(null, '', url)
      pushedThreadRef.current = true
    }
    setSelectedId(id)
  }
  const closeThread = () => setSelectedId(null)
  // However the conversation was closed (back arrow, archive, delete, nav),
  // drop the history entry we added so the back stack stays clean.
  useEffect(() => {
    if (!selectedId && pushedThreadRef.current) {
      pushedThreadRef.current = false
      window.history.back()
    }
  }, [selectedId])
  useEffect(() => {
    const onPop = () => {
      if (new URL(window.location.href).searchParams.has('thread')) return
      pushedThreadRef.current = false
      setSelectedId(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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

  // ---- new mail --------------------------------------------------------
  // Webmail sessions get no realtime push, and phones sleep sockets, so poll
  // while the page is visible and refresh as soon as it comes back to front.
  const [refreshing, setRefreshing] = useState(false)
  const refreshNow = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadThreads()
      if (selectedId && !threadLoading) {
        const j = await fetch(`/api/mail/threads/${selectedId}`).then((r) => r.json()).catch(() => null)
        if (j?.messages) {
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id))
            const fresh = j.messages.filter((m: any) => !known.has(m.id))
            return fresh.length ? [...prev, ...fresh] : prev
          })
        }
      }
    } finally {
      setRefreshing(false)
    }
  }, [loadThreads, selectedId, threadLoading])

  useEffect(() => {
    if (!mailboxId) return
    const tick = () => { if (document.visibilityState === 'visible') refreshNow() }
    const iv = setInterval(tick, 30000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [mailboxId, refreshNow])

  // Unread count on the installed app icon + tab title.
  const unreadTotal = useMemo(() => (filter === 'inbox' && !labelFilter && !query ? threads.filter((t) => t.unreadCount > 0).length : null), [threads, filter, labelFilter, query])
  useEffect(() => {
    if (unreadTotal === null) return
    try {
      const nav: any = navigator
      if (unreadTotal > 0) nav.setAppBadge?.(unreadTotal)?.catch?.(() => {})
      else nav.clearAppBadge?.()?.catch?.(() => {})
    } catch { /* unsupported */ }
    const base = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ${base}` : base
  }, [unreadTotal])

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
        const msgs = j.messages || []
        // Keep the newest message and anything unread open; collapse the rest.
        setCollapsedIds(new Set(
          msgs.slice(0, -1).filter((m: any) => !(m.direction === 'inbound' && !m.is_read)).map((m: any) => m.id)
        ))
        setMessages(msgs)
        setThreadInfo(j.thread || null)
        loadThreads()
      })
      .finally(() => { if (!cancelled) setThreadLoading(false) })
    return () => { cancelled = true }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bring the newest message's top into view WITHOUT scrolling outer ancestors
  // (scrollIntoView would push the app chrome off-screen). Re-run shortly after,
  // once message iframes have measured their height.
  useEffect(() => {
    const jump = () => {
      const scroller = scrollerRef.current
      const last = lastMsgRef.current
      if (scroller && last) scroller.scrollTop = Math.max(0, last.offsetTop - 8)
    }
    jump()
    const t = setTimeout(jump, 350)
    return () => clearTimeout(t)
  }, [messages.length, selectedId, threadLoading])

  const toggleCollapsed = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
  const canSendReply = !sending && !replyFiles.some((f: any) => f.uploading) && (!!replyPlain || replyFiles.some((f: any) => f.path && !f.failed))
  const cancelReply = () => { setReplyOpen(false); setReplyHtml(''); setReplyFiles([]) }

  return (
    <div className="czaah-mail mi-app" style={{ height: 'calc(100dvh - 92px)', display: 'flex', flexDirection: 'column', background: 'var(--mail-panel)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--mail-border)', boxShadow: 'var(--mail-shadow)' }}>
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
        <div className="mi-desktop-only" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          {/* phone: brand + mailbox picker live in the drawer */}
          <div className="mi-mobile-only" style={{ flexDirection: 'column', gap: '10px', padding: '0 4px 14px', marginBottom: '10px', borderBottom: '1px solid var(--mail-border)' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '15px', letterSpacing: '0.18em', color: 'var(--mail-text)' }}>
              CZAAH <span style={{ color: 'var(--mail-gold)' }}>MAIL</span>
            </div>
            {mailboxes.length > 1 ? (
              <select
                value={mailboxId}
                onChange={(e) => { setMailboxId(e.target.value); closeNav() }}
                aria-label="Mailbox"
                style={{ width: '100%', background: 'var(--mail-panel)', border: '1px solid var(--mail-border-strong)', color: 'var(--mail-text)', padding: '10px', borderRadius: '10px', fontFamily: 'inherit' }}
              >
                {mailboxes.map((m) => <option key={m.id} value={m.id}>{(m.displayName || m.address)} — {m.address}</option>)}
              </select>
            ) : activeMailbox ? (
              <span style={{ fontSize: '13px', color: 'var(--mail-text-dim)', wordBreak: 'break-all' }}>{activeMailbox.address}</span>
            ) : null}
          </div>

          <button
            onClick={() => { closeNav(); setComposeInitial(null); setComposeOpen(true) }}
            disabled={!mailboxId}
            className="mi-primary mi-desktop-only"
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
          {exitHref && (
            <a href={exitHref} className="mi-nav mi-mobile-only" style={{ textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              {exitLabel || 'Back'}
            </a>
          )}
          {onSignOut && (
            <button className="mi-nav mi-mobile-only" onClick={() => { closeNav(); onSignOut() }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              Sign out
            </button>
          )}
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
        <div style={{ borderRight: '1px solid var(--mail-border)', display: 'flex', flexDirection: 'column', background: 'var(--mail-bg)', minWidth: 0, minHeight: 0, position: 'relative' }}>
          <div style={{ padding: isNarrow ? '12px 12px 10px 18px' : '13px 18px 11px', borderBottom: '1px solid var(--mail-border)', fontSize: isNarrow ? '20px' : '15px', color: 'var(--mail-text)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
            <span style={{ textTransform: 'capitalize' }}>{labelFilter ? (labels.find((l) => l.id === labelFilter)?.name || 'Label') : filter}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--mail-text-faint)', fontWeight: 400 }}>
              {unreadTotal ? <span style={{ color: 'var(--mail-accent)', fontWeight: 600 }}>{unreadTotal} unread</span> : <span>{threads.length}</span>}
              <button className="mi-icon" onClick={refreshNow} title="Check for new mail" aria-label="Check for new mail" disabled={refreshing}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: refreshing ? 'mi-spin .8s linear infinite' : undefined }}>
                  <path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" />
                </svg>
              </button>
            </span>
          </div>
          <style>{'@keyframes mi-spin { to { transform: rotate(360deg) } }'}</style>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isNarrow ? '96px' : undefined }}>
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
                    onClick={() => openThread(t.id)}
                    className="mi-row"
                    data-sel={sel ? '1' : undefined}
                    style={{
                      display: 'grid', gridTemplateColumns: '14px 1fr', gap: '8px', padding: isNarrow ? '14px 16px 14px 12px' : '10px 16px 11px', cursor: 'pointer',
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
                        <span style={{ fontSize: isNarrow ? '15px' : '13px', color: 'var(--mail-text)', fontWeight: unread ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.lastFrom && t.lastFrom !== t.externalAddress ? t.lastFrom : t.externalAddress}
                          {t.messageCount > 1 && <span style={{ fontWeight: 500, color: 'var(--mail-text-faint)', marginLeft: '5px' }}>{t.messageCount}</span>}
                        </span>
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
                      <div style={{ fontSize: isNarrow ? '14.5px' : '12.5px', color: unread ? 'var(--mail-text)' : 'var(--mail-text-dim)', fontWeight: unread ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{t.subject}</div>
                      <div style={{ fontSize: isNarrow ? '13.5px' : '12px', color: 'var(--mail-text-faint)', marginTop: '2px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.preview}</div>
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
          <button className="mi-fab" onClick={() => { setComposeInitial(null); setComposeOpen(true) }} disabled={!mailboxId}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
            Compose
          </button>
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
            <>
              {isNarrow && (
                <div style={{ padding: '8px 6px', borderBottom: '1px solid var(--mail-border)' }}>
                  <button className="mi-icon" onClick={closeThread} aria-label="Back to inbox">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                </div>
              )}
              <Empty>Loading…</Empty>
            </>
          ) : (
            <>
              {threadInfo && (
                <div style={{ padding: isNarrow ? '8px 12px 6px 6px' : '14px 24px', borderBottom: '1px solid var(--mail-border)', background: 'var(--mail-panel)', display: 'flex', flexWrap: isNarrow ? 'wrap' : undefined, alignItems: 'flex-start', gap: isNarrow ? '4px' : '10px' }}>
                  {isNarrow && (
                    <button className="mi-icon" onClick={closeThread} aria-label="Back to inbox" style={{ flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                  )}
                  <div style={{ minWidth: 0, flex: 1, paddingTop: isNarrow ? '8px' : undefined }}>
                    <h2 style={isNarrow
                      ? { fontSize: '18px', color: 'var(--mail-text)', margin: 0, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
                      : { fontSize: '17px', color: 'var(--mail-text)', margin: 0, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{threadInfo.subject}</h2>
                    <p style={{ fontSize: '12px', color: 'var(--mail-text-faint)', margin: '3px 0 0' }}>{threadInfo.externalAddress}</p>
                    {(threadInfo.labels || []).length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {threadInfo.labels.map((l: any) => (
                          <span key={l.id} style={{ fontSize: '10px', color: '#fff', background: l.color, padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>{l.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={isNarrow
                    ? { display: 'flex', width: '100%', justifyContent: 'space-between', margin: '6px -6px -6px', paddingTop: '6px', borderTop: '1px solid var(--mail-border)' }
                    : { display: 'flex', gap: '2px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <TB title={threadInfo.starred ? 'Unflag' : 'Flag'} active={threadInfo.starred} onClick={() => threadAction(threadInfo.starred ? 'unstar' : 'star')} d="M4 21V4h11l-1 4h6v9H9l1-4H4" style={threadInfo.starred ? { color: 'var(--mail-gold)' } : undefined} />
                    <div style={{ position: 'relative' }}>
                      <TB title="Labels" active={labelMenuOpen} onClick={() => setLabelMenuOpen((v) => !v)} d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2a2 2 0 01-.6-1.4V4a2 2 0 012-2h7.6a2 2 0 011.4.6l6.4 6.4a2 2 0 010 2.8zM7 8h.01" />
                      {labelMenuOpen && (
                        <div style={{ position: 'absolute', ...(isNarrow ? { left: 0 } : { right: 0 }), top: 'calc(100% + 4px)', background: 'var(--mail-panel)', border: '1px solid var(--mail-border-strong)', borderRadius: '10px', padding: '8px', zIndex: 30, minWidth: '190px', boxShadow: 'var(--mail-shadow)' }}>
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

              <div ref={scrollerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {messages.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isNarrow ? '4px 14px 8px' : '4px 26px 8px', fontSize: isNarrow ? '12px' : '11px', color: 'var(--mail-text-faint)' }}>
                    <span>{messages.length} messages in this conversation</span>
                    <button
                      className="mi-btn"
                      style={{ padding: '3px 10px', fontSize: '11px' }}
                      onClick={() => setCollapsedIds(collapsedIds.size ? new Set() : new Set(messages.slice(0, -1).map((m) => m.id)))}
                    >
                      {collapsedIds.size ? 'Expand all' : 'Collapse all'}
                    </button>
                  </div>
                )}
                {messages.map((m, mi) => {
                  const mine = m.direction === 'outbound'
                  const who = mine ? outboundLabel : m.from_address
                  const isLast = mi === messages.length - 1
                  const collapsed = collapsedIds.has(m.id)
                  const avatar = (
                    <span style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: mine ? 'var(--mail-gold)' : avatarColor(m.from_address || 'x'), color: mine ? '#241c04' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                      {(who || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  )
                  if (collapsed) {
                    const snippet = stripQuotedText(m.body_text).replace(/\s+/g, ' ').trim()
                    return (
                      <div
                        key={m.id}
                        ref={isLast ? lastMsgRef : undefined}
                        className="mi-row"
                        onClick={() => toggleCollapsed(m.id)}
                        title="Show message"
                        style={{ display: 'flex', gap: isNarrow ? '10px' : '13px', alignItems: 'center', padding: isNarrow ? '12px 14px' : '10px 26px', borderTop: mi ? '1px solid var(--mail-border)' : 'none', cursor: 'pointer' }}
                      >
                        {avatar}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '13px', color: 'var(--mail-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</span>
                            <span style={{ fontSize: '11px', color: 'var(--mail-text-faint)', flexShrink: 0 }}>
                              {m.mailbox_attachments?.length > 0 ? '📎 ' : ''}{fmt(m.created_at, true)}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--mail-text-faint)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {snippet || '(no text)'}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={m.id} ref={isLast ? lastMsgRef : undefined} style={{ display: 'flex', gap: isNarrow ? '10px' : '13px', padding: isNarrow ? '14px 12px 14px 14px' : '16px 26px', borderTop: mi ? '1px solid var(--mail-border)' : 'none' }}>
                      {avatar}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          onClick={messages.length > 1 ? () => toggleCollapsed(m.id) : undefined}
                          title={messages.length > 1 ? 'Collapse message' : undefined}
                          style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline', cursor: messages.length > 1 ? 'pointer' : undefined }}
                        >
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
              </div>

              {/* reply */}
              <div
                className={`mi-bottombar ${replyOpen ? 'mi-sheet' : ''}`}
                style={{ borderTop: '1px solid var(--mail-border)', background: 'var(--mail-panel)', padding: replyOpen && isNarrow ? 0 : isNarrow ? '10px 14px' : '14px 22px' }}
              >
                {replyOpen && (
                  <div className="mi-mobile-only" style={{ alignItems: 'center', gap: '6px', padding: '8px 12px 8px 6px', borderBottom: '1px solid var(--mail-border)' }}>
                    <button className="mi-icon" onClick={cancelReply} aria-label="Discard reply">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--mail-text)' }}>Reply</div>
                      <div style={{ fontSize: '12px', color: 'var(--mail-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>to {threadInfo?.externalAddress}</div>
                    </div>
                    <button className="mi-primary" onClick={sendReply} disabled={!canSendReply}>
                      {sending ? 'Sending…' : replyFiles.some((f: any) => f.uploading) ? 'Uploading…' : 'Send'}
                    </button>
                  </div>
                )}
                <div className={replyOpen ? 'mi-sheet-body' : undefined}>
                {monitorNote && <p style={{ fontSize: '11px', color: 'var(--mail-text-faint)', margin: '0 0 8px' }}>{monitorNote}</p>}
                {error && <p style={{ color: 'var(--mail-danger)', fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}
                {!replyOpen ? (
                  isNarrow ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="mi-primary" onClick={() => setReplyOpen(true)} style={{ flex: 1 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v2" /></svg>
                        Reply
                      </button>
                      <button className="mi-btn" onClick={openForward} style={{ flex: 1, justifyContent: 'center' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17l5-5-5-5M20 12H9a5 5 0 00-5 5v2" /></svg>
                        Forward
                      </button>
                    </div>
                  ) : (
                    <button className="mi-btn" onClick={() => setReplyOpen(true)} style={{ padding: '9px 16px' }}>
                      Reply{threadInfo ? ` to ${threadInfo.externalAddress}` : ''}
                    </button>
                  )
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
                    <RichTextEditor value={replyHtml} onChange={setReplyHtml} placeholder="Write a reply…" minHeight={isNarrow ? 220 : 90} />
                    <div style={{ margin: '8px 0' }}>
                      <AttachmentPicker files={replyFiles} setFiles={setReplyFiles} mailboxId={mailboxId} compact />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: isNarrow ? '14px' : '11px', color: 'var(--mail-text-dim)' }}>
                        <input type="checkbox" checked={replyAll} onChange={(e) => setReplyAll(e.target.checked)} /> Reply all
                      </label>
                      <div className="mi-desktop-only" style={{ display: 'flex', gap: '8px' }}>
                        <button className="mi-btn" onClick={cancelReply}>Cancel</button>
                        <button className="mi-primary" onClick={sendReply} disabled={!canSendReply}>
                          {sending ? 'Sending…' : replyFiles.some((f: any) => f.uploading) ? 'Uploading…' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
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
