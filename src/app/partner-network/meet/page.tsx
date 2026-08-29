'use client'
// @ts-nocheck

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateMeetingCode } from '@/lib/utils/meetingCode'

interface Participant {
  id: string
  user_id: string
  response: string
  profile: { id: string; full_name: string; email: string } | null
}
interface Meeting {
  id: string
  title: string
  organizer_id: string
  scheduled_at: string
  duration_minutes: number
  meeting_type: string
  notes: string | null
  status: string
  organizer: { id: string; full_name: string; email: string } | null
  meeting_participants: Participant[]
}
interface MemberOption { id: string; full_name: string; email: string }

const MEETING_TYPE_LABELS: Record<string, string> = { voice_call: 'Voice Call', video_call: 'Video Call', in_person: 'In Person' }
const DURATION_OPTIONS = [{ value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 45, label: '45 min' }, { value: 60, label: '1 hour' }]

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Accepts a raw code ("abc-defg-hij"), a full /meet/<code> URL, or a bare id. */
function extractRoomCode(input: string): string {
  const s = input.trim()
  if (!s) return ''
  const urlMatch = s.match(/\/meet\/([^/?#\s]+)/i)
  if (urlMatch) return urlMatch[1]
  return s.replace(/\s+/g, '')
}

export default function PartnerMeetPage() {
  const supabase = createClient()
  const router = useRouter()

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [duration, setDuration] = useState(30)
  const [meetingType, setMeetingType] = useState('video_call')
  const [notes, setNotes] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  const loadMeetings = useCallback(async () => {
    const res = await fetch('/api/meetings')
    const result = await res.json()
    if (res.ok && result.data) setMeetings(result.data)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
      const membersRes = await fetch('/api/meetings/members')
      const membersResult = await membersRes.json()
      if (membersRes.ok && membersResult.data) setMembers(membersResult.data)
      await loadMeetings()
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const now = new Date()
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= now && m.status !== 'cancelled')
  const past = meetings.filter((m) => new Date(m.scheduled_at) < now || m.status === 'cancelled')

  function startInstant() {
    setMenuOpen(false)
    router.push(`/meet/${generateMeetingCode()}`)
  }
  function createForLater() {
    const url = `${window.location.origin}/meet/${generateMeetingCode()}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => { setLinkCopied(false); setMenuOpen(false) }, 2200)
    }).catch(() => setMenuOpen(false))
  }
  function openSchedule() {
    setMenuOpen(false)
    if (!scheduledDate) setScheduledDate(todayDateStr())
    if (!scheduledTime) setScheduledTime(nowTimeStr())
    setShowModal(true)
  }
  function joinByCode() {
    const code = extractRoomCode(joinCode)
    if (code) router.push(`/meet/${code}`)
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, scheduledAt, durationMinutes: duration, meetingType, notes: notes || null, participantIds: selectedParticipants }),
    })
    const result = await res.json()
    if (!res.ok) { setError(result.error || 'Failed to create meeting'); setSubmitting(false); return }
    setTitle(''); setScheduledDate(''); setScheduledTime(''); setDuration(30); setMeetingType('video_call'); setNotes(''); setSelectedParticipants([])
    setShowModal(false); setSubmitting(false)
    await loadMeetings()
  }
  async function handleRespond(id: string, response: string) {
    await fetch(`/api/meetings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response }) })
    await loadMeetings()
  }
  async function handleCancel(id: string) {
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
    await loadMeetings()
  }
  function toggleParticipant(id: string) {
    setSelectedParticipants((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])
  }

  const inputCls = 'w-full bg-transparent border-b border-outline-variant focus:border-primary px-1 py-2.5 text-on-surface raleway-text text-sm outline-none transition-colors'

  return (
    <>
      {/* ---------- Google-Meet-style hero ---------- */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center mb-14 pt-2">
        <div className="max-w-lg">
          <h1 className="cinzel-text text-[28px] leading-tight text-on-surface m-0">
            Video meetings for the CZAAH network
          </h1>
          <p className="raleway-text text-sm text-on-surface-variant/60 mt-3 mb-8 leading-relaxed">
            Start an instant room, send a link for later, or schedule ahead — secure video calls
            right in your browser, no downloads.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* New meeting split button */}
            <div ref={menuRef} className="relative w-full sm:w-auto">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="liquid-gold-bg text-on-primary raleway-text font-semibold text-sm px-5 py-3 border-none cursor-pointer inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-lg">videocam</span>
                New meeting
                <span className="material-symbols-outlined text-base opacity-80">expand_more</span>
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full mt-2 z-40 min-w-[264px] bg-surface-container-lowest border border-outline-variant/20 shadow-2xl">
                  <button onClick={createForLater} className="w-full text-left raleway-text text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-4 py-3 flex items-center gap-3 cursor-pointer">
                    <span className="material-symbols-outlined text-lg text-primary">link</span>
                    {linkCopied ? 'Link copied to clipboard' : 'Create a meeting for later'}
                  </button>
                  <button onClick={startInstant} className="w-full text-left raleway-text text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-4 py-3 flex items-center gap-3 cursor-pointer">
                    <span className="material-symbols-outlined text-lg text-primary">add</span>
                    Start an instant meeting
                  </button>
                  <button onClick={openSchedule} className="w-full text-left raleway-text text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-4 py-3 flex items-center gap-3 cursor-pointer">
                    <span className="material-symbols-outlined text-lg text-primary">calendar_month</span>
                    Schedule a meeting
                  </button>
                </div>
              )}
            </div>

            {/* Join by code */}
            <div className="flex items-center gap-2 border border-outline-variant/25 px-3 py-2 w-full sm:w-auto">
              <span className="material-symbols-outlined text-lg text-on-surface-variant/50">keyboard</span>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') joinByCode() }}
                placeholder="Enter a code or link"
                className="bg-transparent outline-none raleway-text text-sm text-on-surface placeholder:text-on-surface-variant/40 flex-1 sm:w-[190px] sm:flex-none min-w-0"
              />
              <button
                onClick={joinByCode}
                disabled={!joinCode.trim()}
                className="raleway-text text-sm font-semibold text-primary disabled:text-on-surface-variant/30 cursor-pointer disabled:cursor-default px-1"
              >
                Join
              </button>
            </div>
          </div>

          <p className="raleway-text text-xs text-on-surface-variant/40 mt-4">
            Anyone with the link can join. Guests without a CZAAH account knock to be let in.
          </p>
        </div>

        {/* Illustration */}
        <div className="hidden lg:flex justify-center">
          <MeetIllustration />
        </div>
      </div>

      <div className="h-px bg-outline-variant/10 mb-10" />

      {/* ---------- scheduled meetings ---------- */}
      {loading ? (
        <div className="flex items-center justify-center py-10"><span className="raleway-text text-sm text-on-surface-variant/40">Loading meetings…</span></div>
      ) : (
        <>
          <div className="mb-10">
            <h2 className="cinzel-text text-base text-primary mb-4 tracking-wide">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant/10 p-10 text-center">
                <p className="raleway-text text-sm text-on-surface-variant/40 m-0">No upcoming meetings scheduled.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} currentUserId={currentUserId} onRespond={handleRespond} onCancel={handleCancel} />)}
              </div>
            )}
          </div>

          <div>
            <button onClick={() => setShowPast(!showPast)} className="bg-transparent border-none cursor-pointer cinzel-text text-base text-on-surface-variant/40 flex items-center gap-2 p-0 tracking-wide mb-4">
              Past Meetings ({past.length})
              <span className="text-xs transition-transform" style={{ transform: showPast ? 'rotate(180deg)' : 'rotate(0deg)' }}>&#9660;</span>
            </button>
            {showPast && past.length > 0 && (
              <div className="flex flex-col gap-3 mt-3">
                {past.map((m) => <MeetingCard key={m.id} meeting={m} currentUserId={currentUserId} onRespond={handleRespond} onCancel={handleCancel} isPast />)}
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-5">
          <div className="bg-surface-container-lowest border border-outline-variant/10 w-full max-w-[520px] max-h-[90vh] overflow-auto">
            <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="cinzel-text text-lg text-on-surface m-0">Schedule Meeting</h3>
              <button onClick={() => setShowModal(false)} className="bg-transparent border-none text-on-surface-variant/40 cursor-pointer text-xl">x</button>
            </div>
            <form onSubmit={handleCreateMeeting} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Meeting title" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Date</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className={inputCls} style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Time</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required className={inputCls} style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div>
                <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Duration</label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setDuration(opt.value)} className={`flex-1 py-2 px-1 raleway-text text-sm cursor-pointer transition-all ${duration === opt.value ? 'border border-primary bg-primary/10 text-primary' : 'border border-outline-variant/10 bg-transparent text-on-surface-variant/50'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Meeting Type</label>
                <div className="flex gap-2">
                  {Object.entries(MEETING_TYPE_LABELS).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setMeetingType(key)} className={`flex-1 py-2 px-1 raleway-text text-xs cursor-pointer transition-all ${meetingType === key ? 'border border-primary bg-primary/10 text-primary' : 'border border-outline-variant/10 bg-transparent text-on-surface-variant/50'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add notes or agenda..." className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block raleway-text text-xs tracking-wide text-on-surface-variant/40 uppercase mb-1.5">Participants</label>
                <div className="max-h-40 overflow-auto border border-outline-variant/10 bg-surface-container-lowest">
                  {members.length === 0 ? (
                    <div className="p-3 text-on-surface-variant/30 text-sm raleway-text">No members found.</div>
                  ) : members.map((member) => (
                    <label key={member.id} className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer border-b border-outline-variant/5 transition-colors ${selectedParticipants.includes(member.id) ? 'bg-primary/5' : ''}`}>
                      <input type="checkbox" checked={selectedParticipants.includes(member.id)} onChange={() => toggleParticipant(member.id)} style={{ accentColor: '#e6c364' }} />
                      <div>
                        <div className="raleway-text text-sm text-on-surface">{member.full_name}</div>
                        <div className="raleway-text text-[11px] text-on-surface-variant/30">{member.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedParticipants.length > 0 && (
                  <p className="raleway-text text-[11px] text-primary/60 mt-1.5">{selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>
              {error && <p className="text-error raleway-text text-xs m-0">{error}</p>}
              <div className="flex gap-3 mt-2">
                <button type="submit" disabled={submitting} className="flex-1 liquid-gold-bg text-on-primary raleway-text font-semibold text-sm py-3 border-none cursor-pointer disabled:opacity-50">{submitting ? 'Creating...' : 'Schedule Meeting'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="py-3 px-5 border border-outline-variant/10 bg-transparent text-on-surface-variant/50 raleway-text text-sm cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function MeetIllustration() {
  return (
    <svg width="380" height="300" viewBox="0 0 380 300" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a video call">
      <defs>
        <linearGradient id="mi-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6f2e" />
          <stop offset="0.5" stopColor="#e8c97a" />
          <stop offset="1" stopColor="#8a6f2e" />
        </linearGradient>
      </defs>
      {/* main tile */}
      <rect x="40" y="50" width="220" height="150" rx="10" fill="#1b1b1b" stroke="#2e2e2e" />
      <circle cx="150" cy="115" r="30" fill="rgba(201,168,76,0.16)" />
      <text x="150" y="126" textAnchor="middle" fontFamily="'Cinzel', serif" fontSize="26" fill="#C9A84C">C</text>
      <rect x="52" y="176" width="70" height="10" rx="5" fill="rgba(255,255,255,0.14)" />
      {/* side tiles */}
      <rect x="276" y="50" width="64" height="44" rx="8" fill="#1b1b1b" stroke="#2e2e2e" />
      <circle cx="308" cy="70" r="12" fill="rgba(201,168,76,0.16)" />
      <rect x="276" y="103" width="64" height="44" rx="8" fill="#1b1b1b" stroke="#2e2e2e" />
      <circle cx="308" cy="123" r="12" fill="rgba(255,255,255,0.12)" />
      <rect x="276" y="156" width="64" height="44" rx="8" fill="#1b1b1b" stroke="#2e2e2e" />
      <circle cx="308" cy="176" r="12" fill="rgba(201,168,76,0.16)" />
      {/* control bar */}
      <rect x="90" y="228" width="200" height="44" rx="22" fill="#161616" stroke="#2b2b2b" />
      <circle cx="128" cy="250" r="13" fill="rgba(255,255,255,0.08)" />
      <circle cx="172" cy="250" r="13" fill="rgba(255,255,255,0.08)" />
      <circle cx="216" cy="250" r="13" fill="url(#mi-gold)" />
      <circle cx="252" cy="250" r="13" fill="#ef4444" />
    </svg>
  )
}

function MeetingCard({
  meeting,
  currentUserId,
  onRespond,
  onCancel,
  isPast,
}: {
  meeting: Meeting
  currentUserId: string | null
  onRespond: (id: string, response: string) => void
  onCancel: (id: string) => void
  isPast?: boolean
}) {
  const isOrganizer = meeting.organizer_id === currentUserId
  const myParticipation = meeting.meeting_participants?.find((p) => p.user_id === currentUserId)
  const isPending = myParticipation?.response === 'pending'

  return (
    <div className={`bg-surface-container-lowest border border-outline-variant/10 p-5 transition-colors ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="raleway-text text-base text-on-surface m-0 mb-1 font-semibold">{meeting.title}</h3>
          <p className="raleway-text text-sm text-on-surface-variant/50 m-0">{formatDateTime(meeting.scheduled_at)} -- {meeting.duration_minutes} min</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`raleway-text text-[11px] tracking-wide px-2.5 py-1 uppercase ${meeting.status === 'cancelled' ? 'bg-error/10 text-error border border-error/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>{MEETING_TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type}</span>
          {meeting.status === 'cancelled' && <span className="raleway-text text-[11px] px-2.5 py-1 bg-error/10 text-error border border-error/20 uppercase">Cancelled</span>}
        </div>
      </div>
      {meeting.notes && <p className="raleway-text text-sm text-on-surface-variant/35 m-0 mb-3 leading-relaxed">{meeting.notes}</p>}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="raleway-text text-xs text-on-surface-variant/30">Organizer:</span>
        <span className="raleway-text text-xs text-primary">{meeting.organizer?.full_name || 'Unknown'}</span>
        {meeting.meeting_participants?.length > 0 && (
          <>
            <span className="raleway-text text-xs text-on-surface-variant/20 mx-1">|</span>
            <div className="flex gap-1.5 flex-wrap">
              {meeting.meeting_participants.map((p) => (
                <span key={p.id} className={`inline-flex items-center gap-1 raleway-text text-xs px-2 py-0.5 border ${p.response === 'accepted' ? 'bg-green-500/10 text-green-400 border-green-500/15' : p.response === 'declined' ? 'bg-error/10 text-error border-error/15' : 'bg-surface-container text-on-surface-variant/50 border-outline-variant/10'}`}>
                  <span className={`w-1.5 h-1.5 ${p.response === 'accepted' ? 'bg-green-400' : p.response === 'declined' ? 'bg-error' : 'bg-on-surface-variant/30'}`} style={{ clipPath: 'circle(50%)' }} />
                  {p.profile?.full_name || 'Unknown'}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      {!isPast && meeting.status !== 'cancelled' && (
        <div className="flex gap-2 flex-wrap">
          {isPending && (
            <>
              <button onClick={() => onRespond(meeting.id, 'accepted')} className="raleway-text text-xs font-semibold px-4 py-1.5 border border-green-500/30 bg-green-500/10 text-green-400 cursor-pointer transition-all hover:bg-green-500/15">Accept</button>
              <button onClick={() => onRespond(meeting.id, 'declined')} className="raleway-text text-xs font-semibold px-4 py-1.5 border border-error/30 bg-error/10 text-error cursor-pointer transition-all hover:bg-error/15">Decline</button>
            </>
          )}
          {meeting.meeting_type === 'video_call' && !isPending && myParticipation?.response !== 'declined' && (
            <a href={`/meet/${meeting.id}`} target="_blank" rel="noopener noreferrer" className="raleway-text text-xs font-semibold px-4 py-1.5 border border-primary/30 bg-primary/10 text-primary cursor-pointer transition-all hover:bg-primary/15 no-underline inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
              Join Meeting
            </a>
          )}
          {isOrganizer && <button onClick={() => onCancel(meeting.id)} className="raleway-text text-xs px-4 py-1.5 border border-outline-variant/10 bg-transparent text-on-surface-variant/40 cursor-pointer transition-colors hover:text-on-surface-variant">Cancel Meeting</button>}
        </div>
      )}
    </div>
  )
}
