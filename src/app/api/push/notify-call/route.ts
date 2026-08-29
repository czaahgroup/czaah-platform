import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/serverPush'


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

    const supabase = createAdminClient()
    const label = callType === 'video' ? 'video call' : 'call'

    const result = await sendPushToUser(supabase, targetUserId, {
      title: `Incoming ${label}`,
      body: `${callerName} is calling you`,
      tag: 'czaah-incoming-call',
    })

    return NextResponse.json({ sent: result.sent })
  } catch (err) {
    console.error('POST /api/push/notify-call error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
