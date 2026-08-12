'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useChat, type ChatMessage } from '@/lib/hooks/useChat'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType } from '@/lib/hooks/useCall'
import { ChatInput } from './ChatInput'
import { CallUI } from './CallUI'
import { openFile } from '@/lib/utils/openFile'
import { VoiceNotePlayer, isVoiceNote } from './VoiceNotePlayer'

interface EnquiryData {
  product_name?: string
  sector?: string
  reference_number?: string
  description?: string
}

interface ChatPanelProps {
  enquiryId: string
  currentUserId: string
  currentUserName?: string
  userRole: string
  enquiryData?: EnquiryData
  enableCalls?: boolean
  targetUserId?: string
  targetName?: string
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReadReceipt({ isOwn, isRead }: { isOwn: boolean; isRead: boolean }) {
  if (!isOwn) return null

  return (
    <span className="inline-flex items-center ml-1.5">
      {isRead ? (
        <svg className="w-3.5 h-3.5 text-czaah-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 13l5 5L17 7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 13l5 5L23 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-czaah-muted-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  )
}

function FileAttachment({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  return (
    <button
      onClick={() => openFile(fileUrl)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
    >
      <svg
        className="w-5 h-5 text-czaah-gold shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
      <span className="text-sm text-czaah-muted group-hover:text-czaah-white transition-colors truncate max-w-[200px]">
        {fileName}
      </span>
    </button>
  )
}

function MessageBubble({
  message,
  isOwn,
  userRole,
}: {
  message: ChatMessage
  isOwn: boolean
  userRole: string
}) {
  // System messages
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-czaah-muted bg-czaah-elevated px-4 py-1.5 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  // Internal notes — only visible to admin/super_admin
  if (message.message_type === 'internal_note') {
    if (userRole !== 'admin' && userRole !== 'super_admin') return null
    return (
      <div className="flex justify-center my-3">
        <div className="max-w-[85%] bg-amber-900/30 border border-amber-700/40 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Internal Note
            </span>
          </div>
          <p className="text-sm text-amber-100/80">{message.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-amber-400/60">{message.sender_name}</span>
            <span className="text-[11px] text-amber-400/40">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Regular messages
  const alignment = isOwn ? 'justify-end' : 'justify-start'
  const bubbleBg = isOwn
    ? 'bg-czaah-gold/15 border border-czaah-gold/20'
    : 'bg-czaah-card border border-czaah-border'
  const roundedClass = isOwn
    ? 'rounded-2xl rounded-br-sm'
    : 'rounded-2xl rounded-bl-sm'

  return (
    <div className={`flex ${alignment} mb-3`}>
      <div className={`max-w-[75%] ${bubbleBg} ${roundedClass} px-4 py-2.5`}>
        {!isOwn && (
          <p className="text-[11px] font-semibold text-czaah-gold mb-0.5">
            {message.sender_name}
          </p>
        )}

        {message.message_type === 'file' && message.file_url && message.file_name ? (
          isVoiceNote(message.file_name) ? (
            <VoiceNotePlayer fileUrl={message.file_url} fileName={message.file_name} />
          ) : (
            <FileAttachment fileUrl={message.file_url} fileName={message.file_name} />
          )
        ) : (
          <p className="text-sm text-czaah-white whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-[11px] text-czaah-muted-dim">
            {formatTime(message.created_at)}
          </span>
          <ReadReceipt isOwn={isOwn} isRead={message.is_read} />
        </div>
      </div>
    </div>
  )
}

export function ChatPanel({
  enquiryId,
  currentUserId,
  currentUserName = 'User',
  userRole,
  enquiryData,
  enableCalls,
  targetUserId,
  targetName: targetNameProp,
}: ChatPanelProps) {
  const {
    messages,
    sendMessage,
    sendFile,
    sendInternalNote,
    isTyping,
    setTyping,
    loading,
  } = useChat({ enquiryId, currentUserId, userRole })

  const postEnquiryCallMessage = useCallback(async (content: string) => {
    try {
      await fetch(`/api/enquiries/${enquiryId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, messageType: 'system' }),
      })
    } catch (err) {
      console.error('Failed to log call message:', err)
    }
  }, [enquiryId])

  const handleCallEnded = useCallback(async (durationSeconds: number, type: CallType) => {
    const m = Math.floor(durationSeconds / 60).toString().padStart(2, '0')
    const s = (durationSeconds % 60).toString().padStart(2, '0')
    const label = type === 'video' ? 'Video call' : 'Voice call'
    postEnquiryCallMessage(`\u260E ${label} \u2014 ${m}:${s}`)
  }, [postEnquiryCallMessage])

  const handleCallMissed = useCallback(async (_targetUserId: string, tName: string, type: CallType) => {
    const label = type === 'video' ? 'video call' : 'voice call'
    postEnquiryCallMessage(`\u260E Missed ${label} to ${tName}`)
  }, [postEnquiryCallMessage])

  const call = useCall({
    currentUserId,
    currentUserName,
    channelPrefix: 'enquiry-call',
    chatId: enquiryId,
    chatContextType: 'enquiry',
    chatContextId: enquiryId,
    onCallEnded: enableCalls ? handleCallEnded : undefined,
    onCallMissed: enableCalls ? handleCallMissed : undefined,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages — scroll within container only, not the page
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length])

  const canSendInternalNote = userRole === 'admin' || userRole === 'super_admin'

  const handleSendFile = async (file: File) => {
    try {
      await sendFile(file)
    } catch {
      // Could show toast
    }
  }

  const handleVoiceCall = enableCalls && targetUserId && targetNameProp
    ? () => call.initiateCall(targetUserId, targetNameProp, 'voice')
    : undefined

  const handleVideoCall = enableCalls && targetUserId && targetNameProp
    ? () => call.initiateCall(targetUserId, targetNameProp, 'video')
    : undefined

  return (
    <div className="flex flex-col h-full bg-czaah-black rounded-xl border border-czaah-border overflow-hidden relative">
      {/* Call UI */}
      {enableCalls && (
        <CallUI
          callState={call.callState}
          callType={call.callType}
          callDuration={call.callDuration}
          isMuted={call.isMuted}
          isVideoOff={call.isVideoOff}
          participants={call.participants}
          localStream={call.localStream}
          callerName={call.callerName}
          callerType={call.callerType}
          onAccept={call.acceptCall}
          onDecline={call.declineCall}
          onEndCall={call.endCall}
          onToggleMute={call.toggleMute}
          onToggleVideo={call.toggleVideo}
          onRejoin={call.rejoinCall}
          canRejoin={call.canRejoin}
        />
      )}

      {/* Enquiry context header */}
      {enquiryData && (
        <div className="px-5 py-3.5 bg-czaah-elevated border-b border-czaah-border" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
              {enquiryData.product_name && (
                <h3 className="text-sm font-semibold font-[family-name:var(--font-heading)] text-czaah-white">
                  {enquiryData.product_name}
                </h3>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                {enquiryData.sector && (
                  <span className="text-xs text-czaah-muted">{enquiryData.sector}</span>
                )}
                {enquiryData.reference_number && (
                  <span className="text-xs text-czaah-gold font-mono">
                    #{enquiryData.reference_number}
                  </span>
                )}
              </div>
          </div>
          {(handleVoiceCall || handleVideoCall) && (
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {handleVoiceCall && (
                <button
                  onClick={handleVoiceCall}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  title="Voice call"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#C9A84C"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </button>
              )}
              {handleVideoCall && (
                <button
                  onClick={handleVideoCall}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  title="Video call"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" fill="#C9A84C"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 chat-watermark">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-czaah-gold/30 border-t-czaah-gold rounded-full animate-spin" />
              <span className="text-xs text-czaah-muted">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-10 h-10 text-czaah-border mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <p className="text-sm text-czaah-muted">No messages yet</p>
              <p className="text-xs text-czaah-muted-dim mt-1">Start the conversation below</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                userRole={userRole}
              />
            ))}
          </>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-czaah-muted rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-czaah-muted rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-czaah-muted rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-czaah-muted">{isTyping} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        onSendFile={handleSendFile}
        onSendInternalNote={canSendInternalNote ? sendInternalNote : undefined}
        onTyping={setTyping}
        canSendInternalNote={canSendInternalNote}
      />
    </div>
  )
}
