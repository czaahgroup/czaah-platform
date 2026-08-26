import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('services')
      .select('id, name, slug, description, icon_url, image_url')
      .eq('is_active', true)
      .order('display_order')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('GET /api/public/services error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
