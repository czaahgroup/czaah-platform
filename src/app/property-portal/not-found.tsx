import { ButtonLink } from './_components/ui'

// Rendered inside the portal layout (nav + footer), so a bad link on
// property.czaah.com stays on-brand instead of dropping to the main site 404.
export default function PortalNotFound() {
  return (
    <main>
      <div className="pp-container">
        <div className="pp-cta-band" style={{ background: 'none', padding: '120px 0 140px' }}>
          <div className="pp-eyebrow">404</div>
          <h2 className="pp-h2">This page isn&apos;t here</h2>
          <p>The link may be mistyped, or the listing may have been sold or withdrawn.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ButtonLink href="/property-portal/buy">Property to Buy</ButtonLink>
            <ButtonLink href="/property-portal/rent" variant="ghost">Homes to Rent</ButtonLink>
          </div>
        </div>
      </div>
    </main>
  )
}
