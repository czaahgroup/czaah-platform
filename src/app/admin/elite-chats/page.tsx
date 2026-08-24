'use client'
// @ts-nocheck

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { openFile } from '@/lib/utils/openFile'
import { VoiceNotePlayer, isVoiceNote } from '@/components/chat/VoiceNotePlayer'
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder'
import { useCall } from '@/lib/hooks/useCall'
import type { CallType } from '@/lib/hooks/useCall'
import { CallUI } from '@/components/chat/CallUI'
import { primeAudioUnlock } from '@/lib/audioUnlock'


interface Chat {
  id: string
  elite_member_id: string
  admin_id: string
  admin_name: string
  admin_role: string
  member_name: string
  member_company: string | null
  last_message: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  unread_count: number
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

interface Admin {
  id: string
  full_name: string
  role: string
}

export default function AdminEliteChatsPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatDetails, setChatDetails] = useState<{ admin_name: string; member_name: string; member_company: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Admin')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
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

  async function handleVoiceRecordToggle() {
    if (isRecording) {
      const file = await stopRecording()
      if (file && selectedChatId) {
        setSending(true)
        try {
          const buffer = await file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          const res = await fetch(`/api/elite/chats/${selectedChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64, fileName: file.name }),
          })
          if (res.ok) {
            const json = await res.json()
            setMessages((prev) => {
              if (prev.some((m) => m.id === json.data.id)) return prev
              return [...prev, json.data]
            })
          }
        } catch (err) {
          console.error('Failed to send voice note:', err)
        } finally {
          setSending(false)
        }
      }
    } else {
      await startRecording()
    }
  }

  useEffect(() => {
    primeAudioUnlock()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id || null
      setUserId(uid)
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', uid)
          .single()
        if (prof?.full_name) setUserName(prof.full_name)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load admins for add-participant feature
  useEffect(() => {
    async function loadAdmins() {
      try {
        const res = await fetch('/api/elite/admins')
        if (res.ok) {
          const json = await res.json()
          setAdmins(json.data || [])
        }
      } catch (err) {
        console.error('Failed to load admins:', err)
      }
    }
    loadAdmins()
  }, [])

  const postCallMessage = useCallback(async (content: string) => {
    if (!selectedChatId) return
    try {
      const res = await fetch(`/api/elite/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const json = await res.json()
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === json.data.id)) return prev
          return [...prev, json.data]
        })
      }
    } catch (err) {
      console.error('Failed to log call message:', err)
    }
  }, [selectedChatId])

  const handleCallEnded = useCallback(async (durationSeconds: number, type: CallType) => {
    const m = Math.floor(durationSeconds / 60).toString().padStart(2, '0')
    const s = (durationSeconds % 60).toString().padStart(2, '0')
    const label = type === 'video' ? 'Video call' : 'Voice call'
    postCallMessage(`\u260E ${label} \u2014 ${m}:${s}`)
  }, [postCallMessage])

  const handleCallMissed = useCallback(async (_targetUserId: string, targetName: string, type: CallType) => {
    const label = type === 'video' ? 'video call' : 'voice call'
    postCallMessage(`\u260E Missed ${label} to ${targetName}`)
  }, [postCallMessage])

  const [showAddParticipant, setShowAddParticipant] = useState(false)

  const call = useCall({
    currentUserId: userId || '',
    currentUserName: userName,
    channelPrefix: 'direct-call',
    chatId: selectedChatId || '',
    chatContextType: 'direct',
    chatContextId: selectedChatId || '',
    onCallEnded: handleCallEnded,
    onCallMissed: handleCallMissed,
  })

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/elite/chats')
      if (res.ok) {
        const json = await res.json()
        setChats(json.data || [])
      }
    } catch (err) {
      console.error('Failed to load chats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  const loadChat = useCallback(async (chatId: string) => {
    setChatLoading(true)
    try {
      const res = await fetch(`/api/elite/chats/${chatId}`)
      if (res.ok) {
        const json = await res.json()
        setMessages(json.data.messages || [])
        setChatDetails({
          admin_name: json.data.admin_name,
          member_name: json.data.member_name,
          member_company: json.data.member_company,
        })
        loadChats()
      }
    } catch (err) {
      console.error('Failed to load chat:', err)
    } finally {
      setChatLoading(false)
    }
  }, [loadChats])

  useEffect(() => {
    if (selectedChatId) loadChat(selectedChatId)
  }, [selectedChatId, loadChat])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  // Real-time subscription for selected chat
  useEffect(() => {
    if (!selectedChatId) return

    const channel = supabase
      .channel(`admin-direct-messages-${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
          if (newMessage.sender_id !== userId) {
            fetch(`/api/elite/chats/${selectedChatId}`).catch(() => {})
          }
          loadChats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedChatId, userId, supabase, loadChats])

  // Global subscription for unread updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-direct-messages-all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          loadChats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadChats])

  async function handleSendMessage() {
    if (!messageText.trim() || !selectedChatId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/elite/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText.trim() }),
      })
      if (res.ok) {
        const json = await res.json()
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev
          return [...prev, json.data]
        })
        setMessageText('')
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedChatId) return

    setSending(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch(`/api/elite/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, fileName: file.name }),
      })
      if (res.ok) {
        const json = await res.json()
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev
          return [...prev, json.data]
        })
      }
    } catch (err) {
      console.error('Failed to upload file:', err)
    } finally {
      setSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const selectedChat = chats.find((c) => c.id === selectedChatId)

  return (
    <div>
      <h1 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '24px',
        color: '#fff',
        margin: '0 0 24px 0',
        letterSpacing: '2px',
      }}>
        Elite Member Chats
      </h1>

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 180px)',
        background: '#080808',
        borderRadius: 0,
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        {/* Left Panel - Chat List */}
        <div style={{
          width: '340px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '12px',
              letterSpacing: '2px',
              color: 'rgba(201,168,76,0.5)',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              Direct Conversations
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{
                padding: '40px 16px',
                textAlign: 'center',
                fontFamily: "'Raleway', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.4)',
              }}>
                Loading chats...
              </div>
            ) : chats.length === 0 ? (
              <div style={{
                padding: '40px 16px',
                textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: '8px',
                }}>
                  No elite member chats
                </p>
                <p style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  Chats will appear here when elite members message you
                </p>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px 16px',
                    background: selectedChatId === chat.id ? 'rgba(201,168,76,0.05)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    borderLeft: selectedChatId === chat.id ? '2px solid rgba(201,168,76,0.6)' : '2px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChatId !== chat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChatId !== chat.id) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#fff',
                    }}>
                      {chat.member_name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {chat.unread_count > 0 && (
                        <span style={{
                          background: '#C9A84C',
                          color: '#000',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 0,
                          fontFamily: "'Raleway', sans-serif",
                        }}>
                          {chat.unread_count}
                        </span>
                      )}
                      {chat.last_message_at && (
                        <span style={{
                          fontFamily: "'Raleway', sans-serif",
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.3)',
                        }}>
                          {formatTime(chat.last_message_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  {chat.member_company && (
                    <p style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '11px',
                      color: 'rgba(201,168,76,0.4)',
                      margin: '0 0 4px 0',
                    }}>
                      {chat.member_company}
                    </p>
                  )}
                  {chat.last_message && (
                    <p style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {chat.last_message}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat View */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#000',
          position: 'relative',
        }}>
          {/* Call UI overlay */}
          {selectedChatId && userId && (
            <>
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
                onAddParticipant={() => setShowAddParticipant(!showAddParticipant)}
                onRejoin={call.rejoinCall}
                canRejoin={call.canRejoin}
              />
              {/* Add participant dropdown -- admin can invite other admins */}
              {showAddParticipant && call.callState === 'connected' && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: '16px',
                  zIndex: 60,
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 0,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '180px',
                }}>
                  <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '11px',
                    color: 'rgba(201,168,76,0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Add to call
                  </div>
                  {admins.filter((a) => a.id !== userId && !call.participants.some((p) => p.userId === a.id)).length === 0 ? (
                    <div style={{
                      padding: '8px 12px',
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)',
                    }}>
                      No additional participants available
                    </div>
                  ) : (
                    admins.filter((a) => a.id !== userId && !call.participants.some((p) => p.userId === a.id)).map((admin) => (
                      <button
                        key={admin.id}
                        onClick={() => {
                          call.addParticipant(admin.id, admin.full_name)
                          setShowAddParticipant(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          color: '#fff',
                          fontFamily: "'Raleway', sans-serif",
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {admin.full_name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          {!selectedChatId ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <p style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '16px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '2px',
              }}>
                Select a conversation
              </p>
              <p style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '12px',
                color: 'rgba(255,255,255,0.2)',
              }}>
                Click on an elite member chat to start responding
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: '#080808',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h2 style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '14px',
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '1px',
                  }}>
                    {chatDetails?.member_name || selectedChat?.member_name || 'Chat'}
                  </h2>
                  {chatDetails?.member_company && (
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '11px',
                      color: 'rgba(201,168,76,0.5)',
                      letterSpacing: '1px',
                    }}>
                      {chatDetails.member_company}
                    </span>
                  )}
                </div>
                {selectedChat && userId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const targetId = selectedChat.elite_member_id
                        const targetNm = chatDetails?.member_name || selectedChat.member_name || 'Member'
                        call.initiateCall(targetId, targetNm, 'voice')
                      }}
                      disabled={call.callState !== 'idle'}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 0,
                        padding: '4px 10px',
                        cursor: call.callState === 'idle' ? 'pointer' : 'default',
                        opacity: call.callState === 'idle' ? 1 : 0.4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                      }}
                      title="Start voice call"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      </svg>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        color: '#C9A84C',
                        fontWeight: 600,
                      }}>
                        Call
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        const targetId = selectedChat.elite_member_id
                        const targetNm = chatDetails?.member_name || selectedChat.member_name || 'Member'
                        call.initiateCall(targetId, targetNm, 'video')
                      }}
                      disabled={call.callState !== 'idle'}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 0,
                        padding: '4px 10px',
                        cursor: call.callState === 'idle' ? 'pointer' : 'default',
                        opacity: call.callState === 'idle' ? 1 : 0.4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                      }}
                      title="Start video call"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" fill="#C9A84C" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      <span style={{
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '11px',
                        color: '#C9A84C',
                        fontWeight: 600,
                      }}>
                        Video
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="chat-watermark" style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {chatLoading ? (
                  <div style={{
                    textAlign: 'center',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.4)',
                    paddingTop: '40px',
                  }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.3)',
                    paddingTop: '40px',
                  }}>
                    No messages yet. Send the first message!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === userId
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          background: isOwn ? 'rgba(201,168,76,0.1)' : '#080808',
                          border: isOwn ? '1px solid rgba(201,168,76,0.2)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                          {msg.content && (
                            <p style={{
                              fontFamily: "'Raleway', sans-serif",
                              fontSize: '13px',
                              color: '#fff',
                              margin: 0,
                              lineHeight: 1.5,
                              wordBreak: 'break-word',
                            }}>
                              {msg.content}
                            </p>
                          )}
                          {msg.file_url && (
                            isVoiceNote(msg.file_name) ? (
                              <div style={{ marginTop: msg.content ? '6px' : 0 }}>
                                <VoiceNotePlayer fileUrl={msg.file_url} fileName={msg.file_name || 'voice-note.webm'} />
                              </div>
                            ) : (
                              <button
                                onClick={() => openFile(msg.file_url!)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontFamily: "'Raleway', sans-serif",
                                  fontSize: '12px',
                                  color: '#C9A84C',
                                  textDecoration: 'none',
                                  marginTop: msg.content ? '6px' : 0,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <span style={{ fontSize: '14px' }}>&#128206;</span>
                                {msg.file_name || 'Attachment'}
                              </button>
                            )
                          )}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '4px',
                          }}>
                            <span style={{
                              fontFamily: "'Raleway', sans-serif",
                              fontSize: '10px',
                              color: 'rgba(255,255,255,0.25)',
                            }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwn && (
                              <span style={{
                                fontSize: '10px',
                                color: msg.is_read ? '#C9A84C' : 'rgba(255,255,255,0.2)',
                              }}>
                                {msg.is_read ? '\u2713\u2713' : '\u2713'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: '#080808',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
              }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileAttach}
                  style={{ display: 'none' }}
                />
                {!isRecording && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 0,
                      padding: '8px 10px',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                    title="Attach file"
                  >
                    &#128206;
                  </button>
                )}
                {isRecording ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#000',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 0,
                    padding: '10px 14px',
                  }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '13px',
                      color: '#fff',
                      fontWeight: 500,
                    }}>
                      {formatRecordingTime(recordingDuration)}
                    </span>
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)',
                    }}>
                      Recording...
                    </span>
                    <button
                      onClick={cancelRecording}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={sending}
                    style={{
                      flex: 1,
                      background: '#000',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 0,
                      padding: '10px 14px',
                      color: '#fff',
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                  />
                )}
                {/* Mic button */}
                <button
                  onClick={handleVoiceRecordToggle}
                  disabled={sending}
                  style={{
                    background: isRecording ? '#ef4444' : 'transparent',
                    border: isRecording ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 0,
                    padding: '8px 10px',
                    color: isRecording ? '#fff' : '#C9A84C',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={isRecording ? 'Stop recording and send' : 'Record voice note'}
                >
                  {isRecording ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                {!isRecording && (
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !messageText.trim()}
                    style={{
                      background: messageText.trim() ? '#C9A84C' : 'rgba(201,168,76,0.2)',
                      border: 'none',
                      borderRadius: 0,
                      padding: '10px 18px',
                      color: messageText.trim() ? '#000' : 'rgba(0,0,0,0.4)',
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: messageText.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
