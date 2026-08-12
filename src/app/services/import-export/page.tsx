'use client';
// @ts-nocheck

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface TradeRoute {
  name: string;
  nameHtml: React.ReactNode;
  stats: { value: string; label: string }[];
  exportFlow: string;
  importFlow: string;
  agreementLabel: string;
  agreementValue: string;
  ports: React.ReactNode;
  docs: string[];
  facilitation: string;
}

const tradeRoutes: Record<string, TradeRoute> = {
  eu: {
    name: 'European Union (GSP+)',
    nameHtml: <>European Union <span className="text-primary">(GSP+)</span></>,
    stats: [
      { value: '$8.5B+', label: 'Exports' },
      { value: '$4.2B', label: 'Imports' },
      { value: 'Surplus', label: 'Balance' }
    ],
    exportFlow: 'Textiles (70%), rice, leather, surgical instruments, sports goods',
    importFlow: 'Machinery, chemicals, pharmaceuticals, vehicles',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'GSP+ \u2014 zero duty on 6,200+ tariff lines',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi &#8594; Rotterdam, Hamburg, Antwerp</>,
    docs: ['EUR.1 Certificate', 'GSP Form A', 'Certificate of Origin', 'Bill of Lading', 'Commercial Invoice', 'Packing List', 'Phytosanitary Certificate (food)'],
    facilitation: 'GSP+ documentation, compliance certification, EU buyer matching'
  },
  uae: {
    name: 'United Arab Emirates',
    nameHtml: <>United Arab <span className="text-primary">Emirates</span></>,
    stats: [
      { value: '$1.8B', label: 'Exports' },
      { value: '$7.5B', label: 'Imports' },
      { value: 'Deficit', label: 'Balance' }
    ],
    exportFlow: 'Rice, textiles, fruits, vegetables, meat, gems',
    importFlow: 'Petroleum, gold, machinery, electronics',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'Bilateral FTA (under negotiation)',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi / Port Qasim &#8594; Jebel Ali, Sharjah</>,
    docs: ['Certificate of Origin', 'Commercial Invoice', 'Bill of Lading', 'Halal Certificate (food)', 'FIRS Certificate'],
    facilitation: 'Trade facilitation, re-export coordination, Gulf buyer network'
  },
  saudi: {
    name: 'Saudi Arabia',
    nameHtml: <>Saudi <span className="text-primary">Arabia</span></>,
    stats: [
      { value: '$2.1B', label: 'Exports' },
      { value: '$3.8B', label: 'Imports' },
      { value: 'Deficit', label: 'Balance' }
    ],
    exportFlow: 'Rice (Basmati), textiles, meat, cement, surgical instruments',
    importFlow: 'Petroleum, plastics, chemicals',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'OIC Trade Preferential System',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi &#8594; Jeddah, Dammam</>,
    docs: ['SASO Conformity Certificate', 'Halal Certificate', 'Certificate of Origin', 'Bill of Lading', 'Commercial Invoice'],
    facilitation: 'Saudi compliance (SASO/SABER), halal certification, buyer connections'
  },
  china: {
    name: 'China',
    nameHtml: <><span className="text-primary">China</span></>,
    stats: [
      { value: '$3.2B', label: 'Exports' },
      { value: '$14.5B', label: 'Imports' },
      { value: 'Deficit', label: 'Balance' }
    ],
    exportFlow: 'Rice, cotton yarn, copper ore, seafood, leather',
    importFlow: 'Machinery, electronics, steel, vehicles, chemicals',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'China-Pakistan FTA Phase II \u2014 reduced tariffs on 313 lines',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi / Gwadar &#8594; Shanghai, Shenzhen, Ningbo</>,
    docs: ['FTA Certificate of Origin', 'CIQ Inspection Certificate', 'Bill of Lading', 'Commercial Invoice', 'Packing List'],
    facilitation: 'CPEC trade facilitation, Chinese buyer matching, Gwadar port coordination'
  },
  us: {
    name: 'United States',
    nameHtml: <>United <span className="text-primary">States</span></>,
    stats: [
      { value: '$5.3B', label: 'Exports' },
      { value: '$2.1B', label: 'Imports' },
      { value: 'Surplus', label: 'Balance' }
    ],
    exportFlow: 'Textiles, surgical instruments, rice, leather goods, IT services',
    importFlow: 'Cotton, machinery, aircraft parts, soybeans',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'No FTA \u2014 standard MFN tariffs',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi &#8594; Los Angeles, New York / New Jersey</>,
    docs: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'ISF (10+2) Filing', 'FDA Registration (food)', 'CPSC Certification (consumer goods)'],
    facilitation: 'US compliance, FDA/CPSC navigation, logistics coordination'
  },
  uk: {
    name: 'United Kingdom',
    nameHtml: <>United <span className="text-primary">Kingdom</span></>,
    stats: [
      { value: '$2.1B', label: 'Exports' },
      { value: '$0.9B', label: 'Imports' },
      { value: 'Surplus', label: 'Balance' }
    ],
    exportFlow: 'Textiles, rice, surgical instruments, leather, sports goods',
    importFlow: 'Machinery, vehicles, pharmaceuticals',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'UK DCTS \u2014 zero duty, post-Brexit GSP equivalent',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi &#8594; Felixstowe, Southampton</>,
    docs: ['UK DCTS Certificate', 'Certificate of Origin', 'Bill of Lading', 'UKCA Marking (applicable goods)'],
    facilitation: 'Post-Brexit trade structuring, UK buyer network, DCTS documentation'
  },
  africa: {
    name: 'Africa',
    nameHtml: <>Africa <span className="text-primary">(Kenya, Nigeria, South Africa)</span></>,
    stats: [
      { value: '$2.8B', label: 'Exports' },
      { value: '$0.5B', label: 'Imports' },
      { value: 'Surplus', label: 'Balance' }
    ],
    exportFlow: 'Rice, pharmaceuticals, textiles, cement, surgical instruments',
    importFlow: 'Tea, coffee, raw minerals, sesame',
    agreementLabel: 'Trade Agreement',
    agreementValue: 'Various bilateral agreements',
    ports: <><strong className="text-on-surface">Key Ports:</strong> Karachi &#8594; Mombasa, Lagos, Durban</>,
    docs: ['Certificate of Origin', 'Commercial Invoice', 'SON Conformity (Nigeria)', 'KEBS Certificate (Kenya)', 'Pre-shipment Inspection'],
    facilitation: 'African market entry, pharma distribution, rice export facilitation'
  }
};

const destOrder = ['eu', 'uae', 'saudi', 'china', 'us', 'uk', 'africa'];

export default function ImportExportPage() {
  const [activeDest, setActiveDest] = useState('eu');
  const route = tradeRoutes[activeDest];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Import-Export.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">International Trade</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Import &amp;<br /><span className="text-primary">Export.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Trade facilitation through CZAAH&apos;s international trade network &mdash; customs clearance, trade documentation, logistics coordination, supplier connections, and export management.
            </p>
            <Link href="/contact?interest=Import%20%26%20Export#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Facilitate Trade &rarr;
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Trade Route Explorer */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Trade Route <span className="text-primary">Explorer.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-10">Select a destination to explore Pakistan&apos;s trade profile — volumes, key products, required documentation, and how CZAAH facilitates each corridor.</p>

            <div className="flex gap-3 overflow-x-auto pb-3 mb-8 scrollbar-thin">
              {destOrder.map(key => (
                <button
                  key={key}
                  onClick={() => setActiveDest(key)}
                  className={`flex-shrink-0 px-6 py-3 border raleway-text text-sm font-medium tracking-wider whitespace-nowrap transition-all duration-300 ${
                    activeDest === key
                      ? 'liquid-gold-bg text-on-primary border-primary font-semibold'
                      : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant hover:border-primary hover:text-on-surface'
                  }`}
                >
                  {tradeRoutes[key].name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-surface-container-low border border-outline-variant/10 p-8">
              <div>
                <h3 className="cinzel-text text-2xl text-on-surface mb-5">{route.nameHtml}</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {route.stats.map((s, i) => (
                    <div key={i} className="bg-surface-container-lowest p-4 text-center">
                      <div className="raleway-text text-xl font-semibold text-primary mb-1">{s.value}</div>
                      <div className="raleway-text text-[0.7rem] text-on-surface-variant/60 uppercase tracking-[0.06em]">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 bg-surface-container-lowest p-4 mb-4 text-sm text-on-surface-variant">
                  <span className="raleway-text font-semibold text-on-surface min-w-[56px]">Export</span>
                  <span className="text-primary">&#10140;</span> {route.exportFlow}
                </div>
                <div className="flex items-center gap-3 bg-surface-container-lowest p-4 mb-4 text-sm text-on-surface-variant">
                  <span className="raleway-text font-semibold text-on-surface min-w-[56px]">Import</span>
                  <span className="text-primary">&#10140;</span> {route.importFlow}
                </div>
                <div className="bg-surface-container-lowest border-l-[3px] border-primary p-4 mb-4">
                  <div className="raleway-text text-[0.7rem] uppercase tracking-[0.08em] text-primary/60 mb-1">{route.agreementLabel}</div>
                  <div className="raleway-text text-sm text-on-surface font-medium">{route.agreementValue}</div>
                </div>
                <p className="raleway-text text-sm text-on-surface-variant">{route.ports}</p>
              </div>
              <div>
                <h4 className="raleway-text text-xs uppercase tracking-[0.1em] text-primary font-semibold mb-3">Required Documents</h4>
                <ul className="space-y-2 mb-6">
                  {route.docs.map((doc, i) => (
                    <li key={i} className="flex items-center gap-3 raleway-text text-sm text-on-surface-variant">
                      <span className="text-primary text-sm">&#10003;</span> {doc}
                    </li>
                  ))}
                </ul>
                <div className="bg-primary/5 border border-primary/20 p-4 mt-5">
                  <div className="raleway-text text-[0.7rem] uppercase tracking-[0.08em] text-primary mb-2">CZAAH Facilitation</div>
                  <div className="raleway-text text-sm text-on-surface-variant leading-relaxed">{route.facilitation}</div>
                </div>
              </div>
            </div>
            <Link href="/contact" className="block text-center mt-6 liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Facilitate This Route &rarr;
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Complete trade facilitation — from customs clearance and documentation to logistics and market access.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'package_2', title: 'Customs Clearance', desc: "WeBOC processing, duty optimization strategies, clearance acceleration, and customs liaison. We ensure your goods move through Pakistan's ports efficiently and cost-effectively." },
                { icon: 'description', title: 'Trade Documentation', desc: 'Letters of credit, bills of lading, certificates of origin, phytosanitary certificates, and all required trade documentation — prepared accurately and processed on time.' },
                { icon: 'local_shipping', title: 'Logistics Coordination', desc: 'Freight forwarding, shipping line coordination, warehousing, and last-mile delivery management. We orchestrate the entire supply chain from origin to destination.' },
                { icon: 'connect_without_contact', title: 'Supplier Matching', desc: 'Access our vetted network of manufacturers and suppliers across Pakistan. We match your product requirements with reliable producers — quality-assured and compliance-verified.' },
                { icon: 'trending_up', title: 'Export Management', desc: 'GSP+ documentation for EU market access, US and Gulf compliance requirements, quality assurance protocols, and complete export management for Pakistani goods entering global markets.' },
                { icon: 'account_balance', title: 'Trade Finance', desc: 'Letter of credit facilitation, payment structuring between buyers and suppliers, foreign exchange management, and trade finance solutions that protect all parties in the transaction.' },
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

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Stats */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Trade capabilities <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '6+', label: 'International trade corridors' },
                { number: 'GSP+', label: 'EU market access' },
                { number: '150+', label: 'Trade routes' },
                { number: '$16B+', label: 'Pakistan textile exports alone' },
              ].map((stat, i) => (
                <div key={i}>
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Why <span className="text-primary">CZAAH.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Our international network and deep trade expertise make us uniquely positioned to facilitate Pakistan&apos;s international commerce.</p>
            <div className="space-y-4">
              {[
                { icon: 'public', title: 'International Reach', desc: "CZAAH's international trade network enables USD invoicing, clean international payments, and efficient cross-border transactions for importers and exporters across global markets." },
                { icon: 'anchor', title: 'Port & Customs Relationships', desc: 'Established relationships with customs authorities, port operators, and clearing agents at Karachi Port, Port Qasim, and Gwadar. We accelerate clearance and resolve issues before they become delays.' },
                { icon: 'storefront', title: 'Gulf Trade Network', desc: "Our network provides direct access to Gulf buyers, re-export channels, and commodities trading ecosystems — connecting Pakistani products to one of the world's largest trading hubs." },
                { icon: 'verified', title: 'Compliance Expertise', desc: 'Deep knowledge of GSP+ requirements, EU product standards, US import regulations, and Gulf market specifications. We ensure every shipment meets destination market compliance requirements.' },
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

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Trade across borders, <span className="text-primary">structured.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Customs, documentation, logistics, and supplier connections &mdash; through our international trade network.</p>
            <Link href="/contact?interest=Import%20%26%20Export#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Discuss Trade Requirements &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
