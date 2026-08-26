import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

// web-push pulls in https-proxy-agent, which uses Node's raw net/http/https
// modules -- Next.js's edge runtime bundler rejects those at build time
// regardless of Cloudflare's nodejs_compat flag (that's a Next.js-level
// restriction, not a Workers one). @opennextjs/cloudflare is built to run
// standard Node-runtime routes on Workers via nodejs_compat, so this one
// route uses the Node.js runtime instead of edge like the rest of the app.

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
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const supabase = createAdminClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const label = callType === 'video' ? 'video call' : 'call'
    const payload = JSON.stringify({
      title: `Incoming ${label}`,
      body: `${callerName} is calling you`,
      callType: callType || 'voice',
      callerName,
    })

    let sent = 0
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent += 1
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode
          if (status === 404 || status === 410) {
            // Subscription is dead (unsubscribed, expired, browser data cleared) — clean it up.
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.warn('[push] Failed to send to one subscription:', err)
          }
        }
      })
    )

    return NextResponse.json({ sent })
  } catch (err) {
    console.error('POST /api/push/notify-call error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
