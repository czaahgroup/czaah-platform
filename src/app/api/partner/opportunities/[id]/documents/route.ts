import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner, userId } = auth
    const { id: opportunityId } = await params

    const { data: opportunity } = await supabase!
      .from('partner_opportunities')
      .select('id, status')
      .eq('id', opportunityId)
      .eq('partner_id', partner!.id)
      .single()

    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const body = await request.json()
    const { fileName, fileData } = body
    if (!fileName || !fileData) {
      return NextResponse.json({ error: 'fileName and fileData are required' }, { status: 400 })
    }

    const buffer = Buffer.from(fileData, 'base64')
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 10MB limit' }, { status: 400 })
    }

    const filePath = `${partner!.id}/${opportunityId}/${Date.now()}-${fileName}`
    const ext = fileName.split('.').pop()?.toLowerCase()
    const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg'

    const { error: uploadError } = await supabase!.storage
      .from('partner-documents')
      .upload(filePath, buffer, { upsert: false, contentType })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: doc, error: docError } = await supabase!
      .from('partner_opportunity_documents')
      .insert({ opportunity_id: opportunityId, file_path: filePath, file_name: fileName, uploaded_by: userId })
      .select()
      .single()

    if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

    return NextResponse.json({ success: true, data: doc })
  } catch (err) {
    console.error('POST /api/partner/opportunities/[id]/documents error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
