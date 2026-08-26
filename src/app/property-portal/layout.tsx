import Link from 'next/link'

export default function PropertyPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="pp-nav">
        <div className="pp-nav-inner">
          <Link href="/property-portal" className="pp-logo">
            <span className="pp-logo-mark">&#8962;</span>
            <span>
              CZAAH <span className="pp-logo-accent">Property</span>
            </span>
          </Link>
          <div className="pp-nav-links">
            <Link href="/property-portal?market=london">London</Link>
            <Link href="/property-portal?market=dubai">Dubai</Link>
            <Link href="/property-portal?market=pakistan">Pakistan</Link>
            <Link href="/contact?interest=Real%20Estate#contact-form" className="pp-nav-cta">Contact</Link>
          </div>
        </div>
      </nav>
      {children}
      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <div>
            <div className="pp-logo" style={{ marginBottom: '12px' }}>
              <span className="pp-logo-mark">&#8962;</span>
              <span>CZAAH <span className="pp-logo-accent">Property</span></span>
            </div>
            <p className="pp-footer-tagline">A dedicated property investment portal from CZAAH &mdash; London, Dubai, and Pakistan.</p>
          </div>
          <div className="pp-footer-links">
            <Link href="/property-portal">All Listings</Link>
            <Link href="/">CZAAH Group</Link>
            <Link href="/contact#contact-form">Contact</Link>
          </div>
        </div>
        <div className="pp-footer-bottom">&copy; 2026 CZAAH. All rights reserved.</div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .pp-nav {
          display: block;
          position: sticky;
          top: 0;
          left: auto;
          right: auto;
          height: auto;
          z-index: 40;
          padding: 0;
          background: rgba(8,8,8,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--black-border, rgba(255,255,255,0.08));
        }
        .pp-nav-inner {
          max-width: 1400px;
          width: 100%;
          box-sizing: border-box;
          margin: 0 auto;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Cinzel', serif;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--white, #fff);
          text-decoration: none;
          font-size: 15px;
        }
        .pp-logo-mark {
          color: var(--gold, #C9A84C);
          font-size: 20px;
        }
        .pp-logo-accent {
          color: var(--gold, #C9A84C);
        }
        .pp-nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .pp-nav-links a {
          font-family: 'Raleway', sans-serif;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--white-muted, rgba(255,255,255,0.6));
          text-decoration: none;
          transition: color 0.25s ease;
        }
        .pp-nav-links a:hover {
          color: var(--gold, #C9A84C);
        }
        .pp-nav-cta {
          padding: 8px 18px;
          border: 1px solid var(--gold, #C9A84C);
          border-radius: 4px;
          color: var(--gold, #C9A84C) !important;
        }
        .pp-footer {
          border-top: 1px solid var(--black-border, rgba(255,255,255,0.08));
          padding: 48px 32px 24px;
          background: #050505;
        }
        .pp-footer-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }
        .pp-footer-tagline {
          font-family: 'Raleway', sans-serif;
          font-size: 13px;
          color: var(--white-muted, rgba(255,255,255,0.5));
          max-width: 360px;
          line-height: 1.6;
        }
        .pp-footer-links {
          display: flex;
          gap: 24px;
        }
        .pp-footer-links a {
          font-family: 'Raleway', sans-serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--white-muted, rgba(255,255,255,0.6));
          text-decoration: none;
        }
        .pp-footer-links a:hover {
          color: var(--gold, #C9A84C);
        }
        .pp-footer-bottom {
          max-width: 1400px;
          margin: 32px auto 0;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-family: 'Raleway', sans-serif;
          font-size: 11px;
          letter-spacing: 0.06em;
          color: var(--white-dim, rgba(255,255,255,0.3));
        }
        @media (max-width: 640px) {
          .pp-nav-links { gap: 16px; }
          .pp-nav-links a:not(.pp-nav-cta) { display: none; }
        }
      `}} />
    </>
  )
}
