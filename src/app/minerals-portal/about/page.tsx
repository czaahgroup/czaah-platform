import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About CZAAH Minerals',
  description: 'How CZAAH helps buyers, mining companies and investors with Pakistan’s minerals: market entry, leases and licences, deal structuring and supply.',
  alternates: { canonical: '/about' },
}

// Services describe what CZAAH does for a client. They promise work, not outcomes.
const SERVICES = [
  { icon: 'explore', title: 'Market entry advice', text: 'Sector research and opportunity mapping for firms assessing Pakistan’s mining sector, from first look to a decision.' },
  { icon: 'description', title: 'Leases and licences', text: 'Help with provincial mining lease and exploration licence applications in Balochistan, Khyber Pakhtunkhwa, Punjab, Sindh and Gilgit-Baltistan.' },
  { icon: 'handshake', title: 'Deal structuring', text: 'Structuring joint ventures, investment partnerships and production agreements in line with Pakistani mining and foreign-investment law.' },
  { icon: 'swap_horiz', title: 'Supply and offtake', text: 'Introducing Pakistani mineral producers and international buyers, and carrying a quote request through to written terms.' },
  { icon: 'gavel', title: 'Regulatory process', text: 'Working with provincial Mines & Minerals Departments, environmental assessments and compliance requirements on a client’s behalf.' },
  { icon: 'groups', title: 'Bringing parties together', text: 'Introducing operators, technical partners and capital providers for a specific project.' },
]

const AUDIENCE = [
  { icon: 'diamond', text: 'Mining companies looking at Pakistan' },
  { icon: 'swap_horiz', text: 'Commodity traders and industrial buyers' },
  { icon: 'trending_up', text: 'Investors assessing a mineral project' },
  { icon: 'storefront', text: 'Pakistani producers seeking buyers' },
]

// Context, stated as fact with its source — never as a forecast.
const CONTEXT = [
  { title: 'Five provinces and regions', text: 'Minerals are administered by the provinces. Balochistan, Khyber Pakhtunkhwa, Punjab, Sindh and Gilgit-Baltistan each issue their own exploration licences and mining leases.' },
  { title: 'Much is still unexplored', text: 'Large areas have had little systematic exploration, and many deposits are worked by small-scale and artisanal miners. Quantities and grades should be treated as unproven until an independent assessment says otherwise.' },
  { title: 'Infrastructure varies by site', text: 'Road, power and port access differ greatly between a quarry near a highway and a deposit in a remote district. It is one of the first things CZAAH looks at with a client.' },
]

export default function AboutPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10">
      <p className="text-xs text-on-surface-variant mb-3"><Link href="/minerals-portal" className="hover:text-primary">Home</Link> / About</p>
      <h1 className="cinzel-text text-3xl sm:text-5xl font-semibold leading-tight mb-5 max-w-3xl">Mining advisory <span className="text-primary">and supply.</span></h1>
      <p className="text-on-surface-variant text-base sm:text-lg leading-relaxed max-w-3xl mb-12">
        CZAAH Minerals helps buyers source minerals from Pakistan, and helps mining companies and investors enter and work in the sector.
        We act as an adviser and intermediary: terms are agreed in writing, case by case.
      </p>

      <section className="mb-14">
        <h2 className="cinzel-text text-2xl sm:text-3xl font-semibold mb-6">How we <span className="text-primary">help</span></h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="border border-outline-variant/15 bg-surface-container p-6">
              <span className="material-symbols-outlined text-primary text-3xl mb-3 block" aria-hidden="true">{s.icon}</span>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-on-surface-variant leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="cinzel-text text-2xl sm:text-3xl font-semibold mb-6">Who it&rsquo;s <span className="text-primary">for</span></h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map((a) => (
            <li key={a.text} className="border border-outline-variant/15 p-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">{a.icon}</span>
              <span className="text-on-surface-variant">{a.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-14">
        <h2 className="cinzel-text text-2xl sm:text-3xl font-semibold mb-6">Working with Pakistan&rsquo;s <span className="text-primary">minerals</span></h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {CONTEXT.map((c) => (
            <div key={c.title} className="border border-outline-variant/15 p-6">
              <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
              <p className="text-on-surface-variant leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
        <p className="text-on-surface-variant mt-6">
          For what occurs where, see the <Link href="/minerals-portal/resources" className="text-primary underline">guide to Pakistan&rsquo;s minerals</Link>.
        </p>
      </section>

      <section className="border border-primary/30 bg-surface-container p-8 text-center">
        <h2 className="cinzel-text text-2xl font-semibold mb-3">Talk to us</h2>
        <p className="text-on-surface-variant mb-6 max-w-2xl mx-auto">Tell us which mineral you need, or what you are looking at, and we will come back to you.</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/minerals-portal/request" className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm inline-block">Request a mineral</Link>
          <Link href="/minerals-portal/offers" className="border border-primary/50 text-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm inline-block">Browse offers</Link>
        </div>
      </section>
    </div>
  )
}
