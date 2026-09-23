import Link from 'next/link';
import { loadProjects, loadDevelopers } from '@/lib/propertyDevelopers';
import { loadLocationTree } from '@/lib/propertyLocations';
import type { CountryNode } from '@/lib/propertyLocations';
import { ProjectCard } from '../_components/ProjectCard';
import { locationLabel } from '../_components/locationNav';
import { EmptyState, ButtonLink } from '../_components/ui';

/**
 * /new-projects and /new-projects/<country> (brief §9): developer projects,
 * separate from ordinary listings. Server-rendered from live data.
 */
export async function NewProjectsView({ country }: { country: CountryNode | null }) {
  const [projects, developers, tree] = await Promise.all([
    loadProjects({ country: country?.name }),
    loadDevelopers(),
    loadLocationTree(),
  ]);
  const devBySlug = new Map(developers.map((d) => [d.id, d.slug]));
  const countries = (tree || []).flatMap((r) => r.countries);

  return (
    <main>
      <section className="pp-hero pp-hero--compact">
        <div className="pp-container">
          <div className="pp-eyebrow">CZAAH Properties · New projects</div>
          <h1>
            {country
              ? <>New projects in <span className="pp-gold">{locationLabel({ country, city: null })}</span></>
              : <>New &amp; off-plan <span className="pp-gold">projects.</span></>}
          </h1>
          <p className="pp-hero-lede">
            New developments and off-plan projects, each with its developer, location, available units
            and — where the developer offers one — a payment plan.
          </p>
        </div>
      </section>

      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> /{' '}
          {country ? <><Link href="/property-portal/new-projects">New Projects</Link> / {country.name}</> : 'New Projects'}
        </div>

        {countries.length > 1 && (
          <div role="navigation" className="pp-loc-chips" aria-label="Markets">
            <Link href="/property-portal/new-projects" className={!country ? 'active' : undefined}>All markets</Link>
            {countries.map((c) => (
              <Link key={c.id} href={`/property-portal/new-projects/${c.slug}`} className={country?.id === c.id ? 'active' : undefined}>
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="pp-listpage-meta" style={{ margin: '10px 0 22px' }}>
          <span>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
          <Link href="/property-portal/developers" className="pp-link-arrow">Developers →</Link>
          <Link href="/property-portal/off-plan" className="pp-link-arrow">Off-plan property listings →</Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title={country ? `No projects in ${locationLabel({ country, city: null })} right now` : 'No projects listed right now'}
            action={<ButtonLink href="/property-portal/contact">Ask about upcoming projects</ButtonLink>}
          >
            New projects are added as developers join CZAAH Properties.
          </EmptyState>
        ) : (
          <div className="pp-project-grid" style={{ marginBottom: 60 }}>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                developerHref={p.developer_id && devBySlug.get(p.developer_id) ? `/property-portal/developers/${devBySlug.get(p.developer_id)}` : null}
              />
            ))}
          </div>
        )}

        <div className="pp-cta-band" style={{ background: 'none', padding: '10px 0 80px' }}>
          <h2 className="pp-h2">Are you a developer?</h2>
          <p>Present a new or off-plan project to CZAAH Properties&apos; buyers. Every listing is reviewed first.</p>
          <div className="pp-cta-actions">
            <ButtonLink href="/property-portal/sell?path=development">List a development</ButtonLink>
            <ButtonLink href="/property-portal/sell?path=partnership" variant="ghost">Partner with CZAAH</ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
