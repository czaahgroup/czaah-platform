import Link from 'next/link';
import { loadDevelopers } from '@/lib/propertyDevelopers';
import { resolveImage } from '../_components/types';
import { portalMetadata } from '../_components/seo';
import { EmptyState, ButtonLink } from '../_components/ui';

export const dynamic = 'force-dynamic';

export const metadata = portalMetadata({
  path: '/developers',
  title: 'Property Developers',
  description: 'Developers behind the new and off-plan projects listed with CZAAH Properties.',
});

export default async function DevelopersPage() {
  const developers = await loadDevelopers();
  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / <Link href="/property-portal/new-projects">New Projects</Link> / Developers
        </div>
        <div className="pp-listpage-head">
          <h1>Property <span className="pp-gold">developers</span></h1>
          <div className="pp-listpage-meta"><span>{developers.length} developer{developers.length === 1 ? '' : 's'}</span></div>
        </div>
        <p className="pp-section-lead" style={{ maxWidth: 720, marginBottom: 32 }}>
          The developers behind the projects listed with CZAAH Properties. A verified badge appears only
          once CZAAH has completed its checks on that developer.
        </p>

        {developers.length === 0 ? (
          <EmptyState
            title="No developers listed yet"
            action={<ButtonLink href="/property-portal/sell?path=development">List a development</ButtonLink>}
          >
            Developers are added as their projects join CZAAH Properties.
          </EmptyState>
        ) : (
          <div className="pp-developer-grid">
            {developers.map((d) => {
              const logo = resolveImage(d.logo_url);
              return (
                <Link key={d.id} href={`/property-portal/developers/${d.slug}`} className="pp-developer-card">
                  <div className="pp-developer-logo" aria-hidden="true">
                    {logo ? <img src={logo} alt="" /> : <span>{d.name.charAt(0)}</span>}
                  </div>
                  <div>
                    <h2>
                      {d.name}
                      {d.verification_status === 'verified' && <span className="pp-verified-badge">Verified</span>}
                    </h2>
                    {d.countries.length > 0 && <p className="pp-developer-countries">{d.countries.map((c) => c.name).join(' · ')}</p>}
                    <p className="pp-developer-count">{d.project_count} project{d.project_count === 1 ? '' : 's'} with CZAAH</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
