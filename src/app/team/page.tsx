'use client'
// @ts-nocheck

import { useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

const founders = [
  { initials: 'CZ', name: 'Chaudhry Zeeshan Ahmed', title: 'Co-Founder & Chairman', scope: 'Entrepreneur and seasoned business leader with over 18 years of experience in real estate, international business development, and the mines and minerals sector. Strategic advisor to numerous successful companies with a key role in building international partnerships and business networks. Chairman of the Gwadar Chamber of Commerce Standing Committee for Overseas Pakistanis, actively strengthening Gwadar-related international business relations including CPEC and overseas investment initiatives.' },
  { initials: 'AH', name: 'Aqib Hussain', title: 'Co-Founder & Vice Chairman', scope: 'Experienced entrepreneur with over 12 years of expertise across sales, business development, construction and development, renewable energy, gas and electricity, IT, and artificial intelligence. Extensive experience in UK government contracting with strong capabilities in financial markets and strategic investment opportunities. Known for building high-value partnerships and maintaining a strong professional network across Europe, driving innovation and delivering impactful business solutions across diverse sectors.' },
]

const seniorExecs = [
  { initials: 'SA', name: 'Ch Shahzad Akhtar', title: 'Chief Executive Officer', scope: "Over 25 years of experience in marketing, business development, sports consultancy, and media management. Founder of Kashmir Premier League, Sindh Premier League, Global Celebrity League, Global Affairs Magazine, and Ring of Pakistan. CEO of Pakistan's Overseas Real Estate Forum and Cutting Edge Group. Member of the 100 CEOs Club of Pakistan, with established relations with the United Nations." },
  { initials: 'SK', name: 'Saqib Karamat', title: 'Executive Director', scope: 'Visionary entrepreneur and strategic leader with extensive experience in technology, investment, real estate, and global education sectors. Strong footprint across Europe, China, Hong Kong, and Korea. Built, scaled, and managed multi-sector ventures focused on innovation and cross-border collaboration. Portfolio includes AI-driven innovations, healthcare transformation, and educational mobility programmes empowering youth worldwide. CEO, Europe of Oryx Capital. CEO, Marks Group. COO, Shenzhen Xingyi Intelligent Technology Co., Ltd. COO, Olive Healthcare Europe. CEO, Inturnationally Limited.' },
]

const cSuite = [
  { initials: 'KA', name: 'Khalid Al-Rashid', title: 'Chief Operating Officer', scope: 'Group operations, service delivery across all thirteen sectors. International operations and service delivery oversight.' },
  { initials: 'SF', name: 'Sarah Fairclough', title: 'Chief Financial Officer', scope: 'Corporate finance, investment structuring, SPV architecture. FCA-qualified, international reporting standards.' },
  { initials: 'UR', name: 'Usman Raza', title: 'Chief Legal Officer', scope: 'Legal strategy, regulatory compliance, contract governance. SECP and international regulatory liaison.' },
]

const directors = [
  { initials: 'ZM', name: 'Zainab Malik', title: 'Director, Minerals & Mining', scope: 'Provincial mining leases, exploration licensing, offtake agreements. Balochistan & KPK coverage.' },
  { initials: 'JW', name: 'James Whitfield', title: 'Director, Technology & IT', scope: 'Government IT integration, software development partnerships, EdTech initiatives. UK tech sector liaison.' },
  { initials: 'NA', name: 'Nadia Al-Sayed', title: 'Director, Real Estate & Construction', scope: 'CPEC corridor development, commercial property, infrastructure projects. Gulf investor relations.' },
  { initials: 'IK', name: 'Imran Khawaja', title: 'Director, Textiles & Agriculture', scope: 'Export trading, mill aggregation, organic certification, cold chain logistics. TDAP coordination.' },
]

const divisionHeads = [
  { initials: 'OB', name: 'Omar Bukhari', title: 'Head of Aviation & Logistics', scope: 'Charter operations, medical evacuation, VIP transport coordination. CAA regulatory compliance.' },
  { initials: 'RA', name: 'Rebecca Ashworth', title: 'Head of Investor Relations', scope: 'Investor protection, advisory services, portfolio reporting. Diaspora & international investor interface.' },
  { initials: 'TA', name: 'Tariq Abbas', title: 'Head of Government Contracts', scope: 'PPRA procurement, tender preparation, NHA & WAPDA contract management. Federal & provincial liaison.' },
  { initials: 'FS', name: 'Fatima Al-Suwaidi', title: 'Head of Licensing & Compliance', scope: 'FBR, BOI, SECP filings. Business setup, import/export documentation, regulatory approvals across all sectors.' },
]

const divisionHeadExtra = { initials: 'HQ', name: 'Hassan Qureshi', title: 'Head of Pharmaceuticals & Energy', scope: 'DRAP registration, GMP compliance, manufacturing partnerships. NEPRA & energy sector coordination.' }

function TeamCard({ person, large = false }: { person: { initials: string; name: string; title: string; scope: string }; large?: boolean }) {
  return (
    <div className="bg-surface-container border border-outline-variant/10 hover:border-primary/30 p-8 text-center transition-all duration-500 relative group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className={`${large ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-lg'} mx-auto mb-4 flex items-center justify-center cinzel-text font-semibold text-primary border ${large ? 'border-primary/40 bg-primary/10' : 'border-primary/20 bg-primary/5'} rounded-full`}>
        {person.initials}
      </div>
      <div className="cinzel-text text-base font-semibold text-on-surface mb-1">{person.name}</div>
      <div className="raleway-text text-xs font-medium tracking-[0.08em] uppercase text-primary mb-3">{person.title}</div>
      <div className="raleway-text text-xs text-on-surface-variant/60 leading-relaxed">{person.scope}</div>
    </div>
  )
}

export default function TeamPage() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">

        {/* HERO */}
        <section className="relative min-h-[60dvh] md:min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Team.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/about" className="raleway-text text-xs tracking-[0.15em] uppercase text-on-surface-variant hover:text-primary transition-colors mb-6 inline-block">&larr; Back to About</Link>
            <div className="h-px w-16 bg-primary mb-8"></div>
            <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">CZAAH Group</p>
            <h1 className="cinzel-text text-2xl sm:text-4xl md:text-6xl font-bold text-on-surface mb-8">Our <span className="text-primary">Team.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl">A senior team drawn from Pakistan, the Gulf, and the United Kingdom &mdash; combining institutional access with international discipline across thirteen sectors.</p>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* LEADERSHIP */}
        <section className="py-32 px-8 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Our <span className="text-primary">leadership.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-16">Sector specialists, regulatory navigators, and institutional operators &mdash; each role mapped directly to CZAAH&apos;s verticals.</p>

            {/* FOUNDERS */}
            <div className="mb-16 stagger">
              <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6 pb-3 border-b border-primary/15">Founders</div>
              <div className="grid md:grid-cols-2 gap-5 max-w-[720px] mx-auto">
                {founders.map((p, i) => <TeamCard key={i} person={p} large />)}
              </div>
            </div>

            {/* SENIOR EXECUTIVES */}
            <div className="mb-16 stagger">
              <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6 pb-3 border-b border-primary/15">Senior Executives</div>
              <div className="grid md:grid-cols-2 gap-5 max-w-[720px] mx-auto">
                {seniorExecs.map((p, i) => <TeamCard key={i} person={p} large />)}
              </div>
            </div>

            {/* C-SUITE */}
            <div className="mb-16 stagger">
              <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6 pb-3 border-b border-primary/15">Executive Leadership</div>
              <div className="grid md:grid-cols-3 gap-5">
                {cSuite.map((p, i) => <TeamCard key={i} person={p} />)}
              </div>
            </div>

            {/* DIRECTORS */}
            <div className="mb-16 stagger">
              <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6 pb-3 border-b border-primary/15">Sector Directors</div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
                {directors.map((p, i) => <TeamCard key={i} person={p} />)}
              </div>
            </div>

            {/* DIVISION HEADS */}
            <div className="stagger">
              <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6 pb-3 border-b border-primary/15">Division Heads</div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
                {divisionHeads.map((p, i) => <TeamCard key={i} person={p} />)}
              </div>
              <div className="grid md:grid-cols-2 gap-5 max-w-[720px] mx-auto mt-5">
                <TeamCard person={divisionHeadExtra} />
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest text-center fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Work with <span className="text-primary">us.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">Seventeen professionals across thirteen sectors &mdash; every vertical covered, every relationship maintained.</p>
            <Link href="/contact#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Get in Touch &rarr;</Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
