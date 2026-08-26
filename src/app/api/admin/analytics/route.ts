import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Auth check
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify super_admin role
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get date 6 months ago
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoStr = sixMonthsAgo.toISOString()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString()

    // Run all queries in parallel
    const [
      totalMembersRes,
      recentMembersRes,
      totalEnquiriesRes,
      activeEnquiriesRes,
      enquiriesByStatusRes,
      enquiriesBySectorRes,
      investmentsRes,
      recentChatsRes,
      kycPendingRes,
      kycApprovedRes,
      kycRejectedRes,
      memberGrowthRes,
      enquiryTrendsRes,
    ] = await Promise.all([
      // Total members
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      // New this month
      admin.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      // Total enquiries
      admin.from('enquiries').select('*', { count: 'exact', head: true }),
      // Active enquiries
      admin.from('enquiries').select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'assigned', 'active', 'waiting']),
      // Enquiries by status
      admin.from('enquiries').select('status'),
      // Enquiries by sector
      admin.from('enquiries').select('sector'),
      // Investments
      admin.from('investments').select('status, target_amount'),
      // Active chats (last 7 days)
      admin.from('chat_messages').select('chat_id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoStr),
      // KYC pending
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_kyc'),
      // KYC approved
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      // KYC rejected
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      // Member growth (last 6 months)
      admin.from('profiles').select('created_at').gte('created_at', sixMonthsAgoStr),
      // Enquiry trends (last 6 months)
      admin.from('enquiries').select('created_at').gte('created_at', sixMonthsAgoStr),
    ])

    // Process member growth by month
    const memberGrowth: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      memberGrowth[key] = 0
    }
    if (memberGrowthRes.data) {
      for (const row of memberGrowthRes.data) {
        const d = new Date(row.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in memberGrowth) memberGrowth[key]++
      }
    }

    // Process enquiry trends by month
    const enquiryTrends: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      enquiryTrends[key] = 0
    }
    if (enquiryTrendsRes.data) {
      for (const row of enquiryTrendsRes.data) {
        const d = new Date(row.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in enquiryTrends) enquiryTrends[key]++
      }
    }

    // Process enquiries by status
    const enquiriesByStatus: Record<string, number> = {}
    if (enquiriesByStatusRes.data) {
      for (const row of enquiriesByStatusRes.data) {
        enquiriesByStatus[row.status] = (enquiriesByStatus[row.status] || 0) + 1
      }
    }

    // Process enquiries by sector
    const enquiriesBySector: Record<string, number> = {}
    if (enquiriesBySectorRes.data) {
      for (const row of enquiriesBySectorRes.data) {
        if (row.sector) {
          enquiriesBySector[row.sector] = (enquiriesBySector[row.sector] || 0) + 1
        }
      }
    }
    // Sort by count descending, take top 8
    const topSectors = Object.entries(enquiriesBySector)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sector, count]) => ({ sector, count }))

    // Process investment pipeline
    const investmentPipeline: Record<string, { count: number; value: number }> = {}
    let totalPipelineValue = 0
    if (investmentsRes.data) {
      for (const row of investmentsRes.data) {
        if (!investmentPipeline[row.status]) {
          investmentPipeline[row.status] = { count: 0, value: 0 }
        }
        investmentPipeline[row.status].count++
        investmentPipeline[row.status].value += row.target_amount || 0
        totalPipelineValue += row.target_amount || 0
      }
    }

    return NextResponse.json({
      totalMembers: totalMembersRes.count ?? 0,
      newThisMonth: recentMembersRes.count ?? 0,
      totalEnquiries: totalEnquiriesRes.count ?? 0,
      activeEnquiries: activeEnquiriesRes.count ?? 0,
      pipelineValue: totalPipelineValue,
      memberGrowth: Object.entries(memberGrowth).map(([month, count]) => ({ month, count })),
      enquiryTrends: Object.entries(enquiryTrends).map(([month, count]) => ({ month, count })),
      enquiriesByStatus,
      topSectors,
      investmentPipeline,
      activeChats: recentChatsRes.count ?? 0,
      kyc: {
        pending: kycPendingRes.count ?? 0,
        approved: kycApprovedRes.count ?? 0,
        rejected: kycRejectedRes.count ?? 0,
      },
    })
  } catch (err) {
    console.error('GET /api/admin/analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
