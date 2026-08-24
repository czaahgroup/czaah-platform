import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'edge';

function createAuthClient(request: NextRequest) {
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

// Mints short-lived Cloudflare Realtime TURN credentials on demand, so the
// TURN_KEY_API_TOKEN itself never reaches the browser. Without a TURN relay,
// WebRTC calls between two different networks (e.g. office WiFi <-> mobile
// data) can't establish a connection at all — STUN alone isn't enough once
// NAT traversal gets involved, which is most real-world call pairs.
export async function GET(request: NextRequest) {
  try {
    // TEMP DIAGNOSTIC: auth check disabled to confirm this file is actually
    // reachable in the deployed build (vs. middleware masking a 404 as 401).
    void request
    return NextResponse.json({ marker: 'CANARY_9f3k2m_v2', hasTurnKeyId: !!process.env.CLOUDFLARE_TURN_KEY_ID, hasTurnApiToken: !!process.env.CLOUDFLARE_TURN_KEY_API_TOKEN })
    // eslint-disable-next-line no-unreachable
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
    const apiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN
    if (!keyId || !apiToken) {
      return NextResponse.json({ error: 'TURN service not configured' }, { status: 503 })
    }

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 3600 }),
      }
    )

    if (!res.ok) {
      console.error('Cloudflare TURN credential request failed:', res.status, await res.text())
      return NextResponse.json({ error: 'Failed to obtain TURN credentials' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ iceServers: data.iceServers })
  } catch (err) {
    console.error('GET /api/calls/turn-credentials error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
