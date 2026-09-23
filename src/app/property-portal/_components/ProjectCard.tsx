import Link from 'next/link';
import { resolveImage } from './types';
import { formatPlotSize, DEVELOPMENT_STATUS_LABEL, POSSESSION_LABEL } from '@/lib/plots';
import { formatMoney } from '@/lib/paymentPlan';
import type { ProjectRow } from '@/lib/propertyDevelopers';

// A new-build / off-plan project card (brief §4.5, §9): image, name,
// developer, location, starting price, status, payment-plan indicator.
// Server-safe (no hooks) — prices are shown in the project's own currency.
export function ProjectCard({ project, developerHref }: { project: ProjectRow; developerHref?: string | null }) {
  const units = project.development_units || [];
  const priced = units.filter((u) => u.total_price != null);
  // Cheapest in the project's own currency; mixed-currency schemes show the
  // first unit's currency rather than compare across currencies here.
  const ccy = priced[0]?.currency || project.currency || '';
  const same = priced.filter((u) => (u.currency || ccy) === ccy);
  const from = same.length ? Math.min(...same.map((u) => Number(u.total_price))) : null;
  const sizes = [...new Set(units.map((u) => formatPlotSize(u.plot_size, u.plot_size_unit)).filter(Boolean))];
  const image = resolveImage(project.featured_image) || resolveImage((project.gallery || [])[0]);
  const place = [project.city, project.country].filter(Boolean).join(', ');

  return (
    <article className="pp-project-card">
      <Link href={`/property-portal/developments/${project.slug}`} className="pp-project-card-img" tabIndex={-1} aria-hidden="true">
        {image ? <img src={image} alt="" loading="lazy" /> : <div className="pp-card-img--empty">⌂</div>}
      </Link>
      <div className="pp-project-card-body">
        <h3><Link href={`/property-portal/developments/${project.slug}`}>{project.name}</Link></h3>
        {project.developer_name && (
          <p className="pp-project-card-dev">
            {developerHref ? <Link href={developerHref}>{project.developer_name}</Link> : project.developer_name}
          </p>
        )}
        {place && <p className="pp-project-card-loc">{place}</p>}
        {sizes.length > 0 && <p className="pp-project-card-sizes">{sizes.join(' · ')}</p>}
        <p className="pp-project-card-price">{from != null ? `From ${formatMoney(from, ccy)}` : 'Price on request'}</p>
        <p className="pp-dev-strip-tags">
          {project.development_status && <span>{DEVELOPMENT_STATUS_LABEL[project.development_status] || project.development_status}</span>}
          {project.possession_status && <span>{POSSESSION_LABEL[project.possession_status] || project.possession_status}</span>}
          {project.has_payment_plan && <span className="is-plan">Payment plan</span>}
        </p>
        <Link href={`/property-portal/developments/${project.slug}`} className="pp-link-arrow">View project →</Link>
      </div>
    </article>
  );
}
