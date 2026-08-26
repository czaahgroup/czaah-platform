import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const adminClient = createAdminClient()

    // Fetch the sector by slug
    const { data: sector, error: sectorError } = await adminClient
      .from('sectors')
      .select('id, name, slug, description, icon_url, image_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (sectorError || !sector) {
      return NextResponse.json({ error: 'Sector not found' }, { status: 404 })
    }

    // Fetch active products for this sector
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select('id, name, slug, description, image_url, is_enquiry_enabled')
      .eq('sector_id', sector.id)
      .eq('is_active', true)
      .order('display_order')

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    return NextResponse.json({ ...sector, products: products || [] })
  } catch (err) {
    console.error('GET /api/public/sectors/[slug] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
