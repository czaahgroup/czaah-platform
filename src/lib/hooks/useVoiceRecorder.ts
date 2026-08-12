'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  recordingDuration: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<File | null>
  cancelRecording: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const resolveStopRef = useRef<((file: File | null) => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Try webm first, fall back to ogg
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : ''

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        })
        const ext = (mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm'
        const fileName = `voice-note-${Date.now()}.${ext}`
        const file = new File([blob], fileName, { type: blob.type })
        if (resolveStopRef.current) {
          resolveStopRef.current(file)
          resolveStopRef.current = null
        }
      }

      recorder.start(100) // collect chunks every 100ms
      setIsRecording(true)
      setRecordingDuration(0)

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Microphone access is required to record voice notes.')
    }
  }, [])

  const stopRecording = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }
      resolveStopRef.current = resolve
      recorder.stop()
      clearTimer()
      stopStream()
      setIsRecording(false)
      setRecordingDuration(0)
    })
  }, [clearTimer, stopStream])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      // Clear the onstop handler so it doesn't produce a file
      recorder.onstop = null
      recorder.stop()
    }
    clearTimer()
    stopStream()
    chunksRef.current = []
    setIsRecording(false)
    setRecordingDuration(0)
    if (resolveStopRef.current) {
      resolveStopRef.current(null)
      resolveStopRef.current = null
    }
  }, [clearTimer, stopStream])

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
