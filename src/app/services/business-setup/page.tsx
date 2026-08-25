'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

const entities: Record<string, {
  steps: string[];
  docs: string[];
  timeline: string;
  jurisdiction: string;
  keyInfo: string;
  description: string;
}> = {
  plc: {
    steps: ['Name reservation (SECP)', 'Digital filing & incorporation', 'NTN & tax registration (FBR)', 'Bank account opening', 'Registered office setup', 'Compliance infrastructure'],
    docs: ['Passport copies', 'Power of Attorney', 'MOA/AOA drafts', 'Proof of address', 'Director details'],
    timeline: '7\u201315 business days',
    jurisdiction: 'Pakistan (SECP)',
    keyInfo: 'Min. 2 directors, min. 1 shareholder, PKR 100K min. capital',
    description: 'Private Limited Company'
  },
  smc: {
    steps: ['Name reservation', 'SMC incorporation (SECP)', 'FBR registration', 'Bank account', 'Office setup'],
    docs: ['Passport / CNIC', 'Address proof', 'Nominee director details'],
    timeline: '5\u201310 business days',
    jurisdiction: 'Pakistan (SECP)',
    keyInfo: '1 member only, limited liability, annual compliance required',
    description: 'Single Member Company'
  },
  branch: {
    steps: ['BOI permission application', 'SBP approval (if needed)', 'SECP registration', 'FBR registration', 'Office establishment', 'Reporting setup'],
    docs: ['Parent company incorporation docs', 'Board resolution', 'Financial statements', 'Power of Attorney'],
    timeline: '30\u201360 business days (BOI approval)',
    jurisdiction: 'Pakistan (BOI + SECP)',
    keyInfo: 'Cannot trade directly (liaison), repatriation of profits (branch), annual audit required',
    description: 'Branch / Liaison Office'
  },
  jv: {
    steps: ['Partner identification & vetting', 'JV agreement negotiation', 'SPV incorporation (SECP)', 'Tax & regulatory setup', 'Operational launch', 'Governance framework'],
    docs: ['JV agreement', 'Shareholder agreement', 'MOA/AOA', 'Partner due diligence package'],
    timeline: '30\u201390 days (depending on complexity)',
    jurisdiction: 'Pakistan (cross-border options available)',
    keyInfo: 'Equity split negotiation, board composition, profit sharing, exit mechanisms',
    description: 'Joint Venture Structure'
  },
  spv: {
    steps: ['Structure design', 'SPV incorporation', 'Investment agreement', 'Regulatory filings', 'Capital deployment', 'Reporting & governance'],
    docs: ['Investment agreement', 'Trust deed (if applicable)', 'Regulatory filings', 'Compliance framework'],
    timeline: '10\u201320 business days',
    jurisdiction: 'Pakistan (international options available)',
    keyInfo: 'Asset isolation, investor protection, defined exit, project-specific governance',
    description: 'Special Purpose Vehicle (SPV)'
  },
  uk: {
    steps: ['Company name check (Companies House)', 'Digital incorporation filing', 'Registered office address setup', 'HMRC tax registration (Corporation Tax, VAT if applicable)', 'UK business bank account', 'Compliance & filing infrastructure'],
    docs: ['Passport / ID', 'Proof of address', 'Registered office confirmation', 'Director & PSC (Person with Significant Control) details'],
    timeline: '24\u201348 hours (incorporation), 1\u20132 weeks (banking)',
    jurisdiction: 'United Kingdom (Companies House)',
    keyInfo: 'Min. 1 director, min. 1 shareholder, no minimum capital requirement, London registered office available',
    description: 'UK Limited Company'
  },
  dmcc: {
    steps: ['Jurisdiction assessment', 'License selection (trade/service)', 'Visa allocation', 'Office / flexi-desk setup', 'Bank account (USD)', 'Pakistan entity linkage (if applicable)'],
    docs: ['Passport copies', 'Business plan', 'Proof of address', 'Bank reference letter'],
    timeline: '10\u201320 business days',
    jurisdiction: 'UAE (DMCC Free Zone)',
    keyInfo: 'Tax-efficient structure, 100% ownership, USD banking, repatriation freedom, commodities hub',
    description: 'UAE Free Zone Entity'
  }
};

const entityCards = [
  { key: 'uk', icon: '\u2696', name: 'UK Limited Company', tagline: 'Fast, low-cost incorporation in London', best: 'Best for: International founders, holding companies, UK market entry' },
  { key: 'plc', icon: '\u25C6', name: 'Private Limited Company', tagline: 'The standard for operating in Pakistan', best: 'Best for: International investors, joint ventures, operational businesses' },
  { key: 'smc', icon: '\u25A0', name: 'Single Member Company', tagline: 'Solo ownership, full legal protection', best: 'Best for: Individual investors, freelancers scaling up, sole proprietors' },
  { key: 'branch', icon: '\u21C4', name: 'Branch / Liaison Office', tagline: 'Establish presence without full incorporation', best: 'Best for: MNCs testing the market, representative offices, pre-investment' },
  { key: 'jv', icon: '+', name: 'Joint Venture Structure', tagline: 'Partner with local expertise', best: 'Best for: Mining JVs, construction partnerships, technology partnerships' },
  { key: 'spv', icon: '\u2733', name: 'Special Purpose Vehicle (SPV)', tagline: 'Ring-fenced, deal-specific structure', best: 'Best for: Project finance, real estate investments, mining deals, infrastructure projects' },
  { key: 'dmcc', icon: '$', name: 'UAE Free Zone Entity', tagline: 'International invoicing & USD banking', best: 'Best for: Commodities trading, international clients, USD revenue, global presence' },
];

const serviceCards = [
  { icon: 'diamond', title: 'Company Registration', desc: 'Full incorporation service — name reservation, digital filing with Companies House (UK), SECP (Pakistan), or the relevant free zone authority, certificate of incorporation, and registered agent representation.' },
  { icon: 'settings', title: 'Corporate Structuring', desc: 'Strategic entity design across our operating markets — holding companies, subsidiaries, joint venture structures, and special purpose vehicles tailored to your investment objectives.' },
  { icon: 'star', title: 'Legal Documentation', desc: 'Comprehensive corporate documentation — Memorandum and Articles of Association, shareholder agreements, board resolutions, director appointments, and all statutory filings.' },
  { icon: 'payments', title: 'Bank Account Setup', desc: 'Corporate banking facilitation — commercial bank account opening, foreign currency accounts, payment gateway integration, and banking infrastructure to support your operations.' },
  { icon: 'home_work', title: 'Office Establishment', desc: 'Physical and virtual presence setup — registered office address, virtual office services, commercial workspace procurement, and facility management across London, Islamabad, Lahore, Karachi, and Dubai.' },
  { icon: 'sync_alt', title: 'Ongoing Compliance', desc: 'Post-incorporation regulatory management — annual returns, statutory filings, corporate governance advisory, director and shareholder updates, and ongoing compliance monitoring across every jurisdiction.' },
];

const whyCards = [
  { icon: 'diamond', title: 'Local Expertise, Everywhere We Operate', desc: "Our team has extensive experience navigating corporate registration in the UK, Pakistan, and the UAE. We understand Companies House, SECP, and free zone processes, timelines, and requirements — ensuring your setup is handled correctly the first time." },
  { icon: 'handshake', title: 'Regulatory Relationships', desc: 'Established working relationships with Companies House, SECP, banking institutions, and government departments accelerate your registration and reduce administrative friction at every step.' },
  { icon: 'public', title: 'International Structuring', desc: 'We help clients structure cross-border operations — enabling USD and GBP revenue flows, international invoicing, and clean corporate governance across jurisdictions.' },
  { icon: 'support_agent', title: 'End-to-End Support', desc: 'From initial name search to a fully operational entity with bank accounts, office space, and compliance infrastructure — we manage the entire process so you can focus on your business.' },
];

export default function BusinessSetupPage() {
  const [activeEntity, setActiveEntity] = useState<string | null>(null);

  const handleCardClick = (key: string) => {
    setActiveEntity(activeEntity === key ? null : key);
  };

  const data = activeEntity ? entities[activeEntity] : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Business-Setup.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Setup &amp; Registration</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Business<br /><span className="text-primary">Setup.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              CZAAH guides investors through every step of establishing a business presence in the United Kingdom and international markets — from company incorporation and corporate structuring to legal documentation, bank account opening, and office establishment. Your market entry, managed from formation through operations.
            </p>
            <Link href="/contact?interest=Business%20Setup#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Start Your Setup &rarr;
            </Link>
          </div>
        </section>

        {/* Entity Type Configurator */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface text-center mb-4">
              Choose your <span className="text-primary">entity structure.</span>
            </h2>
            <p className="raleway-text text-on-surface-variant text-center max-w-2xl mx-auto mb-12">
              Select an entity type to see the full setup package — steps, documents, timeline, and jurisdiction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {entityCards.map((card) => (
                <div
                  key={card.key}
                  onClick={() => handleCardClick(card.key)}
                  className={`cursor-pointer border p-7 transition-all duration-300 hover:-translate-y-0.5 ${
                    activeEntity === card.key
                      ? 'border-primary/60 bg-surface-container-low shadow-[0_0_24px_rgba(230,195,100,0.1)]'
                      : 'border-outline-variant/10 bg-surface-container-low hover:border-primary/30'
                  }`}
                >
                  <div className="text-primary text-2xl mb-2">{card.icon}</div>
                  <div className="cinzel-text text-base font-semibold text-on-surface mb-1">{card.name}</div>
                  <div className="raleway-text text-sm text-on-surface-variant mb-2">{card.tagline}</div>
                  <div className="raleway-text text-xs text-primary/70 font-medium">{card.best}</div>
                </div>
              ))}
            </div>

            {!activeEntity && (
              <div className="text-center text-on-surface-variant raleway-text py-10 border border-dashed border-outline-variant/20">
                Select an entity type above to view the full setup package.
              </div>
            )}

            {data && (
              <div className="bg-surface-container-lowest border border-outline-variant/10 p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 mt-4 transition-all duration-500">
                <div>
                  <h4 className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary mb-4">Setup Steps</h4>
                  <ol className="space-y-3">
                    {data.steps.map((s, i) => (
                      <li key={i} className="raleway-text text-sm text-on-surface-variant flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-semibold text-primary bg-primary/10">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary mb-4">Required Documents</h4>
                  <ul className="space-y-2">
                    {data.docs.map((d, i) => (
                      <li key={i} className="raleway-text text-sm text-on-surface-variant pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-primary/50">{d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary mb-4">Key Information</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="raleway-text text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/60 mb-1">Timeline</div>
                      <div className="raleway-text text-sm text-on-surface">{data.timeline}</div>
                    </div>
                    <div>
                      <div className="raleway-text text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/60 mb-1">Jurisdiction</div>
                      <div className="raleway-text text-sm text-on-surface">{data.jurisdiction}</div>
                    </div>
                    <div>
                      <div className="raleway-text text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/60 mb-1">Key Details</div>
                      <div className="raleway-text text-sm text-on-surface">{data.keyInfo}</div>
                    </div>
                    <Link href="/contact" className="inline-block liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.2em] uppercase text-xs mt-4">
                      Start Setup &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">
              Our <span className="text-primary">services.</span>
            </h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">
              Complete business establishment across the UK and international markets &mdash; from entity formation through to operational readiness.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceCards.map((card, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="cinzel-text text-base font-semibold text-on-surface mb-3">{card.title}</h3>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Stats */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">
              Setup capabilities <span className="text-primary">at a glance.</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '24hrs', label: 'Fast-track UK incorporation' },
                { number: '3', label: 'Jurisdictions covered' },
                { number: '7', label: 'Entity types supported' },
                { number: '100%', label: 'Compliance record' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="cinzel-text text-3xl md:text-4xl text-primary mb-2">{stat.number}</div>
                  <div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Why CZAAH */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">
              Why <span className="text-primary">CZAAH.</span>
            </h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">
              Deep local expertise combined with international standards, applied to every stage of your entity formation.
            </p>
            <div className="space-y-4">
              {whyCards.map((card, i) => (
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

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* CTA Banner */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">
              Establish your international <span className="text-primary">presence.</span>
            </h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">
              Entity formation, regulatory registration, and corporate structuring &mdash; handled with institutional precision.
            </p>
            <Link href="/contact?interest=Business%20Setup#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Begin Setup &rarr;
            </Link>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
