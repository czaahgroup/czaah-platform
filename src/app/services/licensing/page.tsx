'use client';
// @ts-nocheck

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface LicenseItem {
  name: string;
  body: string;
  time: string;
  level: 'low' | 'medium' | 'high';
  desc: string;
}

const universal: LicenseItem[] = [
  { name: 'SECP Registration', body: 'Securities & Exchange Commission of Pakistan', time: '7\u201315 days', level: 'low', desc: 'Company incorporation and registration with SECP \u2014 the foundational requirement for any business entity operating in Pakistan.' },
  { name: 'NTN (Tax Number)', body: 'Federal Board of Revenue', time: '3\u20135 days', level: 'low', desc: 'National Tax Number registration for income tax purposes \u2014 mandatory for all businesses and required before any commercial activity.' },
  { name: 'Sales Tax Registration', body: 'Federal Board of Revenue', time: '5\u20137 days', level: 'low', desc: 'Registration under the Sales Tax Act for businesses involved in the supply of taxable goods or services.' },
  { name: 'Social Security (EOBI)', body: 'Employees Old-Age Benefits Institution', time: '7\u201314 days', level: 'low', desc: 'Employer registration with EOBI for mandatory employee pension and social security contributions.' }
];

const sectors: Record<string, { label: string; items: LicenseItem[] }> = {
  mining: { label: 'Mining & Minerals', items: [
    { name: 'Exploration License', body: 'Provincial Mines & Minerals Dept', time: '30\u201390 days', level: 'high', desc: 'Authorization to conduct mineral exploration activities within a designated area. Requires detailed work programme and financial capability proof.' },
    { name: 'Mining Lease', body: 'Provincial Mines & Minerals Dept', time: '60\u2013180 days', level: 'high', desc: 'Lease granting the right to extract minerals from a specific area. Requires exploration data, environmental plan, and provincial government approval.' },
    { name: 'Environmental Impact Assessment', body: 'Environmental Protection Agency', time: '30\u201360 days', level: 'medium', desc: 'Mandatory environmental review for mining operations, assessing impact on land, water, air quality, and local communities.' },
    { name: 'Explosives License', body: 'Dept of Explosives', time: '14\u201330 days', level: 'medium', desc: 'License for the purchase, storage, and use of explosives in mining operations. Requires safety protocols and secure storage facilities.' },
    { name: 'NOC (Security)', body: 'Home Department', time: '14\u201321 days', level: 'medium', desc: 'Security clearance from the provincial Home Department, particularly for mining operations in sensitive or border regions.' }
  ]},
  pharma: { label: 'Pharmaceuticals', items: [
    { name: 'DRAP Manufacturing License', body: 'Drug Regulatory Authority of Pakistan', time: '60\u2013120 days', level: 'high', desc: 'License to establish and operate a pharmaceutical manufacturing facility. Requires facility inspection and quality system documentation.' },
    { name: 'GMP Certification', body: 'Drug Regulatory Authority of Pakistan', time: '90\u2013180 days', level: 'high', desc: 'Good Manufacturing Practice certification ensuring pharmaceutical production meets international quality standards.' },
    { name: 'Product Registration', body: 'DRAP (per product)', time: '30\u201390 days', level: 'medium', desc: 'Individual registration for each pharmaceutical product before it can be manufactured, imported, or sold in Pakistan.' },
    { name: 'Controlled Substances License', body: 'Drug Regulatory Authority of Pakistan', time: '30\u201360 days', level: 'high', desc: 'Special license for handling, manufacturing, or distributing controlled and narcotic substances under strict regulatory oversight.' },
    { name: 'Import License (APIs)', body: 'Ministry of Commerce', time: '14\u201330 days', level: 'medium', desc: 'Authorization to import Active Pharmaceutical Ingredients required for drug manufacturing.' }
  ]},
  tech: { label: 'Technology & IT', items: [
    { name: 'PTA License (Telecom)', body: 'Pakistan Telecommunication Authority', time: '30\u201360 days', level: 'medium', desc: 'Licensing for telecom services, ISPs, and technology companies operating communication infrastructure in Pakistan.' },
    { name: 'STZ Registration', body: 'Special Technology Zone Authority', time: '14\u201330 days', level: 'low', desc: 'Registration with a Special Technology Zone for tax incentives, streamlined regulation, and tech ecosystem benefits.' },
    { name: 'Data Protection Compliance', body: 'Ministry of IT & Telecom', time: 'Ongoing', level: 'medium', desc: "Compliance with Pakistan's evolving data protection framework, including data handling, storage, and cross-border transfer requirements." },
    { name: 'Software Export Registration', body: 'Pakistan Software Export Board', time: '7\u201314 days', level: 'low', desc: 'Registration with PSEB to access IT export incentives, tax benefits, and official recognition as a software exporter.' }
  ]},
  food: { label: 'Food & Agriculture', items: [
    { name: 'Food Safety License', body: 'PSQCA / Provincial Food Authority', time: '30\u201360 days', level: 'medium', desc: 'Mandatory food safety certification for businesses involved in food production, processing, storage, or distribution.' },
    { name: 'Organic Certification', body: 'Accredited Certification Body', time: '60\u201390 days', level: 'medium', desc: 'Third-party certification verifying organic farming and production standards for premium market access.' },
    { name: 'Phytosanitary Certificate', body: 'Dept of Plant Protection', time: '7\u201314 days', level: 'low', desc: 'Certificate confirming agricultural exports are free from pests and diseases, required by importing countries.' },
    { name: 'Cold Storage License', body: 'Provincial Authority', time: '14\u201330 days', level: 'low', desc: 'License for operating cold chain and storage facilities, essential for perishable food and agricultural products.' }
  ]},
  construction: { label: 'Construction', items: [
    { name: 'PEC Registration', body: 'Pakistan Engineering Council', time: '14\u201330 days', level: 'medium', desc: 'Mandatory registration for engineering and construction firms, establishing eligibility for government and private contracts.' },
    { name: 'Building Permit', body: 'CDA / LDA / KDA', time: '30\u201390 days', level: 'high', desc: 'Development authority approval for construction projects, covering structural plans, land use zoning, and safety compliance.' },
    { name: 'Environmental NOC', body: 'Environmental Protection Agency', time: '30\u201360 days', level: 'medium', desc: 'Environmental clearance for construction projects assessing impact on surroundings, drainage, and waste management.' },
    { name: 'Fire Safety Certificate', body: 'Civil Defence', time: '7\u201314 days', level: 'low', desc: 'Certification confirming the building meets fire safety standards, including emergency exits, fire suppression, and alarm systems.' },
    { name: 'Labour License', body: 'Provincial Labour Dept', time: '7\u201314 days', level: 'low', desc: 'Registration under provincial labour laws for businesses employing workers, covering wage, safety, and welfare compliance.' }
  ]},
  trade: { label: 'Import & Export', items: [
    { name: 'WeBOC Registration', body: 'Pakistan Customs', time: '7\u201314 days', level: 'low', desc: "Registration on Pakistan Customs' Web Based One Customs clearance system \u2014 required for all import/export operations." },
    { name: 'Chamber of Commerce Membership', body: 'FPCCI / Local Chamber', time: '3\u20137 days', level: 'low', desc: 'Membership with the Federation of Pakistan Chambers of Commerce or local chamber, required for trade documentation.' },
    { name: 'GSP+ Documentation', body: 'Ministry of Commerce', time: 'Ongoing', level: 'medium', desc: 'Compliance documentation for EU Generalised Scheme of Preferences Plus, providing duty-free access to European markets.' },
    { name: 'SRO Exemption Applications', body: 'Federal Board of Revenue', time: '14\u201330 days', level: 'medium', desc: 'Applications for Statutory Regulatory Order-based tax and duty exemptions applicable to specific trade categories.' }
  ]},
  energy: { label: 'Energy & Power', items: [
    { name: 'NEPRA License', body: 'National Electric Power Regulatory Authority', time: '60\u2013120 days', level: 'high', desc: 'License for electricity generation, transmission, or distribution. Covers solar, wind, hydro, and thermal power projects.' },
    { name: 'OGRA License', body: 'Oil & Gas Regulatory Authority', time: '60\u201390 days', level: 'high', desc: 'License for oil and gas exploration, refining, distribution, or LPG/CNG operations in Pakistan.' },
    { name: 'Environmental Approval', body: 'Environmental Protection Agency', time: '30\u201360 days', level: 'medium', desc: 'Environmental clearance for energy projects, including impact assessment on emissions, land use, and water resources.' },
    { name: 'Grid Connection', body: 'NTDC / DISCO', time: '30\u201390 days', level: 'high', desc: 'Approval for connecting power generation facilities to the national grid via NTDC or regional distribution company.' }
  ]},
  healthcare: { label: 'Healthcare', items: [
    { name: 'Hospital Registration', body: 'Provincial Health Dept', time: '30\u201360 days', level: 'medium', desc: 'Registration and licensing of healthcare facilities including hospitals, clinics, and medical centres under provincial health regulations.' },
    { name: 'PMDC Registration', body: 'Pakistan Medical & Dental Council', time: '14\u201330 days', level: 'medium', desc: 'Registration for medical practitioners and healthcare institutions, ensuring qualified staff and standards compliance.' },
    { name: 'Diagnostic Lab License', body: 'Provincial Authority', time: '30\u201345 days', level: 'medium', desc: 'License for operating diagnostic and pathology laboratories, requiring equipment standards and qualified technicians.' },
    { name: 'Pharmacy License', body: 'Provincial Pharmacy Council', time: '14\u201330 days', level: 'low', desc: 'License for operating a pharmacy, requiring a qualified pharmacist and compliance with drug storage and dispensing regulations.' }
  ]}
};

function ComplexityBars({ level }: { level: 'low' | 'medium' | 'high' }) {
  const count = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  const color = level === 'low' ? 'bg-green-400' : level === 'medium' ? 'bg-primary' : 'bg-red-400';
  const textColor = level === 'low' ? 'text-green-400' : level === 'medium' ? 'text-primary' : 'text-red-400';
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-4 h-1 ${i < count ? color : 'bg-outline-variant/20'}`} />
        ))}
      </div>
      <div className={`raleway-text text-[0.7rem] font-semibold uppercase tracking-[0.08em] ${textColor}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </div>
    </div>
  );
}

function LicenseCard({ item }: { item: LicenseItem }) {
  return (
    <div className="border border-outline-variant/10 bg-surface-container-low p-5 grid grid-cols-[1fr_auto] gap-3 items-start hover:border-primary/30 transition-all duration-300">
      <div className="min-w-0">
        <div className="raleway-text font-semibold text-on-surface mb-1">{item.name}</div>
        <div className="raleway-text text-sm text-on-surface-variant/60 mb-2">{item.desc}</div>
        <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="text-primary">&#9670;</span> {item.body}</span>
          <span className="flex items-center gap-1"><span className="text-primary">&#9200;</span> {item.time}</span>
        </div>
      </div>
      <ComplexityBars level={item.level} />
    </div>
  );
}

export default function LicensingPage() {
  const [activeSector, setActiveSector] = useState<string | null>(null);

  const sectorData = activeSector ? sectors[activeSector] : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Licensing.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Government &amp; Regulatory</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Licensing &amp;<br /><span className="text-primary">Compliance.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Navigating regulatory landscapes across the UK, Pakistan, and international markets requires deep institutional knowledge. In Pakistan, CZAAH manages FBR registration, Board of Investment approvals, industry-specific licensing, provincial permits, and environmental clearances — so you can operate with full confidence, wherever you're doing business.
            </p>
            <Link href="/contact?interest=Licensing%20%26%20Compliance#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Navigate Regulations &rarr;
            </Link>
          </div>
        </section>

        {/* Sector Compliance Navigator */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">
              Sector Compliance <span className="text-primary">Navigator.</span>
            </h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-10">
              Select your industry sector to see the full regulatory roadmap — every license, permit, and registration required to operate in Pakistan, one of our core regulatory markets.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {Object.entries(sectors).map(([key, sec]) => (
                <button
                  key={key}
                  onClick={() => setActiveSector(key)}
                  className={`raleway-text text-sm font-medium px-5 py-2.5 border transition-all duration-300 whitespace-nowrap ${
                    activeSector === key
                      ? 'liquid-gold-bg text-on-primary border-primary font-semibold'
                      : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="min-h-[120px]">
              {!activeSector ? (
                <div className="text-center py-16 text-on-surface-variant/50 raleway-text border border-dashed border-outline-variant/20">
                  Select your industry to see the full regulatory roadmap
                </div>
              ) : (
                <>
                  <div className="raleway-text text-xs font-semibold uppercase tracking-[0.12em] text-primary/60 mb-4">Universal Requirements</div>
                  <div className="space-y-3 mb-4">
                    {universal.map((item, i) => (
                      <LicenseCard key={`u-${i}`} item={item} />
                    ))}
                  </div>
                  {sectorData && (
                    <>
                      <div className="raleway-text text-xs font-semibold uppercase tracking-[0.12em] text-primary/60 mb-4 mt-10">{sectorData.label} — Sector-Specific</div>
                      <div className="space-y-3">
                        {sectorData.items.map((item, i) => (
                          <LicenseCard key={`s-${i}`} item={item} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Comprehensive licensing and compliance management &mdash; deep regulatory expertise in Pakistan, plus market-entry compliance support across the UK and our other operating markets.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'diamond', title: 'FBR Registration (Pakistan)', desc: 'National Tax Number (NTN) acquisition, sales tax registration, income tax compliance setup, and ongoing FBR filing management. We ensure your Pakistan tax obligations are met from day one.' },
                { icon: 'account_balance', title: 'Board of Investment (Pakistan)', desc: 'Foreign investment approval facilitation, profit repatriation permissions, investment incentive scheme applications, and BOI liaison for international investors entering Pakistan.' },
                { icon: 'license', title: 'Industry Licensing', desc: 'Sector-specific permits and licenses for mining, pharmaceuticals, telecommunications, food production, manufacturing, and other regulated industries — primarily across Pakistan.' },
                { icon: 'location_on', title: 'Provincial Permits (Pakistan)', desc: 'Development authority approvals, environmental impact assessments, No Objection Certificates (NOCs), and provincial regulatory clearances across Punjab, Sindh, KPK, and Balochistan.' },
                { icon: 'local_shipping', title: 'Import/Export Licensing', desc: 'WeBOC registration, customs licensing, trade permits, and import/export documentation for compliant cross-border trade operations to and from Pakistan.' },
                { icon: 'verified', title: 'Ongoing Regulatory Compliance', desc: 'Tax filings, audit coordination, regulatory reporting, and compliance monitoring across every jurisdiction we operate in. Proactive management ensures your business stays ahead of evolving requirements.' },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Regulatory capabilities <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '50+', label: 'Regulatory bodies navigated' },
                { number: 'UK · PK · UAE', label: 'Markets covered' },
                { number: 'BOI', label: 'Pakistan investment facilitation' },
                { number: 'Multi', label: 'Provincial coverage' },
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
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">We turn regulatory complexity &mdash; in Pakistan and across our other markets &mdash; into a streamlined process for our clients.</p>
            <div className="space-y-4">
              {[
                { icon: 'gavel', title: 'Regulatory Expertise', desc: "Deep understanding of Pakistan's multi-layered regulatory framework — federal, provincial, and sector-specific. Our team has navigated licensing processes across every major industry and jurisdiction in the country." },
                { icon: 'handshake', title: 'Government Relationships', desc: 'Established working relationships with FBR, BOI, SECP, provincial development authorities, and sector regulators enable us to expedite approvals and resolve issues efficiently.' },
                { icon: 'map', title: 'Cross-Provincial Coverage', desc: 'Operations and relationships spanning Punjab, Sindh, KPK, Balochistan, and Gilgit-Baltistan. Wherever your project is located, we have the regulatory knowledge and access to support it.' },
                { icon: 'trending_up', title: 'Proactive Compliance', desc: "We don't just secure licenses — we maintain them. Ongoing monitoring of regulatory changes, filing deadlines, and compliance requirements ensures your business is always ahead of the curve." },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Navigate regulatory <span className="text-primary">landscapes.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">FBR, BOI, provincial permits, and industry licensing in Pakistan &mdash; plus market-entry compliance in the UK and beyond &mdash; managed by a team that operates inside these institutions.</p>
            <Link href="/contact?interest=Licensing%20%26%20Compliance#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Discuss Compliance &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
