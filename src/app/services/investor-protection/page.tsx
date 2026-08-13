'use client';
// @ts-nocheck

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface ProtectionLayer {
  num: string;
  name: string;
  brief: string;
  items: string[];
}

const layers: ProtectionLayer[] = [
  {
    num: '01', name: 'Pre-Investment Screening', brief: 'Filtering out risk before capital is committed.',
    items: ['Market viability assessment and sector analysis', 'Counterparty background checks (criminal, litigation, financial)', 'Regulatory environment review for the specific investment type', 'Sanction screening and AML/KYC compliance verification', 'Independent reference checks across our institutional network', 'Red flag identification and go/no-go recommendation']
  },
  {
    num: '02', name: 'Legal Architecture', brief: 'Contracts built to protect, not just document.',
    items: ['Investment agreements drafted to international standards (English law / DIFC option)', 'Shareholder agreements with minority protection clauses', 'Tag-along, drag-along, anti-dilution, and pre-emption rights', 'Arbitration clauses (LCIA, ICC, or DIFC) for dispute resolution', 'Escrow arrangements for staged capital deployment', 'Personal guarantee and security collateral where appropriate']
  },
  {
    num: '03', name: 'Asset Verification', brief: 'Confirming that what you\u2019re buying is real.',
    items: ['Property title search and ownership chain verification', 'Land revenue record authentication (Patwari/Revenue Dept)', 'Physical asset inspection and condition assessment', 'Encumbrance and lien checks across all relevant registries', 'Mining license verification with provincial Mines Department', 'Company registry search (SECP) for corporate assets']
  },
  {
    num: '04', name: 'Financial Governance', brief: 'Institutional-grade oversight of your capital.',
    items: ['Independent board representation or observer rights', 'Ring-fenced SPV structures isolating deal-specific risk', 'Dedicated bank accounts with dual-signatory controls', 'Quarterly financial reporting to international accounting standards', 'Annual independent audit by Big 4 or equivalent firm', 'Capital call and distribution waterfall management']
  },
  {
    num: '05', name: 'Ongoing Monitoring', brief: 'Continuous vigilance throughout the investment lifecycle.',
    items: ['Monthly operational updates and KPI tracking', 'Regular site visits and physical inspection (real assets)', 'Regulatory compliance monitoring and filing management', 'Market condition tracking and risk reassessment', 'Partner/counterparty ongoing due diligence', 'Early warning system for material adverse changes']
  },
  {
    num: '06', name: 'Exit Protection', brief: 'Defined mechanisms for capital recovery.',
    items: ['Pre-agreed exit mechanisms in every investment structure', 'Put options and buyback arrangements at defined triggers', 'Secondary market facilitation for equity positions', 'Profit repatriation structuring (SBP compliance)', 'Tax-efficient exit planning across multiple jurisdictions', 'Liquidation preference and waterfall protections']
  }
];

export default function InvestorProtectionPage() {
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());

  const toggleLayer = (index: number) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Investor-Protection.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Risk &amp; Protection</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Investor<br /><span className="text-primary">Protection.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Protecting international investors through comprehensive due diligence, legal safeguards, transparent reporting, and risk management — ensuring every investment across the UK, Pakistan, and our international markets is secure, verified, and properly structured.
            </p>
            <Link href="/contact?interest=Investor%20Protection#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Protect Your Investment &rarr;
            </Link>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Protection Framework */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Protection <span className="text-primary">framework.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Six layers of institutional-grade protection — from initial screening through to exit. Click any layer to explore.</p>

            <div className="flex flex-col">
              {layers.map((layer, i) => {
                const isExpanded = expandedLayers.has(i);
                const barOpacity = 0.3 + (i * 0.14);
                return (
                  <div
                    key={i}
                    className={`border border-outline-variant/10 -mt-px transition-all duration-300 ${isExpanded ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                    style={{ marginLeft: `${i * 0.5}rem` }}
                  >
                    <div
                      className="flex items-center gap-6 px-7 py-5 cursor-pointer relative hover:bg-surface-container-lowest transition-colors"
                      onClick={() => toggleLayer(i)}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `rgba(230,195,100,${barOpacity})` }} />
                      <div className="raleway-text font-semibold text-xs text-primary tracking-wider min-w-[2rem]">{layer.num}</div>
                      <div className="flex-1">
                        <div className={`cinzel-text text-base font-semibold transition-colors ${isExpanded ? 'text-primary' : 'text-on-surface'}`}>{layer.name}</div>
                        <div className="raleway-text text-sm text-on-surface-variant italic">{layer.brief}</div>
                      </div>
                      <div className={`text-xl transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-on-surface-variant/40'}`}>&#9662;</div>
                    </div>
                    <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[500px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                      <div className="px-7 pl-20">
                        <div className="raleway-text text-xs font-semibold text-primary uppercase tracking-[0.08em] mb-3">Deliverables</div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {layer.items.map((item, j) => (
                            <li key={j} className="raleway-text text-sm text-on-surface-variant/70 pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary/40">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Comprehensive investor protection — from pre-investment due diligence through to ongoing monitoring and defined exit strategies.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'search', title: 'Investment Due Diligence', desc: 'Asset verification, financial analysis, background checks on partners and projects. We ensure every aspect of your investment is thoroughly investigated before capital is deployed.' },
                { icon: 'gavel', title: 'Legal Safeguards', desc: 'Investor-protecting contracts, shareholder agreements, dispute resolution mechanisms. Our legal frameworks are built to international standards and enforced through Pakistani and international jurisdictions.' },
                { icon: 'verified_user', title: 'Title & Asset Verification', desc: "Property title verification, asset authentication, ownership chain validation. We confirm that what you're investing in is real, legally clean, and free from encumbrances." },
                { icon: 'assessment', title: 'Financial Reporting', desc: 'Regular investment reports, independent valuations, performance tracking. You receive transparent, auditable updates on every investment — no surprises, no opacity.' },
                { icon: 'shield', title: 'Insurance Facilitation', desc: 'Investment insurance, political risk coverage, asset protection policies. We connect you with the right insurers to protect against unforeseen risks across all asset classes.' },
                { icon: 'exit_to_app', title: 'Exit Mechanisms', desc: 'Defined exit strategies, buyback arrangements, secondary market facilitation. Every investment we structure includes clear, pre-agreed mechanisms for capital recovery.' },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Investor protection <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '100%', label: 'Due diligence completion' },
                { number: 'Legal', label: 'International-grade contracts' },
                { number: 'Quarterly', label: 'Reporting cycle' },
                { number: 'Defined', label: 'Exit mechanisms' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="cinzel-text text-3xl md:text-4xl text-primary mb-2">{stat.number}</div>
                  <div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Why CZAAH */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Why <span className="text-primary">CZAAH.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">International investors trust CZAAH because we combine local intelligence with institutional-grade protection frameworks.</p>
            <div className="space-y-4">
              {[
                { icon: 'visibility', title: 'Local Intelligence', desc: "Deep on-the-ground knowledge of the regulatory, legal, and commercial landscape in every market we operate — UK, Pakistan, and beyond. We identify risks that remote due diligence simply cannot uncover — protecting you from hidden exposures." },
                { icon: 'gavel', title: 'Legal Expertise', desc: "Access to leading commercial law firms and international arbitration specialists across our operating markets. Our contracts are drafted to protect investor interests across multiple jurisdictions and enforcement regimes." },
                { icon: 'analytics', title: 'Transparent Reporting', desc: 'No opacity, no guesswork. Every investment is tracked through independent valuations, auditable financial reports, and regular performance updates — delivered to international reporting standards.' },
                { icon: 'workspace_premium', title: 'Proven Track Record', desc: 'A portfolio of successfully protected investments across minerals, real estate, technology, and trade. Our investors receive the confidence that comes from rigorous process and demonstrated results.' },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Deploy capital with <span className="text-primary">certainty.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Due diligence, legal frameworks, transparent reporting, and defined exit mechanisms &mdash; institutional-grade investor protection.</p>
            <Link href="/contact?interest=Investor%20Protection#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Request a Consultation &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
