'use client'
// @ts-nocheck

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { openFile } from '@/lib/utils/openFile'

export const runtime = 'edge';

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

interface ChatDetails {
  id: string
  admin_name: string
  admin_role: string
  member_name: string
  member_company: string | null
  messages: Message[]
}

export default function LiveChatDetailPage() {
  const { id: chatId } = useParams<{ id: string }>()
  const [chat, setChat] = useState<ChatDetails | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/elite/chats/${chatId}`)
      if (res.ok) {
        const json = await res.json()
        setChat(json.data)
        setMessages(json.data.messages || [])
      }
    } catch (err) {
      console.error('Failed to load chat:', err)
    } finally {
      setLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    if (chatId) loadChat()
  }, [chatId, loadChat])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`direct-messages-detail-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
          // Mark as read
          if (newMessage.sender_id !== userId) {
            fetch(`/api/elite/chats/${chatId}`).catch(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, userId, supabase])

  async function handleSendMessage() {
    if (!messageText.trim() || !chatId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/elite/chats/${chatId}/messages`, {
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
    if (!file || !chatId) return

    setSending(true)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const res = await fetch(`/api/elite/chats/${chatId}/messages`, {
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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: "'Raleway', sans-serif",
        fontSize: '14px',
        color: 'rgba(255,255,255,0.4)',
      }}>
        Loading chat...
      </div>
    )
  }

  if (!chat) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '18px',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '16px',
        }}>
          Chat not found
        </p>
        <Link
          href="/dashboard/live-chat"
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            color: '#e6c364',
            textDecoration: 'none',
          }}
        >
          &larr; Back to chats
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        background: '#0e0e0e',
        borderRadius: '8px 8px 0 0',
        border: '1px solid rgba(77,70,55,0.25)',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <Link
          href="/dashboard/live-chat"
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            textDecoration: 'none',
            padding: '4px 10px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
          }}
        >
          &larr; Back
        </Link>
        <div>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '16px',
            color: '#fff',
            margin: 0,
            letterSpacing: '1px',
          }}>
            {chat.admin_name}
          </h1>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '11px',
            color: 'rgba(201,168,76,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {chat.admin_role.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="chat-watermark" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        background: '#131313',
        borderLeft: '1px solid rgba(77,70,55,0.25)',
        borderRight: '1px solid rgba(77,70,55,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.length === 0 ? (
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
                  background: isOwn ? 'rgba(201,168,76,0.1)' : '#0e0e0e',
                  border: isOwn ? '1px solid rgba(201,168,76,0.2)' : '1px solid rgba(77,70,55,0.25)',
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
                    <button
                      onClick={() => openFile(msg.file_url!)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: "'Raleway', sans-serif",
                        fontSize: '12px',
                        color: '#e6c364',
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
                        color: msg.is_read ? '#e6c364' : 'rgba(255,255,255,0.2)',
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
        borderTop: '1px solid rgba(77,70,55,0.25)',
        background: '#0e0e0e',
        borderRadius: '0 0 8px 8px',
        border: '1px solid rgba(77,70,55,0.25)',
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
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
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
            background: '#131313',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '10px 14px',
            color: '#fff',
            fontFamily: "'Raleway', sans-serif",
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={sending || !messageText.trim()}
          style={{
            background: messageText.trim() ? '#e6c364' : 'rgba(201,168,76,0.2)',
            border: 'none',
            borderRadius: '6px',
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
      </div>
    </div>
  )
}
