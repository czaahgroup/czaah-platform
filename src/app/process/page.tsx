// @ts-nocheck
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

const processSteps = [
  { num: '01', title: 'Initial Consultation', desc: "A confidential discussion to understand your investment objectives, risk appetite, sector preferences, and timeline. We map the right opportunities to your goals across any of our twelve active sectors." },
  { num: '02', title: 'Investment Assessment & Proposal', desc: "Our team conducts comprehensive market analysis, feasibility assessment, and due diligence on shortlisted opportunities. You receive a detailed investment proposal with financial projections, risk analysis, regulatory requirements, and recommended deal structure." },
  { num: '03', title: 'Legal & Licensing Facilitation', desc: "We handle all regulatory navigation \u2014 SECP registration, BOI approvals, FBR compliance, industry licensing, and provincial permits. Our institutional structure provides clean legal frameworks for international investors." },
  { num: '04', title: 'Investment Execution', desc: "With approvals in place, we execute the investment \u2014 whether it's acquiring a mining lease, purchasing commercial property, securing a government contract, or establishing a manufacturing JV. Every transaction is documented, insured, and transparent." },
  { num: '05', title: 'Ongoing Portfolio Management', desc: "Post-investment, CZAAH provides continuous oversight \u2014 financial reporting, asset management, regulatory compliance, performance monitoring, and strategic guidance. You have a dedicated team managing your Pakistan portfolio." },
]

const principles = [
  { icon: 'visibility', title: 'Transparency', desc: 'Every step documented, every decision explained. Full visibility into fees, timelines, and risk factors.' },
  { icon: 'bolt', title: 'Speed', desc: 'Regulatory relationships that compress timelines. What takes others months, we accomplish in weeks.' },
  { icon: 'shield', title: 'Protection', desc: 'Legal safeguards and insurance at every stage. Your capital is protected by international-grade frameworks.' },
  { icon: 'assessment', title: 'Reporting', desc: 'Quarterly reports, real-time portfolio access, and a dedicated relationship manager for every engagement.' },
]

export default function ProcessPage() {
  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">

        {/* HERO */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest">
          <div className="max-w-[1600px] mx-auto">
            <div className="h-px w-16 bg-primary mb-8"></div>
            <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">Our Process</p>
            <h1 className="cinzel-text text-4xl md:text-6xl font-bold text-on-surface mb-8">How it <span className="text-primary">works.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">A transparent, structured process designed to give international investors confidence at every stage &mdash; from initial assessment through ongoing portfolio management.</p>
            <Link href="/contact" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Begin a Consultation &rarr;</Link>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* PROCESS STEPS */}
        <section className="py-32 px-8 md:px-24 bg-surface">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Your investment <span className="text-primary">journey.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-16">Five stages, each designed for clarity, speed, and investor protection.</p>

            <div className="space-y-0">
              {processSteps.map((step, i) => (
                <div key={i} className="flex gap-8 p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 bg-surface-container-lowest group">
                  <div className="cinzel-text text-4xl font-bold text-primary/30 group-hover:text-primary transition-colors shrink-0">{step.num}</div>
                  <div>
                    <h4 className="cinzel-text text-lg font-bold text-on-surface mb-3">{step.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-[15px] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* WHY THIS PROCESS WORKS */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Why this process <span className="text-primary">works.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-16">The principles that institutional investors expect from an emerging market counterparty.</p>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-px bg-outline-variant/10 border border-outline-variant/10">
              {principles.map((item, i) => (
                <div key={i} className="bg-surface-container p-10 text-center hover:bg-surface transition-colors duration-500">
                  <span className="material-symbols-outlined text-primary text-3xl mb-6 block">{item.icon}</span>
                  <h3 className="cinzel-text text-base font-bold text-on-surface mb-3">{item.title}</h3>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Ready to discuss <span className="text-primary">next steps?</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">A single consultation is all it takes to begin. Our team will assess your objectives and outline a tailored path forward.</p>
            <Link href="/contact" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Consultation &rarr;</Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
