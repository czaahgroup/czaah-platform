import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

const OBJECTS = ['contact', 'company', 'enquiry', 'partner_opportunity', 'investment_opportunity', 'mail_thread', 'deal']

/**
 * GET /api/crm/timeline?type=contact&id=<uuid>
 *
 * Merges, chronologically: activity-log events, notes, tasks, and (for a
 * contact) mail threads linked via crm_links — into one feed.
 */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const type = request.nextUrl.searchParams.get('type')
    const id = request.nextUrl.searchParams.get('id')
    if (!type || !OBJECTS.includes(type) || !id) {
      return NextResponse.json({ error: 'type and id are required.' }, { status: 400 })
    }
    const sb = access.supabase

    const [audit, notes, tasks, links] = await Promise.all([
      sb.from('audit_log')
        .select('id, action, metadata, created_at, actor:profiles!audit_log_actor_id_fkey(id, full_name)')
        .eq('target_type', type)
        .eq('target_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
      sb.from('crm_notes')
        .select('id, body, pinned, created_at, author:profiles!crm_notes_author_id_fkey(id, full_name)')
        .eq('related_type', type)
        .eq('related_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
      sb.from('crm_tasks')
        .select('id, title, status, due_at, completed_at, created_at, assignee:profiles!crm_tasks_assignee_id_fkey(id, full_name)')
        .eq('related_type', type)
        .eq('related_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
      type === 'contact'
        ? sb.from('crm_links').select('source_type, source_id, created_at').eq('contact_id', id).eq('source_type', 'mail_thread')
        : Promise.resolve({ data: [] as { source_id: string; created_at: string }[] }),
    ])

    let threads: { id: string; subject: string; last_message_at: string; created_at: string }[] = []
    const threadIds = (links.data || []).map((l: { source_id: string }) => l.source_id)
    if (threadIds.length) {
      const { data } = await sb.from('mailbox_threads').select('id, subject, last_message_at, created_at').in('id', threadIds)
      threads = data || []
    }

    const feed = [
      ...(audit.data || []).map((a) => ({
        kind: 'event' as const, id: a.id, at: a.created_at,
        action: a.action, actor: a.actor?.full_name || 'System', metadata: a.metadata,
      })),
      ...(notes.data || []).map((n) => ({
        kind: 'note' as const, id: n.id, at: n.created_at,
        body: n.body, pinned: n.pinned, author: n.author?.full_name || 'Unknown',
      })),
      ...(tasks.data || []).map((t) => ({
        kind: 'task' as const, id: t.id, at: t.completed_at || t.created_at,
        title: t.title, status: t.status, dueAt: t.due_at, assignee: t.assignee?.full_name || null,
      })),
      ...threads.map((th) => ({
        kind: 'thread' as const, id: th.id, at: th.last_message_at || th.created_at,
        subject: th.subject,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    return NextResponse.json({ data: feed })
  } catch (err) {
    logError('api.crm.timeline.get', err)
    return NextResponse.json({ error: 'Could not load the timeline.' }, { status: 500 })
  }
}
