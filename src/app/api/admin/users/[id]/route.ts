import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, phone, company_name, company_registration_number, country, industry_interests, company_website, company_description, avatar_url, role, status, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user is admin, also fetch sector assignments
    let sectorAssignments: { id: string; sector_id: string }[] = []
    if (profile.role === 'admin') {
      const { data: assignments } = await adminClient
        .from('admin_sector_assignments')
        .select('id, sector_id')
        .eq('admin_id', id)

      sectorAssignments = assignments || []
    }

    return NextResponse.json({ profile, sectorAssignments })
  } catch (err) {
    logError("api.admin.users.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent modifying super_admin
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single()

    if (targetProfile?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot modify super_admin users' }, { status: 403 })
    }

    const body = await request.json()
    const { role, status, sectorAssignments, fullName, phone, companyName, country, industryInterests, companyWebsite, companyDescription } = body

    // Update profile fields
    const EDITABLE_ROLES = ['member', 'admin', 'investment_partner', 'elite_member', 'real_estate_partner', 'worker', 'employer', 'oep_partner']
    const updates: Record<string, unknown> = {}
    if (role && EDITABLE_ROLES.includes(role)) {
      updates.role = role
    }
    if (status) {
      updates.status = status
    }
    if (fullName !== undefined) updates.full_name = fullName
    if (phone !== undefined) updates.phone = phone
    if (companyName !== undefined) updates.company_name = companyName
    if (country !== undefined) updates.country = country
    if (industryInterests !== undefined) updates.industry_interests = industryInterests
    if (companyWebsite !== undefined) updates.company_website = companyWebsite
    if (companyDescription !== undefined) updates.company_description = companyDescription

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      const { error } = await adminClient
        .from('profiles')
        .update(updates)
        .eq('id', id)

      if (error) {
        logError("api.admin.users.id", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Update sector assignments if provided (array of sector_id strings)
    if (Array.isArray(sectorAssignments)) {
      // Remove existing assignments
      await adminClient
        .from('admin_sector_assignments')
        .delete()
        .eq('admin_id', id)

      // Insert new assignments
      if (sectorAssignments.length > 0) {
        const rows = sectorAssignments.map((sectorId: string) => ({
          admin_id: id,
          sector_id: sectorId,
          assigned_by: user.id,
        }))

        const { error: insertError } = await adminClient
          .from('admin_sector_assignments')
          .insert(rows)

        if (insertError) {
          logError('api.admin.users.id', insertError, { step: 'sector-assignment' })
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.admin.users.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deactivating super_admin
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single()

    if (targetProfile?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot deactivate super_admin users' }, { status: 403 })
    }

    // Soft delete: set status to deactivated
    const { error } = await adminClient
      .from('profiles')
      .update({ status: 'deactivated', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logError("api.admin.users.id", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logError("api.admin.users.id", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
