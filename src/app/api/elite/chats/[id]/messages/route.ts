import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'edge';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30 per minute per user
    const { success: rateLimitOk } = rateLimit(`elite-chat:${user.id}`, 30, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const supabase = createAdminClient()

    // Get chat and verify participation
    const { data: chat, error: chatError } = await supabase
      .from('direct_chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Verify user is participant or super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const isParticipant = chat.elite_member_id === user.id || chat.admin_id === user.id
    const isSuperAdmin = profile?.role === 'super_admin'

    if (!isParticipant && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { content, fileData, fileName } = body

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileData && Buffer.from(fileData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
    }

    if (!content && !fileData) {
      return NextResponse.json({ error: 'content or fileData is required' }, { status: 400 })
    }

    let fileUrl: string | null = null
    let savedFileName: string | null = null

    // Handle file upload
    if (fileData && fileName) {
      const buffer = Buffer.from(fileData, 'base64')
      const filePath = `direct-chats/${chatId}/${Date.now()}-${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('platform-files')
        .upload(filePath, buffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json({ error: 'File upload failed: ' + uploadError.message }, { status: 500 })
      }

      fileUrl = filePath
      savedFileName = fileName
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('direct_messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content || null,
        file_url: fileUrl,
        file_name: savedFileName,
        is_read: false,
      })
      .select()
      .single()

    if (insertError || !message) {
      return NextResponse.json({ error: insertError?.message || 'Failed to send message' }, { status: 500 })
    }

    // Update chat last_message_at
    await supabase
      .from('direct_chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId)

    // Create notification for the other party
    const recipientId = user.id === chat.elite_member_id ? chat.admin_id : chat.elite_member_id
    const senderName = profile?.full_name || 'Someone'

    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'direct_message',
      title: 'New Direct Message',
      body: `${senderName}: ${content ? (content.length > 80 ? content.substring(0, 80) + '...' : content) : 'Sent a file'}`,
      link: `/dashboard/live-chat/${chatId}`,
      is_read: false,
    })

    // Send email notification to recipient
    try {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', recipientId)
        .single()

      if (recipientProfile?.email) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipientProfile.email,
          subject: `New message from ${senderName}`,
          html: `
            <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
                <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL &middot; VENTURES &middot; INFRASTRUCTURE</p>
              </div>
              <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
                <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">New Direct Message</h2>
                <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
                  Hi ${recipientProfile.full_name || 'there'},
                </p>
                <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
                  ${senderName} sent you a new direct message.
                </p>
                ${content ? `
                <div style="background: rgba(255,255,255,0.03); border-left: 3px solid #C9A84C; padding: 12px 16px; margin: 0 0 24px 0; border-radius: 0 4px 4px 0;">
                  <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0; font-style: italic;">
                    "${content.length > 150 ? content.substring(0, 150) + '...' : content}"
                  </p>
                </div>
                ` : ''}
                <a href="https://czaah.com/dashboard/live-chat" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Open Live Chat &rarr;
                </a>
              </div>
              <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">
                &copy; 2026 CZAAH. All rights reserved.
              </p>
            </div>
          `,
        })
      }
    } catch (emailErr) {
      console.error('Failed to send elite chat email notification:', emailErr)
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (err) {
    console.error('POST /api/elite/chats/[id]/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
