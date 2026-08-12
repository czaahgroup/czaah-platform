'use client'
// @ts-nocheck

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { openFile } from '@/lib/utils/openFile'
import { VoiceNotePlayer, isVoiceNote } from '@/components/chat/VoiceNotePlayer'
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder'

interface Chat {
  id: string
  property_id: string
  enquirer_id: string
  partner_id: string
  last_message: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  unread_count: number
  property_listings: { title: string; images: string[] } | null
  enquirer: { full_name: string } | null
  partner: { full_name: string } | null
}

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  is_read: boolean
  created_at: string
}

export default function PropertyChatsPage() {
  const searchParams = useSearchParams()
  const initialChatId = searchParams.get('id')
  const supabase = createClient()

  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatDetails, setChatDetails] = useState<{ propertyTitle: string; otherName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder()

  function formatRecordingTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/property-chat')
      const json = await res.json()
      if (res.ok) setChats(json.data || [])
    } catch (err) {
      console.error('Failed to load chats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadChats() }, [loadChats])

  // Load selected chat messages
  useEffect(() => {
    if (!selectedChatId) return
    let cancelled = false

    async function loadChat() {
      setChatLoading(true)
      try {
        const res = await fetch(`/api/property-chat/${selectedChatId}`)
        const json = await res.json()
        if (cancelled) return
        if (res.ok) {
          setMessages(json.messages || [])
          const chat = json.chat
          const isEnquirer = chat.enquirer_id === userId
          setChatDetails({
            propertyTitle: chat.property_listings?.title || 'Property',
            otherName: isEnquirer ? chat.partner?.full_name || 'Partner' : chat.enquirer?.full_name || 'Enquirer',
          })
        }
      } catch (err) {
        console.error('Failed to load chat:', err)
      } finally {
        if (!cancelled) setChatLoading(false)
      }
    }
    loadChat()
    return () => { cancelled = true }
  }, [selectedChatId, userId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    if (!selectedChatId) return

    const channel = supabase
      .channel(`prop-messages-${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'property_messages',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedChatId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage(content?: string, fileName?: string, fileData?: string) {
    if (!selectedChatId) return
    setSending(true)
    try {
      const res = await fetch(`/api/property-chat/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content || null,
          fileName: fileName || null,
          fileData: fileData || null,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev
          return [...prev, json.data]
        })
        setMessageText('')
        loadChats()
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleSendText() {
    if (!messageText.trim()) return
    await sendMessage(messageText.trim())
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      await sendMessage(null, file.name, base64)
    }
    reader.readAsDataURL(file)
  }

  async function handleVoiceNote() {
    if (isRecording) {
      const blob = await stopRecording()
      if (blob) {
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1]
          const fileName = `voice_${Date.now()}.webm`
          await sendMessage(null, fileName, base64)
        }
        reader.readAsDataURL(blob)
      }
    } else {
      startRecording()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 0) return time
    if (diffDays === 1) return `Yesterday ${time}`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#fff', margin: '0 0 16px' }}>Property Chats</h1>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0', border: '1px solid rgba(77,70,55,0.25)', borderRadius: '0px', overflow: 'hidden', minHeight: 0 }}>
        {/* Chat list */}
        <div style={{ background: '#0e0e0e', borderRight: '1px solid rgba(77,70,55,0.25)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>Loading...</div>
          ) : chats.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>No property chats yet.</div>
          ) : (
            chats.map((chat) => {
              const isSelected = chat.id === selectedChatId
              const isEnquirer = chat.enquirer_id === userId
              const otherName = isEnquirer ? chat.partner?.full_name : chat.enquirer?.full_name
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isSelected ? 'rgba(201,168,76,0.05)' : 'transparent',
                    borderLeft: isSelected ? '2px solid rgba(201,168,76,0.6)' : '2px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff', fontWeight: 500 }}>{otherName || 'User'}</span>
                    {chat.unread_count > 0 && (
                      <span style={{ background: '#e6c364', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{chat.unread_count}</span>
                    )}
                  </div>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.5)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.property_listings?.title || 'Property'}
                  </p>
                  {chat.last_message && (
                    <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.last_message}
                    </p>
                  )}
                  {chat.last_message_at && (
                    <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>{formatTime(chat.last_message_at)}</p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#000' }}>
          {!selectedChatId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Select a chat to start messaging</p>
            </div>
          ) : chatLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Loading messages...</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              {chatDetails && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(77,70,55,0.25)', background: '#0e0e0e' }}>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: '#fff', margin: '0 0 2px', fontWeight: 500 }}>{chatDetails.otherName}</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '11px', color: 'rgba(201,168,76,0.5)', margin: 0 }}>{chatDetails.propertyTitle}</p>
                </div>
              )}

              {/* Messages */}
              <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg) => {
                  const isMine = msg.sender_id === userId
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMine ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isMine ? 'rgba(201,168,76,0.2)' : 'rgba(77,70,55,0.25)'}`,
                      }}>
                        {msg.file_url && msg.file_name && isVoiceNote(msg.file_name) ? (
                          <VoiceNotePlayer fileUrl={msg.file_url} />
                        ) : msg.file_url && msg.file_name ? (
                          <button
                            onClick={() => openFile(msg.file_url!)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#e6c364',
                              cursor: 'pointer',
                              fontFamily: "'Raleway', sans-serif",
                              fontSize: '13px',
                              padding: 0,
                              textDecoration: 'underline',
                            }}
                          >
                            {msg.file_name}
                          </button>
                        ) : null}
                        {msg.content && (
                          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: isMine ? '#fff' : 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        )}
                        <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', textAlign: 'right' }}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(77,70,55,0.25)', background: '#0e0e0e' }}>
                {isRecording ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#ef4444', animation: 'pulse 1s infinite' }}>Recording {formatRecordingTime(recordingDuration)}</span>
                    <button onClick={cancelRecording} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '12px' }}>Cancel</button>
                    <button onClick={handleVoiceNote} style={{ background: '#e6c364', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '0px', cursor: 'pointer', fontFamily: "'Raleway', sans-serif", fontSize: '12px', fontWeight: 600 }}>Send</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                    </button>
                    <button onClick={handleVoiceNote} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                    </button>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '0px',
                        padding: '10px 14px',
                        color: '#fff',
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'none',
                        minHeight: '40px',
                        maxHeight: '120px',
                      }}
                    />
                    <button
                      onClick={handleSendText}
                      disabled={sending || !messageText.trim()}
                      style={{
                        background: messageText.trim() ? '#e6c364' : 'rgba(201,168,76,0.3)',
                        border: 'none',
                        borderRadius: '0px',
                        padding: '10px 16px',
                        cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 767px) {
          div[style*="grid-template-columns: 320px 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
