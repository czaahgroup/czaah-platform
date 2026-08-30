import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { logError } from '@/lib/logError'


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
    const userClient = getAuthClient(request)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 30 per minute per user
    const { success: rateLimitOk } = rateLimit(`admin-msg:${user.id}`, 30, 60000)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { id: chatId } = await params
    const supabase = createAdminClient()

    // Verify user is participant
    const { data: chat } = await supabase
      .from('admin_chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    if (chat.user_a_id !== user.id && chat.user_b_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { content, fileData, fileName } = body

    let fileUrl: string | null = null
    let storedFileName: string | null = null

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileData && Buffer.from(fileData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
    }

    // Handle file upload
    if (fileData && fileName) {
      const buffer = Buffer.from(fileData, 'base64')
      const ext = fileName.split('.').pop() || 'bin'
      const storagePath = `admin-chats/${chatId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('platform-files')
        .upload(storagePath, buffer, {
          contentType: getContentType(ext),
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
      }

      fileUrl = storagePath
      storedFileName = fileName
    }

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Message content or file required' }, { status: 400 })
    }

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from('admin_messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content || null,
        file_url: fileUrl,
        file_name: storedFileName,
      })
      .select()
      .single()

    if (msgError) {
      console.error('Failed to send message:', msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Update last_message_at on chat
    await supabase
      .from('admin_chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId)

    return NextResponse.json({ data: message })
  } catch (err) {
    logError("api.admin.contacts.id.messages", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    txt: 'text/plain',
  }
  return types[ext.toLowerCase()] || 'application/octet-stream'
}
