import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { DEVELOPMENT_COLUMNS, UNIT_COLUMNS, loadPlansForUnits } from '@/lib/developments'
import { reconcilePaymentPlan } from '@/lib/paymentPlan'

/**
 * One published development, with every plot variant and its payment plan.
 *
 * The reconciliation warning is computed but deliberately NOT returned to the
 * public — a mismatch between an advert's schedule and its headline price is
 * an internal flag for an admin, not something to print next to the price.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data: development, error } = await supabase
      .from('developments')
      .select(`${DEVELOPMENT_COLUMNS}, development_units(${UNIT_COLUMNS})`)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!development) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const units = ((development.development_units || []) as { id: string; display_order?: number }[])
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

    const plans = await loadPlansForUnits(supabase, units.map((u) => u.id))

    const unitsWithPlans = units.map((u) => {
      const entry = plans[u.id]
      if (!entry) return { ...u, payment_plan: null }
      const plan = entry.plan as Record<string, unknown>
      const installments = entry.installments as Record<string, unknown>[]
      const reconciliation = reconcilePaymentPlan({
        total_price: plan.total_price as number,
        down_payment: plan.down_payment as number,
        currency: plan.currency as string,
        installments: installments as never[],
      })
      return {
        ...u,
        payment_plan: {
          ...plan,
          installments,
          // Totals are safe to publish; the warning text is not.
          scheduled_total: reconciliation.scheduledTotal,
        },
      }
    })

    return NextResponse.json({
      data: { ...development, development_units: undefined, units: unitsWithPlans },
    })
  } catch (err) {
    logError('api.public.developments.slug', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
