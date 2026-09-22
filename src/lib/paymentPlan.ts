// Payment plan arithmetic.
//
// The rule that matters: we never silently adjust an advertised figure. If the
// instalment schedule printed on a developer's advert does not add up to the
// advertised total, that is a fact about the advert, and an admin needs to see
// it and decide — not have the numbers quietly rewritten to balance.

export interface InstallmentInput {
  installment_number?: number | null;
  label?: string | null;
  amount?: number | string | null;
  additional_amount?: number | string | null;
  due_after_months?: number | null;
  display_order?: number | null;
  notes?: string | null;
}

export interface PaymentPlanInput {
  total_price?: number | string | null;
  down_payment?: number | string | null;
  currency?: string | null;
  installments?: InstallmentInput[] | null;
}

export interface PlanReconciliation {
  /** down payment + every instalment + every additional payment. */
  scheduledTotal: number;
  /** The advertised headline price, or null when none is recorded. */
  advertisedTotal: number | null;
  downPayment: number;
  installmentTotal: number;
  additionalTotal: number;
  /** scheduledTotal − advertisedTotal. Positive = schedule asks for more. */
  difference: number | null;
  /** True when they agree (or when there is no advertised total to check). */
  reconciles: boolean;
  /** Admin-facing warning, or null when everything adds up. */
  warning: string | null;
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Money, so two decimal places is the real precision. Comparing raw floats
// would make 6,950,000.000000001 !== 6,950,000 and raise a false alarm.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Add a plan up and compare it against the advertised price.
 *
 * Never mutates its input and never "fixes" a figure — it reports.
 */
export function reconcilePaymentPlan(plan: PaymentPlanInput): PlanReconciliation {
  const rows = Array.isArray(plan.installments) ? plan.installments : [];

  const downPayment = round2(toNumber(plan.down_payment));
  const installmentTotal = round2(rows.reduce((sum, r) => sum + toNumber(r.amount), 0));
  const additionalTotal = round2(rows.reduce((sum, r) => sum + toNumber(r.additional_amount), 0));
  const scheduledTotal = round2(downPayment + installmentTotal + additionalTotal);
  const advertisedTotal = toNullableNumber(plan.total_price);

  if (advertisedTotal == null) {
    return {
      scheduledTotal,
      advertisedTotal: null,
      downPayment,
      installmentTotal,
      additionalTotal,
      difference: null,
      reconciles: true,
      warning: null,
    };
  }

  const difference = round2(scheduledTotal - round2(advertisedTotal));
  const reconciles = difference === 0;
  const ccy = plan.currency || '';
  const fmt = (n: number) => `${ccy} ${Math.abs(n).toLocaleString()}`.trim();

  return {
    scheduledTotal,
    advertisedTotal: round2(advertisedTotal),
    downPayment,
    installmentTotal,
    additionalTotal,
    difference,
    reconciles,
    warning: reconciles
      ? null
      : `Payment plan does not equal advertised total price. The schedule adds up to ${fmt(scheduledTotal)} against an advertised ${fmt(advertisedTotal)} — ${difference > 0 ? 'over' : 'under'} by ${fmt(difference)}.`,
  };
}

export interface ScheduleRow {
  key: string;
  label: string;
  amount: number;
  /** "On booking" / "Month 12" — when this falls due. */
  timing: string | null;
  kind: 'down_payment' | 'installment' | 'additional';
  notes?: string | null;
}

/**
 * Flatten a plan into display rows: the down payment, then each instalment,
 * with any "additional" amount shown as its own line so the advert's shape is
 * preserved rather than folded into the instalment beside it.
 */
export function buildSchedule(plan: PaymentPlanInput): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const downPayment = toNumber(plan.down_payment);

  if (downPayment > 0) {
    rows.push({ key: 'down', label: 'Down payment', amount: downPayment, timing: 'On booking', kind: 'down_payment' });
  }

  const installments = [...(plan.installments || [])].sort((a, b) => {
    const ao = a.display_order ?? a.installment_number ?? 0;
    const bo = b.display_order ?? b.installment_number ?? 0;
    return ao - bo;
  });

  installments.forEach((r, i) => {
    const amount = toNumber(r.amount);
    const additional = toNumber(r.additional_amount);
    const months = r.due_after_months;
    const timing = months != null ? (months === 0 ? 'On booking' : `Month ${months}`) : null;

    if (amount > 0) {
      rows.push({
        key: `i-${r.installment_number ?? i}`,
        label: r.label || `Instalment ${r.installment_number ?? i + 1}`,
        amount,
        timing,
        kind: 'installment',
        notes: r.notes,
      });
    }
    if (additional > 0) {
      rows.push({
        key: `a-${r.installment_number ?? i}`,
        label: months != null && months % 12 === 0 && months > 0
          ? `Additional payment after ${months / 12} year${months / 12 > 1 ? 's' : ''}`
          : 'Additional payment',
        amount: additional,
        timing,
        kind: 'additional',
        notes: r.notes,
      });
    }
  });

  return rows;
}

/** Validation for a plan coming in from a form or an API client. */
export function validatePaymentPlan(plan: PaymentPlanInput): string[] {
  const errors: string[] = [];
  const total = toNullableNumber(plan.total_price);
  if (total != null && total <= 0) errors.push('Payment plan total price must be greater than zero.');

  const down = toNullableNumber(plan.down_payment);
  if (down != null && down < 0) errors.push('Down payment cannot be negative.');

  (plan.installments || []).forEach((r, i) => {
    const amount = toNullableNumber(r.amount);
    const additional = toNullableNumber(r.additional_amount);
    if (amount != null && amount < 0) errors.push(`Instalment ${r.installment_number ?? i + 1}: amount cannot be negative.`);
    if (additional != null && additional < 0) errors.push(`Instalment ${r.installment_number ?? i + 1}: additional amount cannot be negative.`);
    if (r.due_after_months != null && r.due_after_months < 0) {
      errors.push(`Instalment ${r.installment_number ?? i + 1}: due-after months cannot be negative.`);
    }
  });

  return errors;
}

/** "PKR 6,950,000" — plain, no rounding games, no currency symbol guessing. */
export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount == null || !Number.isFinite(amount)) return 'On request';
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}
