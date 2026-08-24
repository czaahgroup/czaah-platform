'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';
import { WorkforceRegistrationModal } from '@/components/WorkforceRegistrationModal';
import { EmployerRegistrationModal } from '@/components/EmployerRegistrationModal';
import { OEPRegistrationModal } from '@/components/OEPRegistrationModal';
import { RegistrationChooserModal } from '@/components/RegistrationChooserModal';

const talentPools = [
  { title: 'Civil Engineers', badge: 'high', badgeText: 'High Availability', teamSize: '5–50', timeline: '30–45 days', cert: 'Certified by PEC', industry: 'Construction,Mining', role: 'Engineers & Technical', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,UK,Germany,Poland,Romania,Pakistan', img: 'Labour-4.jpg' },
  { title: 'Welders & Fabricators', badge: 'high', badgeText: 'High Availability', teamSize: '10–200', timeline: '21–30 days', cert: 'AWS/ASME certified', industry: 'Construction,Oil & Gas,Manufacturing', role: 'Skilled Trades', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,UK,Germany,Poland,Romania,Croatia,Albania,Kosovo', img: 'Labour-1.jpg' },
  { title: 'Heavy Equipment Operators', badge: 'high', badgeText: 'High Availability', teamSize: '5–100', timeline: '21–30 days', cert: 'CAT/Komatsu trained', industry: 'Construction,Mining', role: 'Drivers & Operators', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,Poland,Romania,Croatia,Pakistan' },
  { title: 'Registered Nurses', badge: 'medium', badgeText: 'Medium Availability', teamSize: '10–100', timeline: '45–60 days', cert: 'PNC registered, Prometric/Dataflow ready', industry: 'Healthcare', role: 'Medical & Nursing', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,UK,Germany,Italy' },
  { title: 'Software Developers', badge: 'high', badgeText: 'High Availability', teamSize: '3–50', timeline: '14–21 days', cert: 'Full-stack, mobile, cloud', industry: 'IT & Telecom', role: 'IT Professionals', dest: 'UAE,Saudi Arabia,UK,Germany,Poland,Pakistan' },
  { title: 'Hotel & Restaurant Staff', badge: 'high', badgeText: 'High Availability', teamSize: '20–500', timeline: '30–45 days', cert: 'F&B, housekeeping, front desk', industry: 'Hospitality', role: 'Semi-Skilled Labour', dest: 'UAE,Saudi Arabia,Qatar,Oman,UK,Italy,Croatia,Montenegro,Albania,Kosovo' },
  { title: 'Electricians', badge: 'high', badgeText: 'High Availability', teamSize: '10–150', timeline: '21–30 days', cert: 'Licensed, HV/LV certified', industry: 'Construction,Manufacturing,Oil & Gas', role: 'Skilled Trades', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,UK,Germany,Poland,Romania,Pakistan', img: 'Labour-3.jpg' },
  { title: 'Project Managers', badge: 'medium', badgeText: 'Medium Availability', teamSize: '1–10', timeline: '30–45 days', cert: 'PMP, PRINCE2 holders', industry: 'Construction,Oil & Gas,IT & Telecom', role: 'Management & Supervisory', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,UK,Germany,Poland,Romania,Pakistan' },
  { title: 'Security Guards', badge: 'high', badgeText: 'High Availability', teamSize: '20–500', timeline: '21–30 days', cert: 'Ex-military, PSIRA eligible', industry: 'Security', role: 'Semi-Skilled Labour', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,Pakistan' },
  { title: 'General Labour', badge: 'high', badgeText: 'High Availability', teamSize: '50–2000', timeline: '14–21 days', cert: 'Physically screened, medically cleared', industry: 'Construction,Manufacturing', role: 'Semi-Skilled Labour', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,Poland,Romania,Croatia,Serbia,Montenegro,North Macedonia,Bosnia and Herzegovina,Albania,Kosovo', img: 'Labour-2.jpg' },
  { title: 'Doctors & Physicians', badge: 'limited', badgeText: 'Limited Availability', teamSize: '1–20', timeline: '60–90 days', cert: 'PMDC registered, SCFHS/DHA eligible', industry: 'Healthcare', role: 'Medical & Nursing', dest: 'Saudi Arabia,UAE,Qatar,UK,Germany' },
  { title: 'HVAC Technicians', badge: 'medium', badgeText: 'Medium Availability', teamSize: '5–50', timeline: '21–30 days', cert: 'Refrigeration & AC certified', industry: 'Construction,Manufacturing', role: 'Skilled Trades', dest: 'Saudi Arabia,UAE,Qatar,Kuwait,Bahrain,Oman,UK,Germany,Poland,Romania,Pakistan', img: 'Labour-5.jpg' },
];

const deploymentSteps = [
  { num: '1', title: 'Demand Letter', brief: 'Your official workforce requirement is registered and approved.', details: ['Employer issues demand letter with job descriptions, quantities, and terms.', 'CZAAH reviews for completeness and market alignment.', 'Document attested by Pakistani Embassy/Consulate in destination country.', 'OEP license verification and MOFA clearance obtained.'] },
  { num: '2', title: 'Candidate Sourcing', brief: 'We activate our nationwide recruitment network.', details: ['Job postings across 4 provinces via partner agencies and digital platforms.', 'Database matching for pre-vetted candidates.', 'Initial screening for education, experience, and language.', 'Shortlisting based on employer criteria — typically 3:1 ratio.'] },
  { num: '3', title: 'Trade Testing', brief: 'Skills verified to international standards.', details: ['Trade-specific testing at accredited centres (STEVTA, NAVTTC partners).', 'Welding, electrical, mechanical, and construction skills tested per destination country standards.', 'Computer-based testing for IT and professional roles.', 'Results documented with certificates and video evidence.'] },
  { num: '4', title: 'Medical Clearance', brief: 'Full health screening at GAMCA-approved centres.', details: ['Medical examination at GCC Approved Medical Centres Association (GAMCA) facilities.', 'Blood tests, chest X-ray, physical examination.', 'Drug screening and fitness-for-work assessment.', 'Medical reports valid for 3 months — CZAAH manages timing to align with visa processing.'] },
  { num: '5', title: 'Visa & Documentation', brief: 'All paperwork handled, end to end.', details: ['Work visa application and processing.', 'Employment contract review and attestation.', 'Passport verification and travel document preparation.', 'Pre-departure orientation on destination country laws, culture, and worker rights.', 'Travel booking and departure logistics.'] },
  { num: '6', title: 'Deployment & Support', brief: 'Your workforce arrives ready to perform.', details: ['Airport reception and transfer coordination at destination.', 'Post-arrival welfare check within 72 hours.', 'Employer onboarding support.', 'Ongoing grievance mechanism and worker welfare monitoring.', 'Contract renewal and rotation management.'] },
];

export default function ManpowerPage() {
  const [filters, setFilters] = useState<{ industry: Set<string>; role: Set<string>; dest: Set<string> }>({ industry: new Set(), role: new Set(), dest: new Set() });
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [showChooser, setShowChooser] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showEmployerRegistration, setShowEmployerRegistration] = useState(false);
  const [showOEPRegistration, setShowOEPRegistration] = useState(false);
  const [verifiedPartners, setVerifiedPartners] = useState<Array<{
    id: string;
    company_name: string;
    head_office_location: string;
    years_in_operation: number;
    sectors_specialization: string[];
    destination_countries: string[];
    company_website: string | null;
  }>>([]);

  useEffect(() => {
    fetch('/api/public/oep')
      .then(res => res.json())
      .then(data => setVerifiedPartners(data.data || []))
      .catch(() => {});
  }, []);

  function handleChooserSelect(type: 'worker' | 'employer' | 'oep') {
    setShowChooser(false);
    if (type === 'worker') setShowRegistration(true);
    if (type === 'employer') setShowEmployerRegistration(true);
    if (type === 'oep') setShowOEPRegistration(true);
  }
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach((el) => { observerRef.current?.observe(el); });
    return () => observerRef.current?.disconnect();
  }, []);

  function toggleFilter(type: 'industry' | 'role' | 'dest', value: string) {
    setFilters(prev => {
      const newSet = new Set(prev[type]);
      if (newSet.has(value)) newSet.delete(value); else newSet.add(value);
      return { ...prev, [type]: newSet };
    });
  }

  function isCardVisible(pool: typeof talentPools[0]) {
    const hasAny = filters.industry.size || filters.role.size || filters.dest.size;
    if (!hasAny) return true;
    const cIndustry = pool.industry.split(',');
    const cRole = pool.role.split(',');
    const cDest = pool.dest.split(',');
    if (filters.industry.size && !cIndustry.some(v => filters.industry.has(v))) return false;
    if (filters.role.size && !cRole.some(v => filters.role.has(v))) return false;
    if (filters.dest.size && !cDest.some(v => filters.dest.has(v))) return false;
    return true;
  }

  const visibleCount = talentPools.filter(isCardVisible).length;

  function toggleStep(idx: number) {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
      return newSet;
    });
  }

  const industries = ['Construction', 'Oil & Gas', 'Healthcare', 'Hospitality', 'IT & Telecom', 'Manufacturing', 'Security', 'Mining'];
  const roles = ['Engineers & Technical', 'Skilled Trades', 'Semi-Skilled Labour', 'Management & Supervisory', 'Medical & Nursing', 'IT Professionals', 'Drivers & Operators', 'Administrative'];
  const destinations = ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Malaysia', 'UK', 'Germany', 'Poland', 'Romania', 'Italy', 'Croatia', 'Serbia', 'Montenegro', 'North Macedonia', 'Bosnia and Herzegovina', 'Albania', 'Kosovo', 'Pakistan'];

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Human-Resources.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Workforce Solutions</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Human Resources &amp;<br /><span className="text-primary">Manpower.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Access to Pakistan&apos;s 70 million-strong workforce &mdash; overseas deployment, domestic staffing, executive search, and trade testing, managed to international labour standards.</p>
            <div className="flex gap-4 flex-wrap items-center">
              <a href="/contact?interest=Human%20Resources#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Workforce Needs &rarr;</a>
              <button
                onClick={() => setShowChooser(true)}
                className="border border-primary/40 text-primary hover:bg-primary/10 px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm transition-colors"
              >
                Register Now &rarr;
              </button>
            </div>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* WORKFORCE CONFIGURATOR */}
        <style>{`
          .hr-configurator { max-width: 1100px; margin: 0 auto; }
          .hr-filter-group { margin-bottom: 28px; }
          .hr-filter-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); font-weight: 600; margin-bottom: 12px; font-family: 'Raleway', sans-serif; }
          .hr-pills { display: flex; flex-wrap: wrap; gap: 8px; }
          .hr-pill { padding: 8px 18px; border: 1px solid var(--black-border); background: var(--black-card); color: var(--white-muted); font-size: 13px; font-family: 'Raleway', sans-serif; font-weight: 400; cursor: pointer; transition: all 0.25s var(--ease-smooth); user-select: none; }
          .hr-pill:hover { border-color: var(--gold-dim); color: var(--white); }
          .hr-pill.active { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.08); font-weight: 500; }
          .hr-count { font-size: 14px; color: var(--white-dim); margin-bottom: 20px; font-family: 'Raleway', sans-serif; }
          .hr-count span { color: var(--gold); font-weight: 600; }
          .hr-results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          @media (max-width: 900px) { .hr-results { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 600px) { .hr-results { grid-template-columns: 1fr; } }
          .hr-card { background: var(--black-card); border: 1px solid var(--black-border); overflow: hidden; transition: opacity 0.35s var(--ease-smooth), transform 0.35s var(--ease-smooth); }
          .hr-card.hr-hidden { display: none; }
          .hr-card:hover { border-color: rgba(201,168,76,0.3); }
          .hr-card-img-wrap { height: 140px; overflow: hidden; }
          .hr-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s var(--ease-smooth); }
          .hr-card:hover .hr-card-img { transform: scale(1.04); }
          .hr-card-body { padding: 24px; }
          .hr-card-title { font-family: 'Cinzel', serif; font-size: 18px; color: var(--white); margin-bottom: 10px; font-weight: 600; }
          .hr-badge { display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; margin-bottom: 14px; font-family: 'Raleway', sans-serif; }
          .hr-badge-high { background: rgba(34,197,94,0.12); color: #22c55e; }
          .hr-badge-medium { background: rgba(201,168,76,0.12); color: var(--gold); }
          .hr-badge-limited { background: rgba(239,68,68,0.10); color: #f87171; }
          .hr-card-meta { font-size: 13px; color: var(--white-dim); line-height: 1.7; font-family: 'Raleway', sans-serif; }
          .hr-card-meta strong { color: var(--white-muted); font-weight: 500; }
          .hr-card-cert { font-size: 12px; color: var(--gold-dim); margin-top: 10px; font-style: italic; }
          .hr-card-link { display: inline-block; margin-top: 16px; font-size: 13px; color: var(--gold); font-weight: 500; text-decoration: none; font-family: 'Raleway', sans-serif; transition: color 0.2s; }
          .hr-card-link:hover { color: var(--gold-light); }
          .hr-process { max-width: 760px; margin: 0 auto; position: relative; padding-left: 56px; }
          .hr-process::before { content: ''; position: absolute; left: 21px; top: 22px; bottom: 22px; width: 2px; background: linear-gradient(180deg, var(--gold) 0%, rgba(201,168,76,0.25) 100%); }
          .hr-step { position: relative; margin-bottom: 32px; cursor: pointer; }
          .hr-step:last-child { margin-bottom: 0; }
          .hr-step-node { position: absolute; left: -56px; top: 0; width: 44px; height: 44px; border: 2px solid var(--gold); background: var(--black-card); display: flex; align-items: center; justify-content: center; font-family: 'Raleway', sans-serif; font-weight: 600; font-size: 16px; color: var(--gold); transition: background 0.3s var(--ease-smooth), color 0.3s var(--ease-smooth); z-index: 1; }
          .hr-step.expanded .hr-step-node { background: var(--gold); color: #000; }
          .hr-step-header { display: flex; align-items: center; gap: 12px; }
          .hr-step-title { font-family: 'Cinzel', serif; font-size: 20px; color: var(--white); font-weight: 600; transition: color 0.2s; }
          .hr-step:hover .hr-step-title { color: var(--gold); }
          .hr-step-toggle { font-size: 18px; color: var(--gold-dim); transition: transform 0.3s var(--ease-smooth); margin-left: auto; flex-shrink: 0; }
          .hr-step.expanded .hr-step-toggle { transform: rotate(180deg); }
          .hr-step-brief { font-size: 14px; color: var(--white-dim); margin-top: 6px; font-family: 'Raleway', sans-serif; line-height: 1.6; }
          .hr-step-detail { max-height: 0; overflow: hidden; transition: max-height 0.45s var(--ease-smooth), opacity 0.35s var(--ease-smooth); opacity: 0; margin-top: 0; border-left: 2px solid var(--gold-dim); padding-left: 16px; margin-left: 4px; }
          .hr-step.expanded .hr-step-detail { max-height: 400px; opacity: 1; margin-top: 14px; }
          .hr-step-detail ul { list-style: none; padding: 0; margin: 0; }
          .hr-step-detail li { font-size: 13px; color: var(--white-muted); line-height: 1.7; padding: 4px 0; font-family: 'Raleway', sans-serif; position: relative; padding-left: 16px; }
          .hr-step-detail li::before { content: '\u2014'; position: absolute; left: 0; color: var(--gold-dim); }
          @media (max-width: 600px) { .hr-process { padding-left: 48px; } .hr-step-node { left: -48px; width: 36px; height: 36px; font-size: 14px; } .hr-process::before { left: 17px; } .hr-step-title { font-size: 17px; } }
        `}</style>

        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Workforce <span className="text-primary">Configurator.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Select your requirements to explore matching talent pools from our recruitment network.</p>

            <div className="hr-configurator">
              <div className="hr-filter-group">
                <div className="hr-filter-label">Industry</div>
                <div className="hr-pills">
                  {industries.map(v => (<div key={v} className={`hr-pill${filters.industry.has(v) ? ' active' : ''}`} onClick={() => toggleFilter('industry', v)}>{v}</div>))}
                </div>
              </div>
              <div className="hr-filter-group">
                <div className="hr-filter-label">Role Category</div>
                <div className="hr-pills">
                  {roles.map(v => (<div key={v} className={`hr-pill${filters.role.has(v) ? ' active' : ''}`} onClick={() => toggleFilter('role', v)}>{v}</div>))}
                </div>
              </div>
              <div className="hr-filter-group">
                <div className="hr-filter-label">Deployment Destination</div>
                <div className="hr-pills">
                  {destinations.map(v => (<div key={v} className={`hr-pill${filters.dest.has(v) ? ' active' : ''}`} onClick={() => toggleFilter('dest', v)}>{v === 'Pakistan' ? 'Pakistan (Domestic)' : v}</div>))}
                </div>
              </div>

              <div className="hr-count">Showing <span>{visibleCount}</span> of {talentPools.length} talent pools</div>

              <div className="hr-results">
                {talentPools.map((pool, i) => (
                  <div key={i} className={`hr-card${!isCardVisible(pool) ? ' hr-hidden' : ''}`}>
                    {pool.img && (
                      <div className="hr-card-img-wrap">
                        <img className="hr-card-img" src={`/Images/${pool.img}`} alt={pool.title} loading="lazy" />
                      </div>
                    )}
                    <div className="hr-card-body">
                      <div className="hr-card-title">{pool.title}</div>
                      <div className={`hr-badge hr-badge-${pool.badge}`}>{pool.badgeText}</div>
                      <div className="hr-card-meta">
                        <strong>Team Size:</strong> {pool.teamSize}<br />
                        <strong>Timeline:</strong> {pool.timeline}
                      </div>
                      <div className="hr-card-cert">{pool.cert}</div>
                      <a href="/contact" className="hr-card-link">Request Workforce &rarr;</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* DEPLOYMENT PROCESS */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Deployment <span className="text-primary">Process.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">From demand letter to deployed workforce — every step managed, every detail handled.</p>

            <div className="hr-process">
              {deploymentSteps.map((step, i) => (
                <div key={i} className={`hr-step${expandedSteps.has(i) ? ' expanded' : ''}`} onClick={() => toggleStep(i)}>
                  <div className="hr-step-node">{step.num}</div>
                  <div className="hr-step-header">
                    <div className="hr-step-title">{step.title}</div>
                    <div className="hr-step-toggle">&#9660;</div>
                  </div>
                  <div className="hr-step-brief">{step.brief}</div>
                  <div className="hr-step-detail">
                    <ul>
                      {step.details.map((d, j) => (<li key={j}>{d}</li>))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* TWO PILLARS */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in-left">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Overseas Deployment</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Talent for the <span className="text-primary">Gulf, Europe &amp; beyond.</span></h3>
              <p className="raleway-text text-primary text-lg font-medium leading-relaxed mb-4">We connect verified European employers with licensed overseas recruitment partners in Pakistan.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Pakistan is one of the world&apos;s largest exporters of manpower, with millions deployed across the Gulf, Middle East, and beyond. CZAAH operates as a trusted intermediary, connecting employers directly with licensed overseas employment promoters for end-to-end recruitment across construction, oil &amp; gas, hospitality, healthcare, and industrial sectors.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Beyond the Gulf, we&apos;re expanding deployment corridors across the United Kingdom, the wider European Union, and the Balkans — including Albania and Kosovo — opening new pathways for skilled and semi-skilled Pakistani workers into European labour markets.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">We handle demand letter processing, trade testing, medical clearance, visa coordination, and pre-departure orientation — ensuring compliant, deployment-ready candidates on your timeline.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Our network spans across Punjab, KPK, Sindh, and Balochistan, giving us access to diverse talent pools that match the specific requirements of Gulf, UK, European, Balkan, and Asian employers.</p>
            </div>
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Domestic Staffing</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Build teams <span className="text-primary">in Pakistan.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">For companies establishing operations in Pakistan — whether in mining, construction, IT, or manufacturing — CZAAH provides executive search, mid-level recruitment, and bulk hiring services.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">We recruit engineers, project managers, skilled tradespeople, security personnel, administrative staff, and operational teams tailored to project requirements and timelines.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Our HR advisory extends to workforce planning, compensation benchmarking, labour law compliance, and employee retention strategies for the Pakistani market.</p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* VERIFIED PARTNER NETWORK */}
        {verifiedPartners.length > 0 && (
          <>
            <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
              <div className="max-w-[1600px] mx-auto">
                <h2 className="cinzel-text text-4xl text-on-surface mb-2">Verified Partner <span className="text-primary">Network.</span></h2>
                <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Licensed Overseas Employment Promoters vetted and approved by CZAAH for cross-border workforce deployment.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
                  {verifiedPartners.map(partner => (
                    <div key={partner.id} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-primary text-3xl">verified</span>
                        <h3 className="cinzel-text text-lg text-on-surface">{partner.company_name}</h3>
                      </div>
                      <p className="raleway-text text-on-surface-variant text-sm mb-3">
                        <span className="material-symbols-outlined align-middle text-base mr-1" style={{ verticalAlign: 'middle' }}>location_on</span>
                        {partner.head_office_location} &middot; {partner.years_in_operation}+ yrs
                      </p>
                      {partner.sectors_specialization?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {partner.sectors_specialization.map(s => (
                            <span key={s} className="raleway-text text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{s}</span>
                          ))}
                        </div>
                      )}
                      {partner.destination_countries?.length > 0 && (
                        <p className="raleway-text text-on-surface-variant text-xs">
                          Deploys to: {partner.destination_countries.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="w-full h-px bg-outline-variant/20" />
          </>
        )}

        {/* SERVICES */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Comprehensive manpower and human resources solutions for domestic and international clients.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {[
                { icon: 'public', title: 'Overseas Recruitment', desc: 'Connecting employers with licensed overseas employment promoters across the Gulf, Middle East, and international markets. End-to-end coordination from candidate sourcing through visa processing to deployment, compliant with OEP regulations.' },
                { icon: 'person_search', title: 'Executive Search', desc: 'C-suite and senior management recruitment for companies entering or operating in Pakistan. Confidential headhunting with deep networks across finance, engineering, technology, and operations.' },
                { icon: 'groups', title: 'Bulk Hiring & Mobilisation', desc: 'Large-scale workforce mobilisation for construction, mining, and infrastructure projects. Hundreds or thousands of skilled and semi-skilled workers recruited, tested, and deployed on schedule.' },
                { icon: 'verified', title: 'Trade Testing & Certification', desc: 'Comprehensive skills assessment and trade testing through accredited centres. Welders, electricians, heavy equipment operators, and technicians verified to international standards.' },
                { icon: 'gavel', title: 'HR Advisory & Compliance', desc: "Labour law compliance, compensation structuring, employee contracts, and workforce planning tailored to Pakistan's regulatory environment. EOBI, social security, and tax compliance managed end-to-end." },
                { icon: 'work', title: 'Temporary & Contract Staffing', desc: 'Flexible staffing solutions for project-based requirements. Payroll management, insurance, and administrative overhead handled by CZAAH — you focus on operations.' },
              ].map((svc, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4">{svc.icon}</span>
                  <h3 className="cinzel-text text-xl text-on-surface mb-3">{svc.title}</h3>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SECTORS WE SERVE */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Industries we <span className="text-primary">serve.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Our recruitment expertise spans every major employment sector.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              {[
                { icon: 'domain', title: 'Construction & Infrastructure', desc: 'Civil engineers, quantity surveyors, site supervisors, heavy machinery operators, steel fixers, carpenters, and general labour for megaprojects across the Gulf and Pakistan.' },
                { icon: 'oil_barrel', title: 'Oil, Gas & Energy', desc: 'Drilling crews, pipeline technicians, refinery operators, HSE officers, and field engineers for upstream, midstream, and downstream energy operations.' },
                { icon: 'local_hospital', title: 'Healthcare & Nursing', desc: 'Doctors, registered nurses, pharmacists, lab technicians, and paramedical staff deployed to Gulf hospitals, clinics, and healthcare facilities with credential verification.' },
                { icon: 'code', title: 'Technology & IT', desc: 'Software developers, network engineers, data analysts, cybersecurity professionals, and IT support staff for both local and international tech companies and government IT projects.' },
              ].map((item, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                  <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">{item.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-lg text-on-surface mb-2">{item.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* STATS */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center stagger">
              {[
                { number: '70M+', label: 'Labour force' },
                { number: 'Gulf, UK & EU', label: 'Deployment reach' },
                { number: 'OEP', label: 'Licensed partner network' },
                { number: 'Multi', label: 'Sector coverage' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="cinzel-text text-primary text-4xl font-bold mb-2">{stat.number}</div>
                  <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-4xl text-on-surface mb-4">The talent your project <span className="text-primary">demands.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-2xl mx-auto">From skilled trades to senior executives &mdash; vetted, deployed, and managed to international standards.</p>
            <div className="flex gap-4 flex-wrap justify-center items-center">
              <a href="/contact?interest=Human%20Resources#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Workforce Needs &rarr;</a>
              <button
                onClick={() => setShowChooser(true)}
                className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm"
              >
                Register Now &rarr;
              </button>
            </div>
          </div>
        </section>

      </div>

      <RegistrationChooserModal open={showChooser} onClose={() => setShowChooser(false)} onSelect={handleChooserSelect} />
      <WorkforceRegistrationModal open={showRegistration} onClose={() => setShowRegistration(false)} />
      <EmployerRegistrationModal open={showEmployerRegistration} onClose={() => setShowEmployerRegistration(false)} />
      <OEPRegistrationModal open={showOEPRegistration} onClose={() => setShowOEPRegistration(false)} />

      <Footer />
    </>
  );
}
