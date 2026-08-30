/**
 * Activity log — the single write path for the CRM activity timeline.
 *
 * Writes to `audit_log` (actor / action / target / metadata). MUST use the
 * service-role client: audit_log INSERT is admin-only under RLS, and this
 * runs for partner and member actions too.
 *
 * `action` is a dotted verb: '<object>.<past-tense>' — e.g. 'contact.created',
 * 'task.completed', 'note.added', 'enquiry.assigned', 'opportunity.stage_changed'.
 *
 * Usage (in a service-role API route, after the mutation succeeds):
 *   await logActivity({
 *     actorId: user.id,
 *     action: 'enquiry.assigned',
 *     targetType: 'enquiry', targetId: enquiryId,
 *     metadata: { to: adminId },
 *   })
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

export type ActivityTarget =
  | 'contact'
  | 'company'
  | 'enquiry'
  | 'partner_opportunity'
  | 'investment_opportunity'
  | 'mail_thread'
  | 'task'
  | 'note'
  | 'profile'
  | 'partner'

export interface ActivityInput {
  actorId: string | null
  action: string
  targetType?: ActivityTarget
  targetId?: string | null
  metadata?: Record<string, unknown>
}

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase.from('audit_log').insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    })

    // Keep crm_contacts.last_activity_at fresh so the CRM list can sort by it.
    if (input.targetType === 'contact' && input.targetId) {
      await supabase
        .from('crm_contacts')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', input.targetId)
    }
  } catch (e) {
    // Never let an activity-log failure break the request it's logging.
    logError('activity.log', e, { action: input.action })
  }
}
