import type { Metadata } from 'next';
import Link from 'next/link';
import { portalOffices, portalEmail } from '../_components/portalRuntime';
import { WHY_INVEST } from '../_components/portal-content';

export const metadata: Metadata = {
  title: 'About CZAAH Property — Investment Real Estate in London, Dubai & Pakistan',
  description:
    'CZAAH Property is the real estate arm of CZAAH, the London-based international investment facilitation group. Title-verified property across London, Dubai and Pakistan with one counterparty end to end.',
};

const PILLARS = [
  {
    t: 'Title-verified before listing',
    d: 'Every property is checked for clean title and encumbrances before it reaches the portal. Nothing is published on a seller’s word alone.',
  },
  {
    t: 'Local partners, not a remote feed',
    d: 'Each market is covered by a CZAAH partner on the ground who inspects, verifies and represents the asset — so what you read matches what exists.',
  },
  {
    t: 'One counterparty, start to finish',
    d: 'From first viewing through negotiation, payment structuring and completion, you deal with CZAAH — not a chain of introducers each taking a cut.',
  },
  {
    t: 'Built for cross-border buyers',
    d: 'Currency, tax treatment, remittance routes and non-resident ownership rules differ in every market. We handle that complexity as standard, not as an extra.',
  },
];

export default function PortalAboutPage() {
  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / About
        </div>

        <div className="pp-listpage-head">
          <h1>
            About <span className="pp-gold">CZAAH Property</span>
          </h1>
        </div>

        <p className="pp-section-lead" style={{ maxWidth: 760 }}>
          CZAAH Property is the real estate practice of CZAAH — a London-based international
          investment facilitation group. We give investors a single, accountable route into
          property across three markets that rarely share a common standard of diligence.
        </p>
      </div>

      <section className="pp-section pp-stats-band">
        <div className="pp-container">
          <h2 className="pp-h2" style={{ marginBottom: 34 }}>How we work</h2>
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
          <h2 className="pp-h2" style={{ marginBottom: 14 }}>Our markets</h2>
          <p className="pp-section-lead" style={{ marginBottom: 34, maxWidth: 720 }}>
            Three markets, one desk. Each is covered by a local CZAAH partner, and each is
            chosen for a different reason.
          </p>
          <div className="pp-presence-grid">
            {WHY_INVEST.map((m) => (
              <div className="pp-presence" key={m.market}>
                <strong>{m.market}</strong>
                <span>{m.points[0].title}</span>
                <small>{m.points.length} reasons</small>
              </div>
            ))}
          </div>
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
          <h2 className="pp-h2" style={{ marginBottom: 12 }}>Speak to the property desk</h2>
          <p className="pp-section-lead" style={{ marginBottom: 26 }}>
            Tell us the market, budget and asset class — we&apos;ll come back with what actually
            fits, including anything not yet published.
          </p>
          <div className="pp-cta-row">
            <Link href="/property-portal/contact" className="pp-btn pp-btn--gold">Contact us</Link>
            <a href={`mailto:${portalEmail()}`} className="pp-btn pp-btn--ghost">{portalEmail()}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
