import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logError } from '@/lib/logError'

/** GET /api/crm/lookup — staff (for assignee pickers) + sectors. */
export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  try {
    const [staff, sectors] = await Promise.all([
      access.supabase.from('profiles').select('id, full_name, role').in('role', ['super_admin', 'admin']).order('full_name'),
      access.supabase.from('sectors').select('id, name').eq('is_active', true).order('display_order'),
    ])
    return NextResponse.json({
      staff: (staff.data || []).map((s) => ({ id: s.id, name: s.full_name, role: s.role })),
      sectors: sectors.data || [],
    })
  } catch (err) {
    logError('api.crm.lookup.get', err)
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 })
  }
}
