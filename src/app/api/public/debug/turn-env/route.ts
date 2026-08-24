import { NextResponse } from 'next/server'

export const runtime = 'edge';

// Temporary, no-auth diagnostic — reveals only presence/absence of the TURN
// env vars (never their values), to confirm whether they actually reach the
// deployed Edge Function's process.env. Remove once calling is confirmed
// working end-to-end.
export async function GET() {
  return NextResponse.json({
    hasTurnKeyId: !!process.env.CLOUDFLARE_TURN_KEY_ID,
    hasTurnApiToken: !!process.env.CLOUDFLARE_TURN_KEY_API_TOKEN,
    turnKeyIdLength: process.env.CLOUDFLARE_TURN_KEY_ID?.length || 0,
  })
}
