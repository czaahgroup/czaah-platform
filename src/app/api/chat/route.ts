import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30 per minute per user
    const { success: rateLimitOk } = rateLimit(`chat:${user.id}`, 30, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const {
      enquiry_id: enquiryId,
      content,
      message_type: messageType = 'text',
      fileData,
      fileName,
    } = body

    if (!enquiryId || (!content && messageType !== 'file')) {
      return NextResponse.json(
        { error: 'enquiryId and content are required' },
        { status: 400 }
      )
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileData && Buffer.from(fileData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
    }

    if (messageType === 'file' && (!fileData || !fileName)) {
      return NextResponse.json(
        { error: 'fileData and fileName are required for file messages' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch enquiry
    const { data: enquiry, error: enquiryError } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', enquiryId)
      .single()

    if (enquiryError || !enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
    }

    // Verify access
    if (profile.role === 'member' && enquiry.member_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (profile.role === 'admin' && enquiry.assigned_admin_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only admin/super_admin can send internal notes
    const isInternalNote = messageType === 'internal_note'
    if (isInternalNote && profile.role === 'member') {
      return NextResponse.json(
        { error: 'Members cannot send internal notes' },
        { status: 403 }
      )
    }

    // Handle file upload
    let fileUrl: string | null = null
    let storedFileName: string | null = null
    if (messageType === 'file' || (fileData && fileName)) {
      const buffer = Buffer.from(fileData, 'base64')
      const filePath = `chat/${enquiryId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('platform-files')
        .upload(filePath, buffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json(
          { error: `File upload failed: ${uploadError.message}` },
          { status: 500 }
        )
      }

      fileUrl = filePath
      storedFileName = fileName
    }

    // Determine the actual message_type for DB
    const dbMessageType = isInternalNote ? 'internal_note' : messageType === 'file' ? 'file' : 'text'

    // Insert chat message
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        enquiry_id: enquiryId,
        sender_id: user.id,
        message_type: dbMessageType,
        content: content || null,
        file_url: fileUrl,
        file_name: storedFileName,
        is_internal_note: isInternalNote,
        is_read: false,
      })
      .select('*, profiles!chat_messages_sender_id_fkey(full_name, role)')
      .single()

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Flatten profiles for chat UI
    const msgProfiles = (message as Record<string, unknown>).profiles as { full_name: string; role: string } | null
    const flatMessage = {
      ...message,
      sender_name: msgProfiles?.full_name || 'Unknown',
      sender_role: msgProfiles?.role || 'member',
      profiles: undefined,
    }

    // Update enquiry status to 'active' if it was 'assigned'
    if (enquiry.status === 'assigned') {
      await supabase
        .from('enquiries')
        .update({ status: 'active' })
        .eq('id', enquiryId)
    }

    // Create notifications
    if (isInternalNote) {
      // Internal note from super_admin -> notify only the assigned admin
      if (profile.role === 'super_admin' && enquiry.assigned_admin_id) {
        await supabase.from('notifications').insert({
          user_id: enquiry.assigned_admin_id,
          type: 'new_message',
          title: 'Internal Note',
          body: `New internal note on enquiry ${enquiry.reference_number}.`,
          link: `/admin/enquiries/${enquiryId}`,
          is_read: false,
        })
      }
      // Internal note from admin -> notify super_admins
      if (profile.role === 'admin') {
        const { data: superAdmins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'super_admin')

        if (superAdmins && superAdmins.length > 0) {
          const notifications = superAdmins.map((sa) => ({
            user_id: sa.id,
            type: 'new_message' as const,
            title: 'Internal Note',
            body: `New internal note on enquiry ${enquiry.reference_number}.`,
            link: `/admin/enquiries/${enquiryId}`,
            is_read: false,
          }))
          await supabase.from('notifications').insert(notifications)
        }
      }
    } else {
      // Regular message — notify the other party
      if (profile.role === 'member') {
        // Notify assigned admin
        if (enquiry.assigned_admin_id) {
          await supabase.from('notifications').insert({
            user_id: enquiry.assigned_admin_id,
            type: 'new_message',
            title: 'New Message',
            body: `${profile.full_name} sent a message on enquiry ${enquiry.reference_number}.`,
            link: `/admin/enquiries/${enquiryId}`,
            is_read: false,
          })
        }
      } else {
        // Admin or super_admin sending — notify the member
        await supabase.from('notifications').insert({
          user_id: enquiry.member_id,
          type: 'new_message',
          title: 'New Message',
          body: `You have a new message on enquiry ${enquiry.reference_number}.`,
          link: `/portal/enquiries/${enquiryId}`,
          is_read: false,
        })
      }
    }

    // Send email notification for text messages (not system or internal notes)
    if (dbMessageType === 'text') {
      try {
        let recipientEmail: string | null = null
        let recipientName: string | null = null

        if (profile.role === 'member') {
          // Notify assigned admin via email
          if (enquiry.assigned_admin_id) {
            const { data: adminProfile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', enquiry.assigned_admin_id)
              .single()
            recipientEmail = adminProfile?.email || null
            recipientName = adminProfile?.full_name || null
          }
        } else {
          // Admin/super_admin sending — notify the member via email
          const { data: memberProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', enquiry.member_id)
            .single()
          recipientEmail = memberProfile?.email || null
          recipientName = memberProfile?.full_name || null
        }

        if (recipientEmail) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: recipientEmail,
            subject: `New message on enquiry ${enquiry.reference_number}`,
            html: `
              <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
                  <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL &middot; VENTURES &middot; INFRASTRUCTURE</p>
                </div>
                <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
                  <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">New Message</h2>
                  <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
                    Hi ${recipientName || 'there'},
                  </p>
                  <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
                    ${profile.full_name} sent a new message on enquiry <strong style="color: #C9A84C;">${enquiry.reference_number}</strong>.
                  </p>
                  <div style="background: rgba(255,255,255,0.03); border-left: 3px solid #C9A84C; padding: 12px 16px; margin: 0 0 24px 0; border-radius: 0 4px 4px 0;">
                    <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0; font-style: italic;">
                      "${content && content.length > 150 ? content.substring(0, 150) + '...' : content}"
                    </p>
                  </div>
                  <a href="https://czaah.com/dashboard/enquiries/${enquiryId}" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
                    View Conversation &rarr;
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
        console.error('Failed to send chat email notification:', emailErr)
      }
    }

    return NextResponse.json({ data: flatMessage }, { status: 201 })
  } catch (err) {
    console.error('POST /api/chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
