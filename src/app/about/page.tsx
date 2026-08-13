'use client'
// @ts-nocheck

import { useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function AboutPage() {
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
        <section className="relative min-h-[60dvh] md:min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/About.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-20 md:py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <div className="w-full md:w-2/3 max-w-3xl">
              <div className="h-px w-16 bg-primary mb-8"></div>
              <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">About CZAAH</p>
              <h1 className="cinzel-text text-2xl sm:text-4xl md:text-6xl font-bold text-on-surface mb-8">About <span className="text-primary">CZAAH.</span></h1>
              <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl">CZAAH Group is a London-based International Investment Facilitation Group connecting investors, businesses and strategic partners with opportunities across the United Kingdom, Pakistan and international markets &mdash; with additional presence in Brussels and Hong Kong.</p>
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* MISSION & VISION */}
        <section className="py-32 px-8 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Mission &amp; <span className="text-primary">Vision.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-12">The principles behind every decision, every partnership, and every investment we facilitate.</p>

            <div className="grid md:grid-cols-2 gap-16 mt-12">
              <div className="fade-in-left">
                <h3 className="cinzel-text text-xl font-bold text-on-surface mb-4">Our <span className="text-primary">Mission</span></h3>
                <p className="raleway-text text-on-surface-variant text-[15px] leading-relaxed mb-4">With London at the centre of our international operations, we facilitate opportunities across International Real Estate, Construction &amp; Development, International Manpower, Mines &amp; Minerals, and other strategic sectors.</p>
                <p className="raleway-text text-on-surface-variant text-[15px] leading-relaxed">Our international network connects capital, businesses, projects, resources and talent across borders, combining our London presence with strong relationships in Pakistan and selected global markets.</p>
              </div>
              <div className="fade-in-right">
                <h3 className="cinzel-text text-xl font-bold text-on-surface mb-4">Our <span className="text-primary">Vision</span></h3>
                <p className="raleway-text text-on-surface-variant text-[15px] leading-relaxed mb-4">To build the definitive international investment facilitation group &mdash; a trusted counterparty connecting capital, businesses and strategic partners across the United Kingdom, Pakistan, and beyond.</p>
                <p className="raleway-text text-on-surface-variant text-[15px] leading-relaxed">We are building an institution that outlasts any single deal, any single administration, and any single market cycle.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* OUR STRUCTURE */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Our <span className="text-primary">structure.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-12">An institutional architecture designed for international investor confidence and operational efficiency.</p>

            <div className="grid md:grid-cols-3 gap-px bg-outline-variant/10 stagger">
              <div className="bg-surface-container p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500">
                <span className="material-symbols-outlined text-primary text-3xl mb-6 block">location_city</span>
                <h3 className="cinzel-text text-lg font-bold text-on-surface mb-3">CZAAH Group (London)</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Our London-based parent entity, coordinating international operations, investor relations, and strategic partnerships across the United Kingdom, Pakistan, and global markets.</p>
              </div>
              <div className="bg-surface-container p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500">
                <span className="material-symbols-outlined text-primary text-3xl mb-6 block">diamond</span>
                <h3 className="cinzel-text text-lg font-bold text-on-surface mb-3">CZAAH Capital &amp; Ventures (Pakistan)</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">SECP-registered operating company in Pakistan. Coordinates government relations, local deal facilitation, and on-the-ground investment management. Headquartered in Islamabad with reach across all provinces.</p>
              </div>
              <div className="bg-surface-container p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500">
                <span className="material-symbols-outlined text-primary text-3xl mb-6 block">account_tree</span>
                <h3 className="cinzel-text text-lg font-bold text-on-surface mb-3">Deal-Level SPVs</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Individual Special Purpose Vehicles created per major deal or project. Protects investors from cross-deal risk and allows sector-specific participation without exposure to the full group portfolio.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* WHY CHOOSE CZAAH */}
        <section className="py-32 px-8 md:px-24 bg-surface fade-in-left">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">The CZAAH <span className="text-primary">difference.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-12">In a market where access, relationships, and institutional discipline determine outcomes.</p>

            <div className="space-y-0 stagger">
              {[
                { icon: 'hub', title: 'Cross-Party Coverage', desc: 'Relationships spanning PTI, PMLN, PPP. Business continuity regardless of which administration is in power. Your investments are protected through political transitions.' },
                { icon: 'location_on', title: 'On-the-Ground Presence', desc: 'Headquartered in Islamabad with reach across all provinces. Physical due diligence, direct government access, real-time market intelligence \u2014 not remote advisory.' },
                { icon: 'verified', title: 'Institutional Standards', desc: 'International-grade compliance, transparent reporting, clean legal frameworks. We bring institutional discipline to an emerging market that demands it.' },
                { icon: 'language', title: 'International Reach', desc: 'Multi-market presence enables USD-denominated transactions, international investor comfort, and clean regulatory frameworks across key global markets.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6 p-8 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 bg-surface-container-lowest">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1 shrink-0">{item.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-base font-bold text-on-surface mb-2">{item.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* STATS */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest text-center fade-in-scale">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-16">CZAAH at a <span className="text-primary">glance.</span></h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline-variant/10 border border-outline-variant/10 stagger">
              {[
                { number: '13', label: 'Active sectors' },
                { number: '4', label: 'International markets' },
                { number: '6', label: 'Regional investor networks' },
                { number: '3', label: 'Political administrations covered' },
              ].map((stat, i) => (
                <div key={i} className="bg-surface-container p-10">
                  <div className="cinzel-text text-4xl md:text-5xl font-bold text-primary mb-2">{stat.number}</div>
                  <div className="raleway-text text-xs font-semibold tracking-[0.1em] uppercase text-on-surface-variant">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface text-center fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Your international <span className="text-primary">investment partner.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">Market entry, capital deployment, or strategic partnership &mdash; one conversation is where it begins.</p>
            <Link href="/contact#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Consultation &rarr;</Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
