import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


// Public listing of partner-submitted opportunities for the /investments page.
// visibility_scope is admin-only (partners can't set it, see
// src/app/api/partner/opportunities/[id]/route.ts), so "published" is the
// authoritative "admin approved this for public display" gate — the status
// workflow field (submitted/approved/completed/etc.) is a separate axis and
// is intentionally NOT filtered on here, except to defensively exclude
// rejected/archived in case a listing wasn't also reset out of "published".
// Only opportunities the submitting partner marked "standard" confidentiality
// are ever returned — "confidential"/"highly_confidential" stay admin/partner
// -only regardless of visibility_scope. Never exposes the partner's own
// contact details; public visitors go through /contact instead.
// "recruitment_requirement" opportunities are manpower/workforce requests,
// not investment deals, so they're excluded from this investment-page feed.
export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('partner_opportunities')
      .select('id, reference_number, title, country, opportunity_type, summary, description, estimated_value, created_at, sectors(name, slug)')
      .not('status', 'in', '(rejected,archived)')
      .eq('visibility_scope', 'published')
      .eq('confidentiality_level', 'standard')
      .neq('opportunity_type', 'recruitment_requirement')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    logError("api.public.opportunities", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
