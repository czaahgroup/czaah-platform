import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

function getAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify deal belongs to user
    const { data: deal } = await adminClient
      .from('investment_opportunities')
      .select('id, submitted_by')
      .eq('id', dealId)
      .eq('submitted_by', user.id)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const body = await request.json()
    const { fileName, fileData, documentType } = body

    if (!fileName || !fileData) {
      return NextResponse.json({ error: 'fileName and fileData are required' }, { status: 400 })
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (Buffer.from(fileData, 'base64').length > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
    }

    // Decode base64 and upload to Supabase Storage
    const buffer = Buffer.from(fileData, 'base64')
    const timestamp = Date.now()
    const storagePath = `partner-deals/${dealId}/${timestamp}-${fileName}`

    const { error: uploadError } = await adminClient.storage
      .from('platform-files')
      .upload(storagePath, buffer, {
        contentType: getContentType(fileName),
        upsert: false,
      })

    if (uploadError) {
      console.error('File upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Insert document record
    const { data: doc, error: docError } = await adminClient
      .from('investment_documents')
      .insert({
        investment_id: dealId,
        document_type: documentType || 'other',
        file_url: storagePath,
        file_name: fileName,
        storage_path: storagePath,
        uploaded_by: user.id,
      })
      .select('id, document_type, file_url, file_name, uploaded_at')
      .single()

    if (docError) {
      console.error('Document record error:', docError)
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    console.error('Partner document upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const supabase = getAuthClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'investment_partner' && profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify deal belongs to user
    const { data: deal } = await adminClient
      .from('investment_opportunities')
      .select('id, submitted_by')
      .eq('id', dealId)
      .eq('submitted_by', user.id)
      .single()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const docId = request.nextUrl.searchParams.get('docId')
    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 })
    }

    // Get document to find storage path
    const { data: doc } = await adminClient
      .from('investment_documents')
      .select('id, storage_path')
      .eq('id', docId)
      .eq('investment_id', dealId)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from storage
    if (doc.storage_path) {
      await adminClient.storage
        .from('platform-files')
        .remove([doc.storage_path])
    }

    // Delete record
    const { error } = await adminClient
      .from('investment_documents')
      .delete()
      .eq('id', docId)

    if (error) {
      console.error('Document delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Partner document delete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return types[ext || ''] || 'application/octet-stream'
}
