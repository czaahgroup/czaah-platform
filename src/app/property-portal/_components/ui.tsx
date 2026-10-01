import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

// CZAAH Properties UI primitives.
//
// The portal's look lives in portal.css (.pp-btn, .pp-skeleton, .pp-empty …),
// but until now every page re-typed that markup by hand, so each copy drifted.
// New and edited code uses these components; the class names stay the single
// styling contract, so the CSS can be consolidated later without touching
// every page again.

type Variant = 'gold' | 'ghost' | 'glass';

function btnClass(variant: Variant, extra?: string) {
  return ['pp-btn', `pp-btn--${variant}`, extra].filter(Boolean).join(' ');
}

/** An action on this page. */
export function Button({
  variant = 'gold',
  className,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button type={type} className={btnClass(variant, className)} {...rest} />;
}

/** Navigation styled as a button. Internal portal paths use next/link. */
export function ButtonLink({
  variant = 'gold',
  className,
  href,
  ...rest
}: Omit<ComponentProps<typeof Link>, 'href'> & { href: string; variant?: Variant }) {
  const cls = btnClass(variant, className);
  // tel:, mailto:, https://wa.me … are not app routes.
  if (/^[a-z]+:/i.test(href)) {
    return <a href={href} className={cls} {...(rest as ComponentProps<'a'>)} />;
  }
  return <Link href={href} className={cls} {...rest} />;
}

/** Placeholder block while content loads. */
export function Skeleton({ height, className }: { height?: number | string; className?: string }) {
  return (
    <div
      className={['pp-skeleton', className].filter(Boolean).join(' ')}
      style={height != null ? { height } : undefined}
      aria-hidden="true"
    />
  );
}

/**
 * "Nothing here" with a way forward. Used for no results, nothing saved and
 * failed loads — never a bare blank area.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pp-empty" role="status">
      <strong className="pp-empty-title">{title}</strong>
      {children && <p className="pp-empty-detail">{children}</p>}
      {action && <div className="pp-empty-action">{action}</div>}
    </div>
  );
}

/**
 * No results on a search page: say why, and offer both ways forward — clear
 * the filters, or ask CZAAH to source one (the request form opens pre-filled
 * with what the visitor was searching for).
 */
export function NoResults({
  what = 'properties',
  filtered,
  clearHref,
  goal,
  country,
  city,
}: {
  what?: string;
  filtered: boolean;
  clearHref: string;
  goal?: string;
  country?: string | null;
  city?: string | null;
}) {
  const q = new URLSearchParams();
  if (goal) q.set('goal', goal);
  if (country) q.set('country', country);
  if (city) q.set('city', city);
  const qs = q.toString();
  return (
    <div className="pp-empty pp-noresults" role="status">
      <strong>{filtered ? `No ${what} match your filters.` : `No ${what} are listed here yet.`}</strong>
      <p>
        {filtered
          ? 'Try changing your price range, location or property type.'
          : 'Tell us what you need and our team can search the market for you.'}
      </p>
      <div className="pp-noresults-actions">
        {filtered && <Link href={clearHref} className="pp-btn pp-btn--ghost">Clear Filters</Link>}
        <Link href={`/property-portal/find-a-property${qs ? `?${qs}` : ''}`} className="pp-btn pp-btn--gold">Ask CZAAH to Find One</Link>
      </div>
    </div>
  );
}

/** Eyebrow + heading + optional link, the standard section opener. */
export function SectionHead({
  eyebrow,
  title,
  action,
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className="pp-section-head">
      <div>
        {eyebrow && <div className="pp-eyebrow">{eyebrow}</div>}
        <Tag className="pp-h2">{title}</Tag>
      </div>
      {action}
    </div>
  );
}
