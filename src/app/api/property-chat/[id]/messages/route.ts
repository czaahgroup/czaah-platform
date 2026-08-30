import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'


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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params
    const userClient = createAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30 per minute
    const { success: rateLimitOk } = rateLimit(`prop-msg:${user.id}`, 30, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429 })
    }

    const supabase = createAdminClient()

    // Verify user is a participant in this chat
    const { data: chat } = await supabase
      .from('property_chats')
      .select('enquirer_id, partner_id')
      .eq('id', chatId)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    if (chat.enquirer_id !== user.id && chat.partner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { content, fileName, fileData } = body

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileData && Buffer.from(fileData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
    }

    if (!content && !fileData) {
      return NextResponse.json({ error: 'Message content or file is required' }, { status: 400 })
    }

    let fileUrl: string | null = null
    let storedFileName: string | null = fileName || null

    // Upload file if provided
    if (fileData && fileName) {
      const buffer = Buffer.from(fileData, 'base64')
      const filePath = `property-chats/${chatId}/${Date.now()}_${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('platform-files')
        .upload(filePath, buffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        console.error('File upload error:', uploadError.message)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
      }

      fileUrl = filePath
    }

    const { data: message, error: msgError } = await supabase
      .from('property_messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content || null,
        file_url: fileUrl,
        file_name: storedFileName,
      })
      .select()
      .single()

    if (msgError || !message) {
      return NextResponse.json({ error: msgError?.message || 'Failed to send message' }, { status: 500 })
    }

    // Update last_message_at on chat
    await supabase
      .from('property_chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId)

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (err) {
    logError("api.property-chat.id.messages", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
