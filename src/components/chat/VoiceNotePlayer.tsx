'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface VoiceNotePlayerProps {
  fileUrl: string
  fileName: string
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceNotePlayer({ fileUrl, fileName }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)

  // Fetch signed URL on mount
  useEffect(() => {
    let cancelled = false
    async function fetchUrl() {
      try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(fileUrl)}`)
        if (!res.ok) return
        const { url } = await res.json()
        if (!cancelled) setAudioUrl(url)
      } catch {
        // silent
      }
    }
    fetchUrl()
    return () => { cancelled = true }
  }, [fileUrl])

  // Create audio element when URL is ready
  useEffect(() => {
    if (!audioUrl) return

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [audioUrl])

  // Animation frame for progress updates
  const updateProgress = useCallback(() => {
    const audio = audioRef.current
    if (audio && isPlaying) {
      setCurrentTime(audio.currentTime)
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, updateProgress])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      setLoading(true)
      try {
        await audio.play()
        setIsPlaying(true)
      } catch {
        // browser may block autoplay
      } finally {
        setLoading(false)
      }
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const bar = progressRef.current
    if (!audio || !bar || !duration) return

    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(audio.currentTime)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#0a0a0a',
        borderRadius: '8px',
        padding: '8px 12px',
        width: '220px',
        minWidth: '200px',
      }}
    >
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={!audioUrl || loading}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#C9A84C',
          border: 'none',
          cursor: audioUrl ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: audioUrl ? 1 : 0.4,
          transition: 'opacity 0.2s ease',
        }}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {loading ? (
          <div
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid rgba(0,0,0,0.2)',
              borderTop: '2px solid #000',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        ) : isPlaying ? (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
            <rect x="1" y="1" width="3.5" height="12" rx="1" fill="#000" />
            <rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="#000" />
          </svg>
        ) : (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
            <path d="M1 1.5V12.5L11 7L1 1.5Z" fill="#000" />
          </svg>
        )}
      </button>

      {/* Progress + Duration */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Waveform-style progress bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          style={{
            height: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5px',
            position: 'relative',
          }}
        >
          {/* Generate simple waveform bars */}
          {Array.from({ length: 28 }).map((_, i) => {
            const barProgress = (i / 28) * 100
            const isActive = barProgress <= progress
            // Pseudo-random heights for waveform look (deterministic based on index)
            const heights = [6, 10, 8, 14, 10, 12, 7, 15, 9, 11, 13, 8, 14, 10, 7, 12, 15, 9, 11, 8, 13, 10, 14, 7, 12, 9, 15, 11]
            const h = heights[i % heights.length]
            return (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  borderRadius: '1px',
                  background: isActive ? '#C9A84C' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.1s ease',
                  flexShrink: 0,
                }}
              />
            )
          })}
        </div>

        {/* Duration */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '10px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {formatDuration(currentTime)}
          </span>
          <span
            style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '10px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {duration > 0 ? formatDuration(duration) : '--:--'}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Helper to detect if a message is a voice note by file name */
export function isVoiceNote(fileName: string | null | undefined): boolean {
  if (!fileName) return false
  const lower = fileName.toLowerCase()
  return lower.startsWith('voice-note') || lower.endsWith('.webm') || lower.endsWith('.ogg')
}
