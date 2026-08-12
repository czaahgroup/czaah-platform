'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

const edTabs = [
  {
    id: 'higher', icon: '\uD83C\uDF93', label: 'Higher Education',
    title: 'Higher Education',
    desc: 'Pakistan has 235+ HEC-recognised universities serving a rapidly expanding student population. Demand for quality tertiary education outstrips supply — particularly in engineering, business, and health sciences.',
    stats: [{ value: '235+', label: 'HEC Universities' }, { value: '2.5M+', label: 'Enrolled Students' }, { value: '9%', label: 'Gross Enrolment Rate' }],
    details: [
      { heading: 'Opportunities', items: ['Private university campuses', 'Franchise partnerships', 'Research park development', 'Faculty exchange programmes'] },
      { heading: 'Key Bodies', items: ['HEC (Higher Education Commission)', 'PEC (Pakistan Engineering Council)', 'PMDC (Medical & Dental Council)'] },
      { heading: 'Growth Drivers', items: ['Youth bulge (64% under 30)', 'Rising middle class', 'Professional certification demand'] }
    ]
  },
  {
    id: 'k12', icon: '\uD83D\uDCDA', label: 'K-12 & Schools',
    title: 'K-12 & School Networks',
    desc: 'With 51M+ school-age children and only 30% enrolled in private institutions, Pakistan\'s K-12 sector represents one of the largest untapped markets in global education.',
    stats: [{ value: '51M+', label: 'School-Age Children' }, { value: '260K+', label: 'Private Schools' }, { value: '30%', label: 'Private Sector Share' }],
    details: [
      { heading: 'Opportunities', items: ['School chain acquisition', 'Franchise model expansion', 'Curriculum licensing', 'Teacher training institutes'] },
      { heading: 'Key Bodies', items: ['Provincial Education Departments', 'Federal Directorate of Education', 'PEIRA (Islamabad)'] },
      { heading: 'Models', items: ['Affordable private (mass market)', 'Premium (O/A Levels, IB)', 'Hybrid digital-physical'] }
    ]
  },
  {
    id: 'vocational', icon: '\u2692', label: 'Vocational & TVET',
    title: 'Vocational & Technical Training',
    desc: 'Pakistan needs 30,000+ skilled workers per year for CPEC projects alone. Existing TVET infrastructure covers fewer than 500,000 students annually — creating a massive supply-demand gap.',
    stats: [{ value: '3,600+', label: 'TVET Institutes' }, { value: '500K', label: 'Annual Enrolment' }, { value: 'CPEC', label: 'Demand Driver' }],
    details: [
      { heading: 'Opportunities', items: ['Technical training centres', 'Industry-aligned curricula', 'Gulf workforce certification', 'German/Chinese TVET models'] },
      { heading: 'Key Bodies', items: ['NAVTTC (National Vocational)', 'TEVTAs (Provincial)', 'PBTE (Technical Boards)'] },
      { heading: 'Priority Trades', items: ['Construction & civil works', 'Welding & fabrication', 'IT & networking', 'Hospitality'] }
    ]
  },
  {
    id: 'edtech', icon: '\uD83D\uDCBB', label: 'EdTech',
    title: 'EdTech & Digital Learning',
    desc: 'Mobile penetration at 85%+ and broadband expansion are unlocking digital education at scale. Pakistan\'s EdTech market is projected to reach $3.5B by 2028.',
    stats: [{ value: '$3.5B', label: 'Projected by 2028' }, { value: '85%+', label: 'Mobile Penetration' }, { value: '40%+', label: 'Growth YoY' }],
    details: [
      { heading: 'Opportunities', items: ['LMS platform deployment', 'Assessment & certification', 'AI tutoring systems', 'Content localisation'] },
      { heading: 'Infrastructure', items: ['5G rollout (2025-2027)', 'USF rural connectivity', 'Punjab IT Board labs'] },
      { heading: 'Segments', items: ['Test preparation', 'Language learning', 'Professional upskilling', 'K-12 supplementary'] }
    ]
  },
  {
    id: 'medical', icon: '\u2624', label: 'Medical & Health',
    title: 'Medical & Health Sciences',
    desc: 'Pakistan produces 20,000+ medical graduates annually from 170+ medical and dental colleges. International accreditation partnerships and simulation-based training represent significant growth areas.',
    stats: [{ value: '170+', label: 'Medical Colleges' }, { value: '20K+', label: 'Annual Graduates' }, { value: 'High', label: 'Gulf Demand' }],
    details: [
      { heading: 'Opportunities', items: ['Private medical universities', 'Nursing & allied health', 'Simulation centres', 'Postgraduate specialisation'] },
      { heading: 'Key Bodies', items: ['PMDC', 'PNC (Pakistan Nursing Council)', 'HEC'] },
      { heading: 'Export Markets', items: ['Gulf healthcare systems', 'UK NHS recruitment', 'Southeast Asia'] }
    ]
  },
  {
    id: 'international', icon: '\uD83C\uDF10', label: 'International Schools',
    title: 'International Schools',
    desc: 'Rising HNWI families, expatriate demand, and diaspora return migration are driving demand for internationally accredited schools offering IB, Cambridge, and American curricula.',
    stats: [{ value: '50+', label: 'International Schools' }, { value: '$15K+', label: 'Avg Annual Fees' }, { value: 'Growing', label: 'Returnee Demand' }],
    details: [
      { heading: 'Opportunities', items: ['IB World School campuses', 'Cambridge-affiliated networks', 'American school models', 'Boarding school development'] },
      { heading: 'Key Cities', items: ['Islamabad', 'Lahore', 'Karachi'] },
      { heading: 'Client Profile', items: ['HNWI families', 'Expatriate executives', 'Diplomatic corps', 'Diaspora returnees'] }
    ]
  },
];

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState('higher');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach((el) => { observerRef.current?.observe(el); });
    return () => observerRef.current?.disconnect();
  }, []);

  const activePanel = edTabs.find(t => t.id === activeTab)!;

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Education.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">230M Population &middot; 64% Under 30 &middot; $8B+ Education Market</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6"><span className="text-primary">Education.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Pakistan&apos;s youngest demographic in its history meets the largest education infrastructure gap in South Asia. CZAAH facilitates institutional partnerships, campus development, and EdTech deployment for international education investors.</p>
            <a href="/contact?interest=Education#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore Partnerships &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* EDUCATION CATALOG */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Education <span className="text-primary">landscape.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-8 leading-relaxed">From elite private universities to vocational training at scale — Pakistan&apos;s education sector is being reshaped by demographic pressure and institutional demand.</p>

            <div className="flex flex-col md:flex-row border border-outline-variant/20 bg-surface-container-low overflow-hidden min-h-[520px] mt-8">
              {/* Tabs */}
              <div className="flex md:flex-col md:min-w-[220px] md:max-w-[220px] md:border-r border-b md:border-b-0 border-outline-variant/20 overflow-x-auto md:overflow-x-visible scrollbar-hide">
                {edTabs.map(tab => (
                  <button key={tab.id} className={`flex items-center gap-3 px-5 py-4 border-l-0 md:border-l-[3px] border-b-[3px] md:border-b-0 border-transparent text-on-surface-variant raleway-text text-sm cursor-pointer text-left transition-all whitespace-nowrap flex-shrink-0 hover:text-on-surface hover:bg-surface-container ${activeTab === tab.id ? 'md:border-l-primary border-b-primary text-primary bg-surface-container' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    <span className="text-xl w-6 text-center flex-shrink-0">{tab.icon}</span>
                    <span className="overflow-hidden text-ellipsis">{tab.label}</span>
                  </button>
                ))}
              </div>
              {/* Panel */}
              <div className="flex-1 p-8 md:p-10">
                <div className="cinzel-text text-2xl text-on-surface mb-1.5">{activePanel.title}</div>
                <p className="raleway-text text-on-surface-variant text-[0.95rem] leading-relaxed mb-6">{activePanel.desc}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-7">
                  {activePanel.stats.map((s, i) => (
                    <div key={i} className="bg-surface-container border border-outline-variant/10 p-4 text-center">
                      <div className="cinzel-text text-xl text-primary mb-1">{s.value}</div>
                      <div className="raleway-text text-xs text-on-surface-variant uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-8 mb-5 flex-wrap">
                  {activePanel.details.map((d, i) => (
                    <div key={i} className="flex-1 min-w-[180px]">
                      <h5 className="raleway-text text-xs font-semibold uppercase tracking-widest text-primary/60 mb-2">{d.heading}</h5>
                      <ul className="list-none p-0 m-0">{d.items.map((item, j) => (<li key={j} className="text-on-surface-variant text-sm py-0.5 pl-3.5 relative before:content-['\u203A'] before:absolute before:left-0 before:text-primary">{item}</li>))}</ul>
                    </div>
                  ))}
                </div>
                <a href="/contact" className="text-primary text-sm font-medium hover:opacity-75 transition-opacity">Enquire &rarr;</a>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* REGULATORY FRAMEWORK */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Regulatory <span className="text-primary">framework.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Pakistan&apos;s education sector operates under federal and provincial regulatory structures with distinct requirements by institution type.</p>
            <div className="flex flex-col gap-4">
              {[
                { icon: 'school', title: 'Higher Education Commission (HEC)', desc: 'Federal body governing university recognition, degree attestation, quality assurance, and faculty credentialing. All degree-granting institutions require HEC charter.' },
                { icon: 'account_balance', title: 'Provincial Education Departments', desc: 'K-12 regulation is devolved to provinces post-18th Amendment. Each province maintains its own registration, curriculum, and examination frameworks.' },
                { icon: 'engineering', title: 'NAVTTC & TEVTAs', desc: 'National and provincial vocational training authorities regulate TVET standards, trade certification, and skills qualification frameworks aligned with national priorities.' },
                { icon: 'gavel', title: 'Professional Councils', desc: 'PMDC, PEC, PNC, and PBA regulate professional education in medicine, engineering, nursing, and law respectively. Each requires programme-level accreditation.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6 border border-outline-variant/10 bg-surface-container-low p-6 transition-all duration-300 hover:border-primary/30">
                  <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">{item.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-on-surface text-lg font-semibold mb-2">{item.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SERVICES */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Institutional facilitation for international education investors, operators, and technology providers entering Pakistan.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: 'query_stats', title: 'Market Intelligence', desc: 'Demographic analysis, competitive mapping, and feasibility studies for education investments — from urban K-12 to rural vocational.' },
                { icon: 'handshake', title: 'Institutional Partnerships', desc: 'Connecting international universities and school groups with Pakistani institutions for franchise, affiliation, and joint degree arrangements.' },
                { icon: 'verified', title: 'Regulatory Navigation', desc: 'HEC charter applications, provincial NOCs, professional council accreditation, and campus approval facilitation.' },
                { icon: 'domain_add', title: 'Campus Development', desc: 'Site acquisition, construction management, and campus infrastructure development through our real estate and construction verticals.' },
                { icon: 'devices', title: 'EdTech Deployment', desc: 'Government and private sector distribution for learning management systems, assessment platforms, and digital content providers.' },
                { icon: 'groups', title: 'Workforce Pipeline', desc: 'Design and operationalise training programmes aligned with Gulf and international labour market requirements through NAVTTC frameworks.' },
              ].map((card, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 transition-all duration-300 hover:border-primary/30">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="cinzel-text text-on-surface text-lg font-semibold mb-3">{card.title}</h3>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* STATS */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest text-center fade-in-scale">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-8">Pakistan&apos;s education sector <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '$8B+', label: 'Education market size' },
                { number: '64%', label: 'Population under 30' },
                { number: '51M+', label: 'School-age children' },
                { number: '235+', label: 'HEC-recognised universities' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="cinzel-text text-primary text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                  <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* INVESTMENT OPPORTUNITIES */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Investment <span className="text-primary">opportunities.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Structural demand across every education segment — driven by demographics, policy reform, and the digital transition.</p>
            <div className="flex flex-col gap-4">
              {[
                { icon: 'school', title: 'Affordable Private Schools', desc: 'Low-cost private school networks serving the mass market represent the fastest-growing segment. Unit economics are proven — the challenge is operational scale.' },
                { icon: 'engineering', title: 'TVET for Export', desc: 'Gulf and European labour markets need certified Pakistani workers. Investment in NAVTTC-aligned training centres creates a direct revenue pathway through deployment fees.' },
                { icon: 'domain', title: 'University Campus Development', desc: "Pakistan's gross tertiary enrolment rate of 9% compares to 28% in India and 51% globally. New campus development is the primary constraint to expansion." },
                { icon: 'devices', title: 'Digital Assessment & Certification', desc: 'Online examination systems, digital credentialing, and AI-driven assessment platforms are replacing paper-based testing across government and private institutions.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6 border border-outline-variant/10 bg-surface-container-low p-6 transition-all duration-300 hover:border-primary/30">
                  <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">{item.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-on-surface text-lg font-semibold mb-2">{item.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest text-center fade-in">
          <div className="max-w-3xl mx-auto">
            <h2 className="cinzel-text text-4xl md:text-5xl text-on-surface mb-4">The largest youth population <span className="text-primary">in Pakistan&apos;s history.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg mb-10">Education infrastructure, institutional partnerships, and EdTech deployment for investors who understand demographic inevitability.</p>
            <a href="/contact?interest=Education#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Opportunities &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
