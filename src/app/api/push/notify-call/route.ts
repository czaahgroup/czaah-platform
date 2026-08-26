import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushBatch } from '@mmmike/web-push/send'

function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

// Fired (best-effort, fire-and-forget from the client) alongside the normal
// Realtime call-request broadcast, so the callee is reached even if they
// don't have the app open in a focused tab right now. The Realtime broadcast
// alone only reaches an already-open, already-subscribed browser tab.
export async function POST(request: NextRequest) {
  try {
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, callerName, callType } = await request.json()
    if (!targetUserId || !callerName) {
      return NextResponse.json({ error: 'targetUserId and callerName are required' }, { status: 400 })
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      // Push isn't configured — not an error, just nothing to do.
      return NextResponse.json({ sent: 0 })
    }

    const supabase = createAdminClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', targetUserId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const label = callType === 'video' ? 'video call' : 'call'
    const subscriptions = subs.map((s) => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    }))

    const result = await sendPushBatch(
      subscriptions,
      { title: `Incoming ${label}`, body: `${callerName} is calling you`, tag: 'czaah-incoming-call' },
      { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject }
    )

    if (result.gone.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', result.gone)
    }

    return NextResponse.json({ sent: result.delivered })
  } catch (err) {
    console.error('POST /api/push/notify-call error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
