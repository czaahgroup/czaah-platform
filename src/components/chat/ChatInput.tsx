'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder'

interface ChatInputProps {
  onSend: (content: string) => void
  onSendFile: (file: File) => void
  onSendInternalNote?: (content: string) => void
  onTyping: () => void
  canSendInternalNote: boolean
}

const ACCEPTED_FILE_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ChatInput({
  onSend,
  onSendFile,
  onSendInternalNote,
  onTyping,
  canSendInternalNote,
}: ChatInputProps) {
  const [text, setText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [internalNoteMode, setInternalNoteMode] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder()

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const handleTyping = useCallback(() => {
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(() => {
      onTyping()
    }, 300)
  }, [onTyping])

  const handleSend = useCallback(async () => {
    if (sending) return

    // File send
    if (selectedFile) {
      setSending(true)
      try {
        await onSendFile(selectedFile)
        setSelectedFile(null)
      } finally {
        setSending(false)
      }
      return
    }

    const trimmed = text.trim()
    if (!trimmed) return

    setSending(true)
    try {
      if (internalNoteMode && onSendInternalNote) {
        await onSendInternalNote(trimmed)
      } else {
        await onSend(trimmed)
      }
      setText('')
    } finally {
      setSending(false)
    }
  }, [text, selectedFile, internalNoteMode, sending, onSend, onSendFile, onSendInternalNote])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  const clearFile = () => {
    setSelectedFile(null)
  }

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording and send
      const file = await stopRecording()
      if (file) {
        setSending(true)
        try {
          await onSendFile(file)
        } finally {
          setSending(false)
        }
      }
    } else {
      await startRecording()
    }
  }

  const borderColor = internalNoteMode
    ? 'border-amber-600/50 focus-within:border-amber-500'
    : 'border-czaah-border focus-within:border-czaah-gold/50'

  return (
    <div className="border-t border-czaah-border bg-czaah-elevated px-4 py-3">
      {/* Internal note mode banner */}
      {internalNoteMode && (
        <div className="flex items-center gap-2 mb-2 px-2">
          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-xs text-amber-400 font-medium">
            Internal note mode — only admins can see this
          </span>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-czaah-card rounded-lg border border-czaah-border">
          <svg className="w-4 h-4 text-czaah-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          <span className="text-sm text-czaah-muted truncate flex-1">{selectedFile.name}</span>
          <button
            onClick={clearFile}
            className="text-czaah-muted hover:text-czaah-white transition-colors shrink-0"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input row */}
      <div className={`flex items-end gap-2 rounded-xl border ${borderColor} bg-czaah-card px-3 py-2 transition-colors`}>
        {/* File attachment button */}
        {!isRecording && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-czaah-muted hover:text-czaah-gold transition-colors pb-0.5"
            aria-label="Attach file"
            disabled={sending}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Recording indicator (replaces textarea while recording) */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 py-0.5">
            {/* Pulsing red dot */}
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-sm text-czaah-white font-medium font-[family-name:var(--font-body)]">
              {formatRecordingTime(recordingDuration)}
            </span>
            <span className="text-xs text-czaah-muted">Recording...</span>
            <button
              onClick={cancelRecording}
              className="text-xs text-czaah-muted-dim hover:text-red-400 transition-colors ml-auto"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Textarea */
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              handleTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder={internalNoteMode ? 'Type an internal note...' : 'Type a message...'}
            rows={1}
            disabled={sending}
            className="flex-1 bg-transparent text-sm text-czaah-white placeholder:text-czaah-muted-dim resize-none focus:outline-none min-h-[24px] max-h-[160px] py-0.5 font-[family-name:var(--font-body)]"
          />
        )}

        {/* Internal note toggle */}
        {canSendInternalNote && !isRecording && (
          <button
            onClick={() => setInternalNoteMode((v) => !v)}
            className={`shrink-0 pb-0.5 transition-colors ${
              internalNoteMode
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-czaah-muted hover:text-amber-400'
            }`}
            aria-label={internalNoteMode ? 'Switch to regular message' : 'Switch to internal note'}
            title={internalNoteMode ? 'Internal note mode (click to switch)' : 'Send as internal note'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        )}

        {/* Mic button */}
        <button
          onClick={handleMicClick}
          disabled={sending}
          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-transparent hover:bg-czaah-gold/10'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Record voice note'}
          title={isRecording ? 'Stop recording and send' : 'Record voice note'}
        >
          {isRecording ? (
            /* Stop icon (square) */
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            /* Mic icon */
            <svg className="w-5 h-5 text-czaah-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Send button */}
        {!isRecording && (
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !selectedFile)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-czaah-gold hover:bg-czaah-gold-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {sending ? (
              <div className="w-3.5 h-3.5 border-2 border-czaah-black/30 border-t-czaah-black rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-czaah-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Hint text */}
      <p className="text-[10px] text-czaah-muted-dim mt-1.5 px-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
