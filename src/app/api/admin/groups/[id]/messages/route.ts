import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'


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

    const { id: groupId } = await params
    const supabase = createAdminClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('group_chat_members')
      .select('id')
      .eq('chat_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
    }

    const body = await request.json()
    const { content, fileData, fileName } = body

    let fileUrl: string | null = null
    let storedFileName: string | null = null

    // Handle file upload
    if (fileData && fileName) {
      const buffer = Buffer.from(fileData, 'base64')
      const ext = fileName.split('.').pop() || 'bin'
      const storagePath = `group-chats/${groupId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

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
      .from('group_messages')
      .insert({
        chat_id: groupId,
        sender_id: user.id,
        content: content || null,
        file_url: fileUrl,
        file_name: storedFileName,
        is_read_by: [user.id],
      })
      .select()
      .single()

    if (msgError) {
      console.error('Failed to send group message:', msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Update last_message_at on group
    await supabase
      .from('group_chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', groupId)

    return NextResponse.json({ data: message })
  } catch (err) {
    console.error('POST /api/admin/groups/[id]/messages error:', err)
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
