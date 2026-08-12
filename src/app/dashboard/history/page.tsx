'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ActivityItem { id: string; type: 'enquiry_created' | 'status_change' | 'message_sent'; title: string; description: string; timestamp: string; enquiry_id?: string; reference_number?: string }

export default function HistoryPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const items: ActivityItem[] = []
      const { data: enquiries } = await supabase.from('enquiries').select('id, reference_number, product_name, status, created_at, updated_at').eq('member_id', user.id).order('created_at', { ascending: false })
      if (enquiries) {
        for (const enq of enquiries) {
          items.push({ id: `enq-created-${enq.id}`, type: 'enquiry_created', title: 'Enquiry Created', description: `${enq.product_name || 'General Enquiry'} (${enq.reference_number})`, timestamp: enq.created_at, enquiry_id: enq.id, reference_number: enq.reference_number })
          const created = new Date(enq.created_at).getTime(); const updated = new Date(enq.updated_at).getTime()
          if (updated - created > 60000) { items.push({ id: `enq-status-${enq.id}`, type: 'status_change', title: 'Status Updated', description: `${enq.product_name || 'General Enquiry'} is now "${enq.status}"`, timestamp: enq.updated_at, enquiry_id: enq.id, reference_number: enq.reference_number }) }
        }
      }
      const { data: messages } = await supabase.from('chat_messages').select('id, content, created_at, enquiry_id').eq('sender_id', user.id).eq('is_internal_note', false).order('created_at', { ascending: false }).limit(50)
      if (messages) {
        const enquiryIds = [...new Set(messages.map(m => m.enquiry_id).filter(Boolean))]
        let enqMap: Record<string, string> = {}
        if (enquiryIds.length > 0 && enquiries) {
          enqMap = Object.fromEntries(enquiries.map(e => [e.id, e.reference_number]))
          const missing = enquiryIds.filter(id => !enqMap[id])
          if (missing.length > 0) { const { data: extra } = await supabase.from('enquiries').select('id, reference_number').in('id', missing); if (extra) { for (const e of extra) enqMap[e.id] = e.reference_number } }
        }
        for (const msg of messages) {
          const ref = msg.enquiry_id ? enqMap[msg.enquiry_id] : null
          items.push({ id: `msg-${msg.id}`, type: 'message_sent', title: 'Message Sent', description: ref ? `In enquiry ${ref}: "${(msg.content || '').slice(0, 80)}${(msg.content || '').length > 80 ? '...' : ''}"` : `"${(msg.content || '').slice(0, 80)}${(msg.content || '').length > 80 ? '...' : ''}"`, timestamp: msg.created_at, enquiry_id: msg.enquiry_id, reference_number: ref || undefined })
        }
      }
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setActivities(items)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const typeIcons: Record<string, { color: string; label: string; icon: string }> = {
    enquiry_created: { color: 'bg-green-500', label: 'New', icon: 'add_circle' },
    status_change: { color: 'bg-tertiary', label: 'Update', icon: 'sync' },
    message_sent: { color: 'bg-primary', label: 'Chat', icon: 'chat' },
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="raleway-text text-on-surface-variant/50">Loading...</div></div>

  return (
    <>
      <div className="mb-6"><h1 className="cinzel-text text-2xl text-on-surface">Activity History</h1></div>
      <div className="bg-surface-container-low border border-outline-variant/10">
        {activities.length === 0 ? (
          <div className="px-6 py-16 text-center"><p className="text-on-surface-variant/50 raleway-text">No activity yet.</p></div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {activities.map((activity) => {
              const badge = typeIcons[activity.type] || { color: 'bg-on-surface-variant', label: '?', icon: 'circle' }
              return (
                <div key={activity.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <div className={`w-2.5 h-2.5 ${badge.color} shrink-0`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-on-surface raleway-text">{activity.title}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-surface-container text-on-surface-variant/40 raleway-text">{badge.label}</span>
                        </div>
                        <span className="text-xs text-on-surface-variant/40 shrink-0 raleway-text">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant/50 mt-1 truncate raleway-text">{activity.description}</p>
                      {activity.enquiry_id && <Link href={`/dashboard/enquiries/${activity.enquiry_id}`} className="text-xs text-primary hover:underline mt-1 inline-block no-underline raleway-text">View Enquiry &rarr;</Link>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function formatTimestamp(ts: string) {
  const date = new Date(ts); const now = new Date(); const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000); const diffHours = Math.floor(diffMs / 3600000); const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`; if (diffHours < 24) return `${diffHours}h ago`; if (diffDays < 7) return `${diffDays}d ago`; return date.toLocaleDateString()
}
