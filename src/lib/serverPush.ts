import { sendPushBatch } from '@mmmike/web-push/send'
import type { SupabaseClient } from '@supabase/supabase-js'

interface PushPayload {
  title: string
  body: string
  tag: string
}

// Sends a web push notification to every subscribed device for one user,
// pruning subscriptions the push service reports as gone. No-ops quietly
// if VAPID isn't configured or the user has no subscriptions -- callers
// should treat push as best-effort, not a delivery guarantee.
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number }> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return { sent: 0 }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return { sent: 0 }

  const subscriptions = subs.map((s) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
  }))

  const result = await sendPushBatch(subscriptions, payload, {
    publicKey: vapidPublicKey,
    privateKey: vapidPrivateKey,
    subject: vapidSubject,
  })

  if (result.gone.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', result.gone)
  }

  return { sent: result.delivered }
}
