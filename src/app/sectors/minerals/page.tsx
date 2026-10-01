import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

// The sector's own site is minerals.czaah.com: the mineral guide, the offers
// and the services now live there. This page is the group site's summary of
// the sector and the way in — the same arrangement Real Estate has with
// property.czaah.com.

const SERVICES = [
  { icon: 'explore', title: 'Market entry advice', text: 'Sector research and opportunity mapping for firms assessing Pakistan’s mining sector.' },
  { icon: 'description', title: 'Leases and licences', text: 'Help with provincial mining lease and exploration licence applications.' },
  { icon: 'handshake', title: 'Deal structuring', text: 'Joint ventures, investment partnerships and production agreements.' },
  { icon: 'swap_horiz', title: 'Supply and offtake', text: 'Introducing Pakistani producers and international buyers.' },
];

const LINKS = [
  { href: 'https://minerals.czaah.com/offers', title: 'Mineral offers', text: 'Minerals for sale, joint ventures and licences listed through CZAAH. Request a quote on any of them.' },
  { href: 'https://minerals.czaah.com/resources', title: 'Guide to Pakistan’s minerals', text: 'What occurs where, by type and province, and what it is used for.' },
  { href: 'https://minerals.czaah.com/request', title: 'Request a mineral', text: 'Tell us the mineral, grade and quantity you need.' },
];

export default function MineralsPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="relative w-full min-h-[70dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Mines.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Mining Advisory &amp; Supply</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Minerals &amp;<br /><span className="text-primary">Mining.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">
              CZAAH helps buyers source minerals from Pakistan, and helps mining companies and investors enter and work in the sector.
              Offers, the guide to Pakistan&rsquo;s minerals and our services are on CZAAH Minerals.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a href="https://minerals.czaah.com" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Visit CZAAH Minerals &rarr;</a>
              <a href="/contact?interest=Minerals%20%26%20Mining#contact-form" className="border border-primary/60 text-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Talk to us &rarr;</a>
            </div>
          </section>
        </div>

        <section className="py-24 px-5 md:px-24 bg-surface">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">On CZAAH <span className="text-primary">Minerals.</span></h2>
            <div className="grid gap-6 md:grid-cols-3">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="block border border-outline-variant/20 bg-surface-container p-8 hover:border-primary/50 transition-colors">
                  <h3 className="cinzel-text text-xl text-on-surface mb-3">{l.title}</h3>
                  <p className="raleway-text text-on-surface-variant leading-relaxed mb-5">{l.text}</p>
                  <span className="raleway-text text-sm text-primary tracking-[0.1em] uppercase">Open &rarr;</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-5 md:px-24 bg-surface-container-lowest">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">How we <span className="text-primary">help.</span></h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map((s) => (
                <div key={s.title} className="border border-outline-variant/20 p-8">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block" aria-hidden="true">{s.icon}</span>
                  <h3 className="raleway-text text-lg font-semibold text-on-surface mb-2">{s.title}</h3>
                  <p className="raleway-text text-on-surface-variant leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
            <p className="raleway-text text-on-surface-variant mt-10">
              More about what we do on <a href="https://minerals.czaah.com/about" className="text-primary underline">CZAAH Minerals</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
