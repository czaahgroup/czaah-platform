import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadDeveloper, loadProjects } from '@/lib/propertyDevelopers';
import { resolveImage } from '../../_components/types';
import { portalMetadata } from '../../_components/seo';
import { ProjectCard } from '../../_components/ProjectCard';
import { EmptyState, ButtonLink } from '../../_components/ui';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await loadDeveloper(slug);
  if (!d) return {};
  const text = (d.description || '').replace(/\s+/g, ' ').trim();
  return portalMetadata({
    path: `/developers/${d.slug}`,
    title: `${d.name} — Developer`,
    description: text
      ? (text.length > 155 ? `${text.slice(0, 155).replace(/\s+\S*$/, '')}…` : text)
      : `New and off-plan projects by ${d.name}, listed with CZAAH Properties.`,
  });
}

export default async function DeveloperPage({ params }: Params) {
  const { slug } = await params;
  const d = await loadDeveloper(slug);
  if (d === null) notFound();
  if (!d) {
    return (
      <main><div className="pp-container" style={{ padding: '80px 0' }}>
        <EmptyState title="This page didn't load" action={<ButtonLink href={`/property-portal/developers/${slug}`}>Try again</ButtonLink>} />
      </div></main>
    );
  }
  const projects = await loadProjects({ developerId: d.id });
  const logo = resolveImage(d.logo_url);
  const website = d.website && /^https?:\/\//i.test(d.website) ? d.website : null;

  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / <Link href="/property-portal/developers">Developers</Link> / {d.name}
        </div>

        <header className="pp-developer-head">
          <div className="pp-developer-logo pp-developer-logo--lg" aria-hidden="true">
            {logo ? <img src={logo} alt="" /> : <span>{d.name.charAt(0)}</span>}
          </div>
          <div>
            <h1>
              {d.name}
              {d.verification_status === 'verified' && <span className="pp-verified-badge">Verified developer</span>}
            </h1>
            {d.countries.length > 0 && <p className="pp-developer-countries">Active in {d.countries.map((c) => c.name).join(' · ')}</p>}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="pp-link-arrow">
                Developer website ↗
              </a>
            )}
          </div>
        </header>

        {d.description && <p className="pp-section-lead" style={{ maxWidth: 780, whiteSpace: 'pre-line' }}>{d.description}</p>}

        <section className="pp-section" style={{ paddingTop: 20 }}>
          <h2 className="pp-h2">Projects with CZAAH Properties</h2>
          {projects.length === 0 ? (
            <EmptyState title="No projects listed right now">
              Ask the CZAAH Properties team about current and upcoming projects by {d.name}.
            </EmptyState>
          ) : (
            <div className="pp-project-grid">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </section>

        <div className="pp-cta-band" style={{ background: 'none', padding: '20px 0 80px' }}>
          <h2 className="pp-h2">Interested in a {d.name} project?</h2>
          <p>Speak to the CZAAH Properties team about availability, pricing and payment plans.</p>
          <div className="pp-cta-actions">
            <ButtonLink href="/property-portal/contact">Speak to CZAAH</ButtonLink>
            <ButtonLink href="/property-portal/new-projects" variant="ghost">All new projects</ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
