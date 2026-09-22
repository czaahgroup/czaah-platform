import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { logError } from '@/lib/logError'
import {
  loadPortalContent,
  validateSection,
  PORTAL_CONTENT_KEYS,
  PORTAL_DEFAULTS,
  type PortalContentKey,
} from '@/lib/portalContent'

/** Current content, merged over the defaults, plus the defaults themselves. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error

    const data = await loadPortalContent()
    const { data: rows } = await auth.supabase
      .from('portal_content')
      .select('key, updated_at')

    return NextResponse.json({
      data,
      // So the editor can show what "reset to default" would restore, and
      // which sections have been customised at all.
      defaults: PORTAL_DEFAULTS,
      customised: (rows || []).map((r) => r.key),
      updatedAt: Object.fromEntries((rows || []).map((r) => [r.key, r.updated_at])),
    })
  } catch (err) {
    logError('api.admin.portalContent', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Saves one section. Sending null resets it to the shipped default. */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.error) return auth.error
    const { supabase, userId } = auth

    const { key, data } = await request.json()
    if (!PORTAL_CONTENT_KEYS.includes(key as PortalContentKey)) {
      return NextResponse.json({ error: `Unknown section "${key}".` }, { status: 400 })
    }

    // Reset: drop the row and the default applies again.
    if (data === null) {
      const { error } = await supabase.from('portal_content').delete().eq('key', key)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, reset: true })
    }

    const problems = validateSection(key as PortalContentKey, data)
    if (problems.length) {
      return NextResponse.json({ error: problems.join(' ') }, { status: 400 })
    }

    const { error } = await supabase
      .from('portal_content')
      .upsert({ key, data, updated_by: userId }, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('api.admin.portalContent', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
