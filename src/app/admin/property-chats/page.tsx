'use client'
// @ts-nocheck

import { useEffect, useState, useRef } from 'react'


interface Chat {
  id: string
  property_id: string
  enquirer_id: string
  partner_id: string
  last_message: string | null
  last_message_at: string | null
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

export default function AdminPropertyChatsPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatDetails, setChatDetails] = useState<{ propertyTitle: string; enquirerName: string; partnerName: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadChats() {
      try {
        const res = await fetch('/api/property-chat')
        const json = await res.json()
        if (res.ok) setChats(json.data || [])
      } catch (err) {
        console.error('Failed to load chats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadChats()
  }, [])

  useEffect(() => {
    if (!selectedChatId) return

    async function loadChat() {
      setChatLoading(true)
      try {
        const res = await fetch(`/api/property-chat/${selectedChatId}`)
        const json = await res.json()
        if (res.ok) {
          setMessages(json.messages || [])
          setChatDetails({
            propertyTitle: json.chat.property_listings?.title || 'Property',
            enquirerName: json.chat.enquirer?.full_name || 'Enquirer',
            partnerName: json.chat.partner?.full_name || 'Partner',
          })
        }
      } catch (err) {
        console.error('Failed to load chat:', err)
      } finally {
        setChatLoading(false)
      }
    }
    loadChat()
  }, [selectedChatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl text-on-surface mb-6">Property Chat Monitor</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '0', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 0, overflow: 'hidden', minHeight: '600px' }}>
        {/* Chat list */}
        <div style={{ background: '#080808', borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>Loading...</div>
          ) : chats.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Raleway', sans-serif", fontSize: '13px' }}>No property chats yet.</div>
          ) : (
            chats.map((chat) => {
              const isSelected = chat.id === selectedChatId
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
                  }}
                >
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(201,168,76,0.5)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.property_listings?.title || 'Property'}
                  </p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff', margin: '0 0 2px' }}>
                    {chat.enquirer?.full_name || 'Enquirer'} &harr; {chat.partner?.full_name || 'Partner'}
                  </p>
                  {chat.last_message && (
                    <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

        {/* Messages (read-only) */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#000' }}>
          {!selectedChatId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Select a chat to monitor</p>
            </div>
          ) : chatLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Loading...</p>
            </div>
          ) : (
            <>
              {chatDetails && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#080808' }}>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(201,168,76,0.6)', margin: '0 0 4px' }}>{chatDetails.propertyTitle}</p>
                  <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: '#fff', margin: 0 }}>
                    {chatDetails.enquirerName} &harr; {chatDetails.partnerName}
                  </p>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isPartner = chatDetails && msg.sender_id !== chats.find(c => c.id === selectedChatId)?.enquirer_id
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isPartner ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          borderRadius: isPartner ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          background: isPartner ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isPartner ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: isPartner ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.3)', margin: '0 0 4px', fontWeight: 600 }}>
                            {isPartner ? 'Partner' : 'Enquirer'}
                          </p>
                          {msg.file_url && msg.file_name && (
                            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: '#c9a84c', margin: '0 0 4px' }}>[File: {msg.file_name}]</p>
                          )}
                          {msg.content && (
                            <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                          )}
                          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', textAlign: 'right' }}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#080808', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>Read-only monitoring mode</p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          div[style*="grid-template-columns: 360px 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
