'use client'

// Mirrors Google Meet's "New meeting" split button: one entry point with
// three creation options, instead of separate scattered nav items.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateMeetingCode } from '@/lib/utils/meetingCode'

function VideoIcon() {
  return <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>videocam</span>
}

export function NewMeetingMenu({
  scheduleHref = '/admin/meetings?new=1',
  navLinkClass = 'admin-nav-link',
}: {
  scheduleHref?: string
  navLinkClass?: string
}) {
  const [open, setOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setLinkCopied(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function startInstant() {
    setOpen(false)
    router.push(`/meet/${generateMeetingCode()}`)
  }

  function createForLater() {
    const url = `${window.location.origin}/meet/${generateMeetingCode()}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => {
        setLinkCopied(false)
        setOpen(false)
      }, 1800)
    }).catch(() => {})
  }

  function scheduleInCalendar() {
    setOpen(false)
    router.push(scheduleHref)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={navLinkClass}
        style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        <VideoIcon />
        New Meeting
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '8px',
          right: '8px',
          zIndex: 40,
          marginTop: '4px',
          background: '#161616',
          border: '1px solid rgba(230,195,100,0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={startInstant}
            className={navLinkClass}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_circle</span>
            Start an instant meeting
          </button>
          <button
            onClick={createForLater}
            className={navLinkClass}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link</span>
            {linkCopied ? 'Link copied!' : 'Create a meeting for later'}
          </button>
          <button
            onClick={scheduleInCalendar}
            className={navLinkClass}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_month</span>
            Schedule a meeting
          </button>
        </div>
      )}
    </div>
  )
}
