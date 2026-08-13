'use client';
// @ts-nocheck

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface Connection {
  name: string;
  type: string;
  description: string;
  depth: number;
}

interface Category {
  name: string;
  icon: string;
  description: string;
  connections: Connection[];
}

const categories: Category[] = [
  {
    name: 'Government', icon: 'account_balance',
    description: "Direct access to Pakistan's federal and provincial government departments, regulatory agencies, and policy-making bodies. CZAAH maintains active relationships across all tiers of governance.",
    connections: [
      { name: 'Ministry of Commerce', type: '\u25A0', description: 'Trade policy, export facilitation, bilateral agreements', depth: 5 },
      { name: 'Board of Investment', type: '\u25A0', description: 'FDI approvals, investor facilitation, incentive packages', depth: 5 },
      { name: 'SECP', type: '\u25A0', description: 'Corporate registration, securities regulation, compliance', depth: 4 },
      { name: 'FBR', type: '\u25A0', description: 'Tax policy, customs facilitation, duty structures', depth: 4 },
      { name: 'Provincial Mines Depts', type: '\u25A0', description: 'Mining leases, exploration licenses, provincial regulation', depth: 5 },
      { name: 'Planning Commission', type: '\u25A0', description: 'National development projects, PSDP allocations', depth: 4 },
      { name: 'PPRA', type: '\u25A0', description: 'Public procurement regulation, tender compliance', depth: 3 },
      { name: 'IT Ministry', type: '\u25A0', description: 'Digital Pakistan initiatives, tech policy, e-governance', depth: 4 }
    ]
  },
  {
    name: 'Industry', icon: 'factory',
    description: "Established relationships with Pakistan's leading industrial groups, manufacturers, and trade bodies across all major sectors.",
    connections: [
      { name: 'FPCCI', type: '\u2699', description: 'Federation of Pakistan Chambers of Commerce & Industry', depth: 5 },
      { name: 'Chambers of Commerce', type: '\u2699', description: 'LCCI, KCCI, ICCI \u2014 regional trade bodies', depth: 4 },
      { name: 'Mining Operators', type: '\u25C6', description: 'Active extraction companies across Balochistan and KPK', depth: 5 },
      { name: 'Textile Manufacturers', type: '\u2746', description: 'Export-oriented mills, garment producers, home textiles', depth: 4 },
      { name: 'Construction Firms', type: '\u26E8', description: 'Infrastructure contractors, real estate developers', depth: 4 },
      { name: 'Agricultural Cooperatives', type: '\u2618', description: 'Farming cooperatives, food processing, agri-export', depth: 3 }
    ]
  },
  {
    name: 'Financial', icon: 'payments',
    description: "Deep connections across Pakistan's banking sector, development finance institutions, and private capital markets for investment structuring and financing.",
    connections: [
      { name: 'HBL', type: '$', description: "Pakistan's largest private bank, corporate banking", depth: 4 },
      { name: 'UBL', type: '$', description: 'United Bank Limited, trade finance specialist', depth: 4 },
      { name: 'MCB', type: '$', description: 'MCB Bank, commercial and SME banking', depth: 3 },
      { name: 'IFC', type: '$', description: 'International Finance Corporation, development capital', depth: 4 },
      { name: 'ADB Pakistan', type: '$', description: 'Asian Development Bank, infrastructure financing', depth: 3 },
      { name: 'DFID', type: '$', description: 'UK development finance, governance programmes', depth: 3 },
      { name: 'Private Equity Firms', type: '$', description: 'Pakistan-focused PE and growth capital funds', depth: 4 },
      { name: 'Islamic Finance', type: '$', description: 'Shariah-compliant financing, sukuk structures', depth: 3 }
    ]
  },
  {
    name: 'Legal & Advisory', icon: 'balance',
    description: "Vetted network of legal, tax, and advisory professionals with deep expertise in Pakistani corporate law, international transactions, and dispute resolution.",
    connections: [
      { name: 'Corporate Law Firms', type: '\u2696', description: 'M&A, corporate structuring, regulatory advisory', depth: 5 },
      { name: 'Tax Advisory', type: '\u2696', description: 'FBR compliance, transfer pricing, tax planning', depth: 4 },
      { name: 'IP Specialists', type: '\u2696', description: 'Trademark, patent, trade secret protection', depth: 3 },
      { name: 'Dispute Resolution', type: '\u2696', description: 'Commercial litigation, mediation, arbitration', depth: 4 },
      { name: 'International Arbitration', type: '\u2696', description: 'Cross-border dispute resolution, BIT claims', depth: 4 },
      { name: 'Accounting Firms', type: '\u2696', description: 'Audit, assurance, financial due diligence', depth: 4 }
    ]
  },
  {
    name: 'International', icon: 'public',
    description: "Active engagement with UK institutions, foreign diplomatic missions, trade promotion bodies, and multilateral organisations across our operating markets.",
    connections: [
      { name: 'UK DIT', type: '\u2691', description: 'UK Department for Business & Trade, bilateral commerce, export support', depth: 4 },
      { name: 'Companies House', type: '\u2691', description: 'UK company registry, incorporation, statutory compliance', depth: 4 },
      { name: 'Chinese Embassy', type: '\u2691', description: 'Commercial section, CPEC coordination, trade promotion', depth: 5 },
      { name: 'UAE Trade Offices', type: '\u2691', description: 'UAE-Pakistan trade facilitation, investment promotion', depth: 4 },
      { name: 'USAID', type: '\u2691', description: 'Development programmes, governance, economic growth', depth: 3 },
      { name: 'World Bank Pakistan', type: '\u2691', description: 'Development projects, policy reform, technical assistance', depth: 4 },
      { name: 'CPEC Authority', type: '\u2691', description: 'China-Pakistan Economic Corridor coordination body', depth: 5 }
    ]
  },
  {
    name: 'Military & Strategic', icon: 'military_tech',
    description: "Awareness of Pakistan's strategic and defence-adjacent institutional landscape, including welfare trusts and logistics entities relevant to infrastructure and development projects.",
    connections: [
      { name: 'Fauji Foundation', type: '\u2605', description: 'Defence welfare conglomerate, industrial operations', depth: 4 },
      { name: 'Army Welfare Trust', type: '\u2605', description: 'Welfare investments, commercial operations', depth: 3 },
      { name: 'Defence Logistics', type: '\u2605', description: 'Supply chain, transport, facility management', depth: 3 },
      { name: 'Strategic Projects', type: '\u2605', description: 'Infrastructure and development project support', depth: 3 },
      { name: 'NLC', type: '\u2605', description: 'National Logistics Cell, transport and infrastructure', depth: 4 },
      { name: 'FWO', type: '\u2605', description: 'Frontier Works Organisation, construction and engineering', depth: 4 }
    ]
  }
];

export default function PartnershipDevelopmentPage() {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const toggleCategory = (index: number) => {
    setActiveIndex(activeIndex === index ? -1 : index);
  };

  const activeCat = activeIndex >= 0 ? categories[activeIndex] : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Partnership-Development.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Local Expertise</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Partnership<br /><span className="text-primary">Development.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              CZAAH&apos;s deepest value is our network. We connect investors with the most relevant government departments, industry leaders, legal experts, financial institutions, and operational partners across the UK, Pakistan, and our international markets &mdash; curated introductions that accelerate your success.
            </p>
            <Link href="/contact?interest=Partnership%20Development#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Build Partnerships &rarr;
            </Link>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Network Constellation */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our network <span className="text-primary">constellation.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-10">Explore CZAAH&apos;s institutional relationships across the UK, Pakistan, and international government, industry, and financial landscape.</p>

            {/* Category Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
              {categories.map((cat, i) => (
                <div
                  key={cat.name}
                  onClick={() => toggleCategory(i)}
                  className={`cursor-pointer border p-5 text-center transition-all duration-300 ${
                    activeIndex === i
                      ? 'border-primary/60 bg-surface-container-low shadow-[0_0_20px_rgba(230,195,100,0.08)]'
                      : 'border-outline-variant/10 bg-surface-container-low hover:border-primary/30'
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl mb-2 block ${activeIndex === i ? 'text-primary' : 'text-on-surface-variant/50'}`}>{cat.icon}</span>
                  <span className={`raleway-text text-xs font-medium ${activeIndex === i ? 'text-primary' : 'text-on-surface-variant'}`}>{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Active Category Detail */}
            {activeCat && (
              <div className="bg-surface-container-lowest border border-outline-variant/10 p-8 md:p-10 transition-all duration-500">
                <div className="mb-6">
                  <div className="cinzel-text text-xl font-semibold text-on-surface mb-2">{activeCat.name}</div>
                  <div className="raleway-text text-sm text-on-surface-variant leading-relaxed">{activeCat.description}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCat.connections.map((conn) => (
                    <div key={conn.name} className="border border-outline-variant/10 bg-surface-container-low p-5 hover:border-primary/30 transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="raleway-text text-sm font-semibold text-on-surface">{conn.name}</span>
                        <span className="raleway-text text-[0.65rem] font-semibold uppercase tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5">Active</span>
                      </div>
                      <div className="raleway-text text-xs text-on-surface-variant/60 mb-3">{conn.description}</div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(d => (
                          <span key={d} className={`w-2 h-2 ${d <= conn.depth ? 'bg-primary' : 'bg-outline-variant/20'}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Curated introductions and partnership structuring &mdash; connecting you with the right people at the right level across our institutions in the UK, Pakistan, and beyond.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'account_balance', title: 'Government Liaison', desc: "Direct introductions to relevant government departments, ministries, and regulatory bodies across our operating markets. We navigate the bureaucracy so you don't have to — opening doors that matter." },
                { icon: 'handshake', title: 'Industry Partnerships', desc: 'Connections with established companies, manufacturers, and service providers. We match your operational needs with vetted, capable partners who have the track record to deliver.' },
                { icon: 'gavel', title: 'Legal & Accounting', desc: 'Access to vetted law firms, chartered accountants, and tax advisors with international experience. We connect you with professionals who understand both local law and international investor expectations.' },
                { icon: 'payments', title: 'Financial Institutions', desc: "Banking relationships, development finance institutions, private equity introductions. We facilitate access to the financial ecosystem in every market we operate — from commercial banks to DFIs to private capital." },
                { icon: 'engineering', title: 'Developer & Contractor Networks', desc: 'Construction companies, real estate developers, and infrastructure contractors. When your investment requires physical execution, we connect you with contractors who deliver on time and on budget.' },
                { icon: 'group_add', title: 'Joint Venture Structuring', desc: 'Partner identification, JV negotiation support, partnership agreement frameworks. We help you find the right partner and structure the relationship to protect your interests while enabling mutual success.' },
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

        {/* Stats */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Partnership network <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ number: 'UK · Pakistan · UAE', label: 'Markets covered' }, { number: 'Cross-party', label: 'Pakistan political coverage' }, { number: 'Vetted', label: 'Partner network' }, { number: 'Decades', label: 'Relationship depth' }].map((stat, i) => (
                <div key={i}><div className="cinzel-text text-2xl md:text-3xl text-primary mb-2">{stat.number}</div><div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div></div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Why CZAAH */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Why <span className="text-primary">CZAAH.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Across every market we operate in, relationships determine outcomes. Ours are the ones that move deals forward.</p>
            <div className="space-y-4">
              {[
                { icon: 'diamond', title: 'Relationship Depth', desc: "Our network is built on years of direct engagement with government officials, industry leaders, and institutional stakeholders across the UK, Pakistan, and our international markets. These are not cold introductions — they are warm, trusted connections with established credibility." },
                { icon: 'diversity_3', title: 'Cross-Party Access', desc: "Pakistan's political landscape shifts between administrations. CZAAH maintains relationships across all major political parties, ensuring your partnerships and projects have continuity regardless of who governs." },
                { icon: 'person_search', title: 'Curated Introductions', desc: "We don't provide contact lists — we provide curated, purposeful introductions to the specific individuals who can advance your objectives. Every connection is selected for relevance, capability, and reliability." },
                { icon: 'handshake', title: 'Long-Term Partnership Approach', desc: "We invest in relationships that endure. CZAAH doesn't facilitate one-off introductions — we build partnership ecosystems that support your investment through every phase, from entry to expansion to exit." },
              ].map((card, i) => (
                <div key={i} className="flex items-start gap-6 border border-outline-variant/10 bg-surface-container-low p-6 hover:border-primary/30 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0 mt-1">{card.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-base font-semibold text-on-surface mb-2">{card.title}</h4>
                    <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">The relationships that <span className="text-primary">matter.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Government departments, industry leaders, legal experts, and institutional partners across the UK, Pakistan, and beyond &mdash; curated introductions that accelerate outcomes.</p>
            <Link href="/contact?interest=Partnership%20Development#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Discuss Your Objectives &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
