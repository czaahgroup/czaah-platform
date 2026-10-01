'use client';

// Minimum and maximum price as two selects. The value is the same "min-max"
// string the price bands always used (?price=250000-500000, open ends allowed),
// so existing links and saved searches keep working and filterListings() needs
// no change. Amounts are US dollar equivalents, because listings are priced in
// several currencies; rents are per month.

const SALE = [100_000, 250_000, 500_000, 750_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000];
const RENT = [500, 1_000, 1_500, 3_000, 6_000, 12_000];

const label = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : n >= 1_000 ? `$${n / 1_000}k` : `$${n}`;

export function splitPrice(value: string): [string, string] {
  const [min = '', max = ''] = (value || '').split('-');
  return [min === '0' ? '' : min, max];
}

export function joinPrice(min: string, max: string): string {
  // A minimum above the maximum is read as the two the other way round.
  if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
  return min || max ? `${min}-${max}` : '';
}

export function PriceRange({
  value,
  onChange,
  rent = false,
  fieldClassName,
  withLabels = false,
}: {
  value: string;
  onChange: (value: string) => void;
  rent?: boolean;
  /** Class for each wrapping <label>. */
  fieldClassName?: string;
  /** Show a visible caption above each select (the hero search does). */
  withLabels?: boolean;
}) {
  const [min, max] = splitPrice(value);
  const base = rent ? RENT : SALE;
  // A value from an older link that is not one of the steps is still offered.
  const steps = [...new Set([...base, Number(min) || 0, Number(max) || 0])].filter((n) => n > 0).sort((a, b) => a - b);
  const per = rent ? ' / mo' : '';
  const minText = rent ? 'Min rent' : 'Min price';
  const maxText = rent ? 'Max rent' : 'Max price';
  return (
    <>
      <label className={fieldClassName}>
        {withLabels && <span>{minText}</span>}
        <select aria-label={withLabels ? undefined : `${minText} (USD)`} value={min} onChange={(e) => onChange(joinPrice(e.target.value, max))}>
          <option value="">{withLabels ? 'No min' : minText}</option>
          {steps.map((n) => <option key={n} value={n}>{label(n)}{per}</option>)}
        </select>
      </label>
      <label className={fieldClassName}>
        {withLabels && <span>{maxText}</span>}
        <select aria-label={withLabels ? undefined : `${maxText} (USD)`} value={max} onChange={(e) => onChange(joinPrice(min, e.target.value))}>
          <option value="">{withLabels ? 'No max' : maxText}</option>
          {steps.map((n) => <option key={n} value={n}>{label(n)}{per}</option>)}
        </select>
      </label>
    </>
  );
}
