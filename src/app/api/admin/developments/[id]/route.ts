import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import {
  DEVELOPMENT_COLUMNS,
  UNIT_COLUMNS,
  persistImages,
  loadPlansForUnits,
  uniqueSlug,
} from '@/lib/developments'
import { slugify } from '@/lib/plots'

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const { id } = await params

    const { data: development, error } = await supabase
      .from('developments')
      .select(`${DEVELOPMENT_COLUMNS}, development_units(${UNIT_COLUMNS})`)
      .eq('id', id)
      .single()

    if (error || !development) {
      return NextResponse.json({ error: 'Development not found' }, { status: 404 })
    }

    const units = (development.development_units || []) as { id: string }[]
    const plans = await loadPlansForUnits(supabase, units.map((u) => u.id))

    return NextResponse.json({ data: { ...development, payment_plans: plans } })
  } catch (err) {
    logError('api.admin.developments.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const { id } = await params

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Only fields actually present in the payload are written, so a partial
    // save from one admin tab cannot blank out fields owned by another.
    const text = (key: string, column: string) => {
      if (body[key] !== undefined) updates[column] = body[key] || null
    }
    const bool = (key: string, column: string) => {
      if (body[key] !== undefined) updates[column] = !!body[key]
    }

    text('name', 'name')
    text('developerName', 'developer_name')
    text('marketingAgent', 'marketing_agent')
    text('description', 'description')
    text('country', 'country')
    text('provinceState', 'province_state')
    text('city', 'city')
    text('area', 'area')
    text('address', 'address')
    text('approvalStatus', 'approval_status')
    text('approvalAuthority', 'approval_authority')
    text('developmentStatus', 'development_status')
    text('possessionStatus', 'possession_status')
    text('currency', 'currency')
    text('status', 'status')
    text('agentId', 'agent_id')
    bool('featured', 'featured')
    bool('verified', 'verified')

    if (body.latitude !== undefined) updates.latitude = num(body.latitude)
    if (body.longitude !== undefined) updates.longitude = num(body.longitude)

    if (body.features !== undefined) {
      updates.features = Array.isArray(body.features)
        ? body.features
        : String(body.features || '').split(',').map((f: string) => f.trim()).filter(Boolean)
    }

    // A rename changes the public URL, so the slug is only regenerated when
    // asked for explicitly — existing links keep working otherwise.
    if (body.slug !== undefined) {
      updates.slug = await uniqueSlug(supabase, slugify(String(body.slug)), id)
    }

    const slugForStorage = (updates.slug as string) || id
    if (body.gallery !== undefined) {
      updates.gallery = await persistImages(supabase, body.gallery, `developments/${slugForStorage}`)
    }
    if (body.featuredImage !== undefined) {
      const stored = await persistImages(supabase, body.featuredImage ? [body.featuredImage] : [], `developments/${slugForStorage}`)
      updates.featured_image = stored[0] || null
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('developments')
      .update(updates)
      .eq('id', id)
      .select(DEVELOPMENT_COLUMNS)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not update development' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logError('api.admin.developments.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase } = auth
    const { id } = await params

    // Units, their payment plans and instalments cascade from the FK.
    // Listings that merely reference the development are left in place with a
    // null development_id rather than being deleted with it.
    const { error } = await supabase.from('developments').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('api.admin.developments.id', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
