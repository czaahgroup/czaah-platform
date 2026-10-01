'use client'

import { useState } from 'react'
import type { CleanPlan } from '@/lib/listingEdits'

/** A payment plan as the form holds it: everything is text until it is sent. */
export interface PlanDraft {
  enabled: boolean
  downPayment: string
  rows: { label: string; amount: string; months: string }[]
  notes: string
}

export const EMPTY_PLAN: PlanDraft = { enabled: false, downPayment: '', rows: [], notes: '' }

const str = (v: unknown) => (v == null ? '' : String(v))
const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, ''))
  return v.trim() !== '' && Number.isFinite(n) ? n : 0
}

/** A stored plan as a draft the form can edit. */
export function planDraftFrom(plan: CleanPlan | null | undefined): PlanDraft {
  if (!plan) return EMPTY_PLAN
  return {
    enabled: true,
    downPayment: str(plan.down_payment),
    rows: plan.installments.map((r) => ({ label: r.label || '', amount: str(r.amount || ''), months: str(r.due_after_months) })),
    notes: plan.notes || '',
  }
}

/** The draft as the API expects it; null when the plan is switched off. */
export function planPayload(draft: PlanDraft, price: string, currency: string) {
  if (!draft.enabled) return null
  return {
    total_price: price,
    down_payment: draft.downPayment,
    currency,
    notes: draft.notes,
    installments: draft.rows.map((r) => ({ label: r.label, amount: r.amount, due_after_months: r.months })),
  }
}

const inputClass = 'bg-surface-container border border-outline-variant/20 px-3 py-2.5 text-base sm:text-sm text-on-surface raleway-text w-full focus:border-primary outline-none transition-colors'
const labelClass = 'raleway-text text-xs font-medium tracking-[0.05em] uppercase text-on-surface-variant/60 mb-1.5 block'

/**
 * Down payment plus a list of instalments. "Fill in" splits whatever is left
 * of the price into equal instalments, so a typical plan takes three numbers;
 * every figure can then be changed by hand. Nothing is corrected silently —
 * if the schedule does not add up to the price, the form says so.
 */
export function PaymentPlanEditor({
  value,
  onChange,
  price,
  currency,
  idPrefix = 'plan',
}: {
  value: PlanDraft
  onChange: (next: PlanDraft) => void
  price: string
  currency: string
  idPrefix?: string
}) {
  const [count, setCount] = useState('12')
  const [every, setEvery] = useState('1')

  const total = num(price)
  const down = num(value.downPayment)
  const scheduled = down + value.rows.reduce((s, r) => s + num(r.amount), 0)
  const difference = total ? Math.round((scheduled - total) * 100) / 100 : 0
  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString('en-GB')}`

  function fill() {
    const n = Math.min(120, Math.max(1, Math.round(num(count))))
    const gap = Math.max(1, Math.round(num(every)))
    const balance = Math.max(0, total - down)
    const each = Math.floor(balance / n)
    const rows = Array.from({ length: n }, (_, i) => ({
      label: `Instalment ${i + 1}`,
      // The last instalment carries the rounding so the schedule adds up exactly.
      amount: String(i === n - 1 ? balance - each * (n - 1) : each),
      months: String((i + 1) * gap),
    }))
    onChange({ ...value, rows })
  }

  const setRow = (i: number, patch: Partial<PlanDraft['rows'][number]>) =>
    onChange({ ...value, rows: value.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
        <input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
        This can be bought on a payment plan
      </label>

      {value.enabled && (
        <div className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass} htmlFor={`${idPrefix}-down`}>Down payment ({currency})</label>
              <input id={`${idPrefix}-down`} className={inputClass} type="number" min={0} inputMode="decimal" value={value.downPayment} onChange={(e) => onChange({ ...value, downPayment: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor={`${idPrefix}-count`}>Number of instalments</label>
              <input id={`${idPrefix}-count`} className={inputClass} type="number" min={1} max={120} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor={`${idPrefix}-every`}>One every (months)</label>
              <input id={`${idPrefix}-every`} className={inputClass} type="number" min={1} inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} />
            </div>
          </div>
          <button type="button" onClick={fill} disabled={!total} className="text-xs raleway-text px-4 py-2.5 border border-primary/40 text-primary disabled:opacity-40">
            Fill in equal instalments
          </button>
          {!total && <p className="text-xs text-on-surface-variant/60 mt-2">Enter the price above first, or type each instalment below.</p>}

          {value.rows.length > 0 && (
            <div className="mt-5 space-y-2">
              {value.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1.4fr_1fr_auto] gap-2 items-end border-b border-outline-variant/10 pb-2">
                  <div>
                    {i === 0 && <span className={`${labelClass} hidden sm:block`}>Instalment</span>}
                    <input aria-label={`Instalment ${i + 1} name`} className={inputClass} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} placeholder={`Instalment ${i + 1}`} />
                  </div>
                  <button type="button" aria-label={`Remove instalment ${i + 1}`} onClick={() => onChange({ ...value, rows: value.rows.filter((_, j) => j !== i) })} className="sm:order-last h-11 w-11 border border-outline-variant/20 text-on-surface-variant hover:text-red-400">
                    ✕
                  </button>
                  <div>
                    {i === 0 && <span className={`${labelClass} hidden sm:block`}>Amount ({currency})</span>}
                    <input aria-label={`Instalment ${i + 1} amount`} className={inputClass} type="number" min={0} inputMode="decimal" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} placeholder="Amount" />
                  </div>
                  <div>
                    {i === 0 && <span className={`${labelClass} hidden sm:block`}>Due after (months)</span>}
                    <input aria-label={`Instalment ${i + 1} due after months`} className={inputClass} type="number" min={0} inputMode="numeric" value={r.months} onChange={(e) => setRow(i, { months: e.target.value })} placeholder="Months" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => onChange({ ...value, rows: [...value.rows, { label: '', amount: '', months: '' }] })} className="mt-3 text-xs raleway-text px-3 py-2 border border-outline-variant/20 text-on-surface-variant hover:text-on-surface">
            + Add an instalment
          </button>

          <p className="text-sm mt-4 text-on-surface-variant" role="status">
            Schedule total: <span className="text-on-surface">{fmt(scheduled)}</span>
            {total > 0 && (
              difference === 0
                ? <span className="text-green-400"> — matches the price.</span>
                : <span className="text-orange-400"> — {difference > 0 ? 'over' : 'under'} the price by {fmt(Math.abs(difference))}. CZAAH will see this when reviewing.</span>
            )}
          </p>

          <div className="mt-4">
            <label className={labelClass} htmlFor={`${idPrefix}-notes`}>Plan notes (optional)</label>
            <input id={`${idPrefix}-notes`} className={inputClass} maxLength={1000} value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} placeholder="e.g. Possession on 50% payment" />
          </div>
        </div>
      )}
    </div>
  )
}
