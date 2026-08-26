import { NextRequest, NextResponse } from 'next/server'
import { requirePartner } from '@/lib/partnerAuth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartner(request)
    if (auth.error) return auth.error
    const { supabase, partner } = auth

    const { data: opportunities } = await supabase!
      .from('partner_opportunities')
      .select('status')
      .eq('partner_id', partner!.id)

    const counts = {
      total: opportunities?.length || 0,
      underReview: opportunities?.filter((o) => o.status === 'submitted' || o.status === 'more_info_required').length || 0,
      approved: opportunities?.filter((o) => o.status === 'approved').length || 0,
      inProgress: opportunities?.filter((o) => o.status === 'in_progress').length || 0,
      completed: opportunities?.filter((o) => o.status === 'completed').length || 0,
    }

    const { count: referralCount } = await supabase!
      .from('partner_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner!.id)

    const { data: chat } = await supabase!.from('partner_chats').select('id').eq('partner_id', partner!.id).single()
    let newMessages = 0
    if (chat) {
      const { count } = await supabase!
        .from('partner_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .eq('is_read', false)
        .neq('sender_id', auth.userId)
      newMessages = count || 0
    }

    return NextResponse.json({ partner, counts, newMessages, referralCount: referralCount || 0 })
  } catch (err) {
    console.error('GET /api/partner/me error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
