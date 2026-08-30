import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * POST /api/crm/tasks/reminders
 *
 * Cron target (see .github/workflows/task-reminders.yml). Finds open tasks
 * whose reminder time has passed and that haven't been reminded, sends the
 * assignee an in-app notification, and stamps reminded_at so it fires once.
 *
 * Auth: a bearer token that matches CRON_SECRET (Worker secret).
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createAdminClient()
    const nowIso = new Date().toISOString()

    const { data: due, error } = await db
      .from('crm_tasks')
      .select('id, title, assignee_id, due_at, related_type, related_id')
      .eq('status', 'open')
      .is('reminded_at', null)
      .lte('reminder_at', nowIso)
      .limit(200)
    if (error) throw error
    if (!due?.length) return NextResponse.json({ reminded: 0 })

    const withAssignee = due.filter((t) => t.assignee_id)
    if (withAssignee.length) {
      await db.from('notifications').insert(
        withAssignee.map((t) => ({
          user_id: t.assignee_id,
          type: 'task_reminder',
          title: 'Task reminder',
          body: t.due_at
            ? `"${t.title}" is due ${new Date(t.due_at).toLocaleDateString()}.`
            : `Reminder: "${t.title}".`,
          link: '/admin/crm/tasks',
          is_read: false,
        }))
      )
    }

    await db.from('crm_tasks').update({ reminded_at: nowIso }).in('id', due.map((t) => t.id))

    return NextResponse.json({ reminded: withAssignee.length, scanned: due.length })
  } catch (err) {
    logError('api.crm.tasks.reminders', err)
    return NextResponse.json({ error: 'Reminder run failed.' }, { status: 500 })
  }
}
