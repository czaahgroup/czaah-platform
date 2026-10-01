import Link from 'next/link';
import { portalOffices, portalEmail } from '../_components/portalRuntime';
import { loadLocationTree } from '@/lib/propertyLocations';
import { portalMetadata } from '../_components/seo';
import { VERIFICATION_CHECKS } from '@/lib/verification';

export const metadata = portalMetadata({
  path: '/about',
  title: 'About Us',
  description:
    'CZAAH Properties is an international property advisory and marketplace. Global Property. One Trusted Partner.',
});

// What a client can rely on. Deliberately free of absolutes: nothing here
// promises an outcome or a legal position.
const PILLARS = [
  {
    t: 'Clear property information',
    d: 'Each listing states what we know — price, size, terms and the source of any stated yield. Where something is not known, it is left out rather than estimated.',
  },
  {
    t: 'Direct enquiry support',
    d: 'Enquiries and viewing requests go to the CZAAH Properties team and are given a reference you can quote.',
  },
  {
    t: 'Property sourcing',
    d: 'Tell us what you need and our team can search the market and shortlist suitable opportunities.',
  },
  {
    t: 'Cross-market assistance',
    d: 'Currencies, ownership rules and buying processes differ between markets. We help you understand the steps in each.',
  },
  {
    t: 'Secure account experience',
    d: 'Saved properties and searches are kept in an account confirmed by email. Your contact details are never shown on the site.',
  },
  {
    t: 'Professional support',
    d: 'Property and documentation checks may be carried out as appropriate to the market and transaction. We recommend independent legal advice before you commit.',
  },
];

export default async function PortalAboutPage() {
  // Loaded here: the runtime seed belongs to the client tree, and a server
  // component rendering before it would see no markets.
  const markets = ((await loadLocationTree()) || []).flatMap((r) => r.countries);
  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / About
        </div>

        <div className="pp-listpage-head">
          <h1>
            About <span className="pp-gold">CZAAH Properties</span>
          </h1>
        </div>

        <p className="pp-section-lead" style={{ maxWidth: 760 }}>
          Global Property. One Trusted Partner. CZAAH Properties is the property practice of CZAAH
          Group Ltd. We are more than a listings directory: we help clients discover, compare and
          progress suitable property opportunities, with one point of contact from search to
          completion.
        </p>
      </div>

      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <h2 className="pp-h2" style={{ marginBottom: 34 }}>What you can expect</h2>
          <div className="pp-why-grid">
            {PILLARS.map((p) => (
              <div className="pp-why-tile" key={p.t}>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pp-section">
        <div className="pp-container">
          <h2 className="pp-h2" style={{ marginBottom: 14 }}>Where we operate</h2>
          <p className="pp-section-lead" style={{ marginBottom: 34, maxWidth: 720 }}>
            These are the markets CZAAH Properties works in today. The list grows as we open new
            ones.
          </p>
          <div className="pp-presence-grid">
            {markets.map((c) => (
              <Link className="pp-presence" key={c.id} href={`/property-portal/buy/${c.slug}`}>
                <strong>{c.name}</strong>
                <span>{c.cities.map((ci) => ci.name).slice(0, 5).join(' · ') || 'Properties'}</span>
                <small>View properties →</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pp-section" id="verification" style={{ scrollMarginTop: 110 }}>
        <div className="pp-container">
          <h2 className="pp-h2" style={{ marginBottom: 14 }}>What &ldquo;Verified&rdquo; means</h2>
          <p className="pp-section-lead" style={{ marginBottom: 20, maxWidth: 720 }}>
            A property or development marked Verified has been checked by the CZAAH Properties team.
            Before we add the badge we have:
          </p>
          <ul className="pp-verify-list">
            {VERIFICATION_CHECKS.filter((c) => c.required).map((c) => <li key={c.key}>{c.label}.</li>)}
          </ul>
          <p className="pp-disclaimer" style={{ maxWidth: 720 }}>
            Verification is not a survey, valuation or legal opinion, and it does not replace your own
            due diligence. Always take independent legal advice before you buy or rent. Listings without
            the badge have not been through these checks yet.
          </p>
        </div>
      </section>

      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <h2 className="pp-h2" style={{ marginBottom: 34 }}>Our offices</h2>
          <div className="pp-presence-grid">
            {portalOffices().map((o) => (
              <div className="pp-presence" key={o.city}>
                <strong>{o.city}</strong>
                {o.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
                <small>{o.role}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pp-section--tight">
        <div className="pp-container" style={{ textAlign: 'center' }}>
          <h2 className="pp-h2" style={{ marginBottom: 12 }}>Speak to an advisor</h2>
          <p className="pp-section-lead" style={{ marginBottom: 26 }}>
            Tell us the market, budget and objective. We will come back with suitable options and
            clear next steps.
          </p>
          <div className="pp-cta-row">
            <Link href="/property-portal/contact" className="pp-btn pp-btn--gold">Speak to an Advisor</Link>
            <Link href="/property-portal/find-a-property" className="pp-btn pp-btn--ghost">Request a Property Shortlist</Link>
            <a href={`mailto:${portalEmail()}`} className="pp-btn pp-btn--ghost">{portalEmail()}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
