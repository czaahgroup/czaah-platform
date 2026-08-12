'use client';
// @ts-nocheck

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface Tender {
  dept: string;
  title: string;
  sector: string;
  value: string;
  status: string;
  deadline: string;
  bidType: string;
}

const tenders: Tender[] = [
  { dept: "NHA \u2014 National Highway Authority", title: "M-14 Motorway Extension \u2014 Phase III", sector: "Infrastructure", value: "PKR 12.5B", status: "Open", deadline: "31 Mar 2026", bidType: "Pre-qualification required" },
  { dept: "WAPDA \u2014 Water & Power Development Authority", title: "50MW Solar Farm Procurement (Cholistan)", sector: "Energy", value: "PKR 8.2B", status: "Open", deadline: "15 Apr 2026", bidType: "Pre-qualification required" },
  { dept: "NADRA \u2014 National Database & Registration Authority", title: "National Database Modernisation", sector: "IT & Digital", value: "PKR 3.1B", status: "Closing Soon", deadline: "18 Mar 2026", bidType: "Open bidding" },
  { dept: "NHA \u2014 National Highway Authority", title: "Sukkur-Hyderabad Motorway Resurfacing", sector: "Infrastructure", value: "PKR 5.7B", status: "Open", deadline: "22 May 2026", bidType: "Pre-qualification required" },
  { dept: "FBR \u2014 Federal Board of Revenue", title: "Tax Administration Digital Platform", sector: "IT & Digital", value: "PKR 1.8B", status: "Upcoming", deadline: "10 Jun 2026", bidType: "Open bidding" },
  { dept: "WAPDA \u2014 Water & Power Development Authority", title: "Transmission Line Upgrade (Northern Grid)", sector: "Energy", value: "PKR 6.4B", status: "Closing Soon", deadline: "25 Mar 2026", bidType: "Pre-qualification required" },
  { dept: "Defence \u2014 Ministry of Defence", title: "Logistics Hub Construction (Southern Command)", sector: "Defence", value: "PKR 4.2B", status: "Open", deadline: "30 Apr 2026", bidType: "Pre-qualification required" },
  { dept: "Provincial Govt \u2014 Government of Punjab", title: "E-Governance Platform (Punjab)", sector: "IT & Digital", value: "PKR 2.3B", status: "Upcoming", deadline: "15 Jul 2026", bidType: "Open bidding" }
];

function badgeColor(status: string): string {
  if (status === "Open") return "bg-green-500/10 text-green-400 border-green-500/20";
  if (status === "Closing Soon") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-primary/10 text-primary border-primary/20";
}

export default function GovernmentPage() {
  const [activeSector, setActiveSector] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All Status");

  const filteredTenders = tenders.filter(t => {
    const matchSector = activeSector === "All" || t.sector === activeSector;
    const matchStatus = activeStatus === "All Status" || t.status === activeStatus;
    return matchSector && matchStatus;
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Government.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Government Procurement</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Government<br /><span className="text-primary">Contracts.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Pakistan&apos;s annual public procurement exceeds PKR 2 trillion across infrastructure, energy, IT, and defence. Navigating this market requires deep institutional knowledge, regulatory expertise, and established relationships. That&apos;s what we provide.
            </p>
            <Link href="/contact?interest=Government%20Contracts#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Explore Opportunities &rarr;
            </Link>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Tender Pipeline */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Active tender <span className="text-primary">pipeline.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-8">Current and upcoming government procurement opportunities across Pakistan&apos;s priority sectors.</p>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="flex flex-wrap gap-2">
                {["All", "Infrastructure", "Energy", "IT & Digital", "Defence"].map(s => (
                  <button key={s} onClick={() => setActiveSector(s)} className={`raleway-text text-xs font-medium px-4 py-2 border transition-all ${activeSector === s ? 'liquid-gold-bg text-on-primary border-primary' : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant hover:border-primary/40'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-outline-variant/20 mx-2" />
              <div className="flex flex-wrap gap-2">
                {["All Status", "Open", "Closing Soon", "Upcoming"].map(s => (
                  <button key={s} onClick={() => setActiveStatus(s)} className={`raleway-text text-xs font-medium px-4 py-2 border transition-all ${activeStatus === s ? 'liquid-gold-bg text-on-primary border-primary' : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant hover:border-primary/40'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="raleway-text text-xs text-on-surface-variant/50 ml-4">
                Showing <span className="text-primary font-semibold">{filteredTenders.length}</span> of <span className="text-primary font-semibold">{tenders.length}</span> opportunities
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTenders.map((t, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-6 hover:border-primary/30 transition-all duration-300 flex items-start gap-4">
                  <div className="flex-1">
                    <span className={`inline-block raleway-text text-[0.65rem] font-semibold uppercase tracking-wider px-2.5 py-1 border mb-3 ${badgeColor(t.status)}`}>{t.status}</span>
                    <div className="raleway-text text-xs text-on-surface-variant/50 mb-1">{t.dept}</div>
                    <div className="cinzel-text text-sm font-semibold text-on-surface mb-2">{t.title}</div>
                    <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant mb-2">
                      <span className="text-primary font-semibold">{t.value}</span>
                      <span>Deadline: {t.deadline}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="raleway-text text-[0.65rem] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">{t.sector}</span>
                      <span className="raleway-text text-[0.65rem] text-on-surface-variant/50">{t.bidType}</span>
                    </div>
                  </div>
                  <span className="text-primary text-lg">&rarr;</span>
                </div>
              ))}
            </div>

            <p className="raleway-text text-xs text-on-surface-variant/40 mt-6 text-center">Pipeline updated regularly. <strong className="text-on-surface-variant">Contact CZAAH</strong> for detailed tender documentation and bid support.</p>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Comprehensive support for international and domestic firms competing in Pakistan&apos;s public procurement market.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'search', title: 'Tender Intelligence', desc: 'Real-time monitoring of federal and provincial tender announcements across NHA, WAPDA, NADRA, FBR, and provincial works departments. Early identification of opportunities that match your capabilities.' },
                { icon: 'edit_document', title: 'Bid Preparation', desc: 'End-to-end bid support — from pre-qualification documentation to technical and financial proposal preparation. We ensure your submissions meet every requirement first time.' },
                { icon: 'verified', title: 'Regulatory Compliance', desc: 'Navigate PPRA (federal) and provincial procurement frameworks — SPPRA, KPPRA, PPRA Punjab. Full compliance management across registration, certification, and reporting requirements.' },
                { icon: 'groups', title: 'Government Relations', desc: 'Institutional introductions and stakeholder engagement with the relevant government departments, ensuring your firm is positioned as a credible and trusted partner.' },
                { icon: 'task_alt', title: 'Contract Management', desc: 'Ongoing support through contract execution — milestone tracking, compliance reporting, payment facilitation, and government liaison throughout the project lifecycle.' },
                { icon: 'handshake', title: 'Local Partnership', desc: 'For international firms requiring an in-country partner to meet local participation requirements, CZAAH provides the institutional presence and local expertise you need.' },
              ].map((card, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="cinzel-text text-base font-semibold text-on-surface mb-3">{card.title}</h3>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Priority Sectors */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Priority <span className="text-primary">sectors.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Four high-value government sectors where deep institutional knowledge and established relationships make the difference.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: 'route', title: 'NHA \u2014 Infrastructure', desc: "Pakistan's largest infrastructure spending pipeline — roads, bridges, highways, and motorways across the country. CPEC has accelerated the infrastructure programme significantly." },
                { icon: 'bolt', title: 'WAPDA \u2014 Energy', desc: "Solar, wind, transmission, mini-hydro, and energy storage. Pakistan's energy transition is creating massive procurement demand for international technology and engineering firms." },
                { icon: 'devices', title: 'Government IT', desc: 'NADRA, FBR, and provincial e-governance digitisation programmes. Modernisation mandates are creating sustained demand for enterprise technology vendors and systems integrators.' },
                { icon: 'shield', title: 'Defence & Logistics', desc: 'Facility management, logistics infrastructure, IT systems, and operational support for defence establishments. A significant and recurring procurement category.' },
              ].map((card, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="cinzel-text text-base font-semibold text-on-surface mb-3">{card.title}</h3>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* How We Work */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">How we <span className="text-primary">work.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">A structured process from opportunity identification through to contract award and execution support.</p>
            <div className="space-y-4">
              {[
                { title: 'Market Assessment', desc: 'We analyse the government procurement pipeline, identify tenders aligned with your capabilities, and provide a clear picture of the competitive landscape and win probability.' },
                { title: 'Pre-Qualification & Registration', desc: 'Ensure your firm is registered with the relevant procuring agencies, meets all eligibility criteria, and has the required certifications and documentation in place.' },
                { title: 'Bid Strategy & Submission', desc: 'Develop your technical and financial proposals with deep knowledge of evaluation criteria, pricing benchmarks, and procuring agency expectations. We manage the full submission process.' },
                { title: 'Award & Mobilisation', desc: 'Post-award support including contract negotiation, performance bond arrangements, team mobilisation, and initial government stakeholder coordination.' },
                { title: 'Ongoing Contract Support', desc: 'Continuous government liaison, compliance monitoring, progress reporting, and issue resolution throughout the contract lifecycle — ensuring smooth execution and timely payments.' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-6 border border-outline-variant/10 bg-surface-container-low p-6 hover:border-primary/30 transition-all duration-300">
                  <span className="cinzel-text text-2xl text-primary font-bold min-w-[2.5rem]">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h4 className="cinzel-text text-base font-semibold text-on-surface mb-2">{step.title}</h4>
                    <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Stats */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ number: 'PKR 2T+', label: 'Annual government procurement spend' }, { number: 'PPRA', label: 'Federal procurement framework' }, { number: '4', label: 'Priority government sectors' }, { number: 'CPEC', label: 'Expanding the infrastructure pipeline' }].map((stat, i) => (
                <div key={i}><div className="cinzel-text text-2xl md:text-3xl text-primary mb-2">{stat.number}</div><div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div></div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Regulatory Landscape */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="cinzel-text text-2xl text-on-surface mb-4">Regulatory <span className="text-primary">landscape.</span></h3>
              <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-4">Pakistan&apos;s public procurement is governed by PPRA at the federal level, with provincial equivalents &mdash; SPPRA (Sindh), KPPRA (KPK), and PPRA Punjab &mdash; governing regional tenders.</p>
              <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">Each framework has distinct registration requirements, evaluation methodologies, and compliance standards. CZAAH maintains expertise across all procurement regulatory bodies, ensuring your bids are compliant and competitive regardless of jurisdiction.</p>
            </div>
            <div>
              <h3 className="cinzel-text text-2xl text-on-surface mb-4">Key <span className="text-primary">departments.</span></h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {['NHA', 'WAPDA', 'NADRA', 'FBR', 'PITB', 'Planning Commission', 'Provincial Works Depts', 'Defence Logistics'].map(tag => (
                  <span key={tag} className="raleway-text text-xs px-3 py-1.5 bg-primary/10 text-primary border border-primary/20">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Compete in Pakistan&apos;s <span className="text-primary">public sector.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Tender identification, bid preparation, regulatory compliance, and government relationships &mdash; the infrastructure to win.</p>
            <Link href="/contact?interest=Government%20Contracts#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Discuss a Tender &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
