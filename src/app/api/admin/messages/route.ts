import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'

export const runtime = 'edge'

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapReplyEmail(inner: string) {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL &middot; VENTURES &middot; INFRASTRUCTURE</p>
      </div>
      <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
        ${inner}
      </div>
      <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">
        &copy; 2026 CZAAH. All rights reserved.
      </p>
    </div>
  `
}

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

async function requireSuperAdmin(request: NextRequest) {
  const userClient = createAuthClient(request)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')

    let query = auth.supabase!
      .from('public_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (source) query = query.eq('source', source)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/admin/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { id, status } = await request.json()
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }
    if (!['new', 'read', 'replied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { error } = await auth.supabase!.from('public_messages').update({ status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/admin/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth.error) return auth.error

    const { id, replyContent } = await request.json()
    if (!id || !replyContent || !replyContent.trim()) {
      return NextResponse.json({ error: 'id and replyContent are required' }, { status: 400 })
    }

    const { data: msg, error: fetchError } = await auth.supabase!
      .from('public_messages')
      .select('name, email, message')
      .eq('id', id)
      .single()

    if (fetchError || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: msg.email,
      replyTo: 'info@czaah.com',
      subject: 'Re: Your enquiry to CZAAH',
      html: wrapReplyEmail(`
        <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0 0 20px 0;">Dear ${escapeHtml(msg.name)},</p>
        <p style="color: rgba(255,255,255,0.85); line-height: 1.6; white-space: pre-wrap; margin: 0 0 28px 0;">${escapeHtml(replyContent.trim())}</p>
        <div style="border-top: 1px solid #1A1A1A; padding-top: 16px;">
          <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 0 0 8px 0;">Your original message:</p>
          <p style="color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.5; white-space: pre-wrap; margin: 0;">${escapeHtml(msg.message)}</p>
        </div>
      `),
    })

    await auth.supabase!.from('public_messages').update({ status: 'replied' }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/admin/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
