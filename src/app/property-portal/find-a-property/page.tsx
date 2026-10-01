import { Suspense } from 'react'
import Link from 'next/link'
import { portalMetadata } from '../_components/seo'
import { SourcingForm } from '../_components/SourcingForm'

export const metadata = portalMetadata({
  path: '/find-a-property',
  title: 'Find a Property for Me',
  description:
    'Tell CZAAH Properties what you need. Our team can search the market, shortlist suitable opportunities and help you through the next steps.',
})

const NEXT_STEPS = [
  { t: 'We review your request', d: 'An advisor reads what you have told us and may ask a few questions.' },
  { t: 'We search and shortlist', d: 'We look across our listings and our network for property that fits.' },
  { t: 'You view and compare', d: 'We share the shortlist and arrange viewings, in person or by video.' },
]

export default function FindAPropertyPage() {
  return (
    <main>
      <div className="pp-container">
        <div className="pp-crumbs">
          <Link href="/property-portal">Home</Link> / Find a property for me
        </div>
        <div className="pp-find">
          <div className="pp-find-intro">
            <div className="pp-eyebrow">Personal property sourcing</div>
            <h1 className="pp-find-h1">Tell us what you need.</h1>
            <p className="pp-section-lead">
              Our team can search the market, shortlist suitable opportunities and help you through
              the next steps. It takes about two minutes.
            </p>
            <ol className="pp-find-steps">
              {NEXT_STEPS.map((s, i) => (
                <li key={s.t}>
                  <i aria-hidden="true">{i + 1}</i>
                  <div>
                    <strong>{s.t}</strong>
                    <span>{s.d}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="pp-disclaimer">
              Sending a request does not commit you to anything, and we cannot promise that a
              matching property is available.
            </p>
          </div>
          <Suspense fallback={<div className="pp-wizard"><div className="pp-skeleton" style={{ height: 320, aspectRatio: 'auto' }} /></div>}>
            <SourcingForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
