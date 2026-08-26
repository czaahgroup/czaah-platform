import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin' && profile?.role !== 'admin') return null
  return { user, adminClient }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { fileName, fileData, documentType } = await request.json()

    if (!fileName || !fileData) {
      return NextResponse.json({ error: 'fileName and fileData required' }, { status: 400 })
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (Buffer.from(fileData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(fileData, 'base64')
    const filePath = `investments/${id}/${Date.now()}-${fileName}`

    const { error: uploadError } = await auth.adminClient.storage
      .from('platform-files')
      .upload(filePath, buffer, {
        contentType: fileName.endsWith('.pdf') ? 'application/pdf'
          : fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Create document record
    const { data, error } = await auth.adminClient
      .from('investment_documents')
      .insert({
        opportunity_id: id,
        document_type: documentType || 'other',
        file_url: filePath,
        file_name: fileName,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Investment document upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await params // consume params
    const docId = request.nextUrl.searchParams.get('docId')
    if (!docId) {
      return NextResponse.json({ error: 'docId required' }, { status: 400 })
    }

    // Get the document to find the file path
    const { data: doc } = await auth.adminClient
      .from('investment_documents')
      .select('file_url')
      .eq('id', docId)
      .single()

    if (doc?.file_url) {
      // Delete from storage
      await auth.adminClient.storage
        .from('platform-files')
        .remove([doc.file_url])
    }

    // Delete record
    const { error } = await auth.adminClient
      .from('investment_documents')
      .delete()
      .eq('id', docId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Investment document delete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
