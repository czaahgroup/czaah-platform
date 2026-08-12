'use client';
// @ts-nocheck

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function ConstructionPage() {
  useEffect(() => {
    // Intersection Observer for fade-in sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Project Type Selector
        (function() {
          const data = [
            {
              desc: 'NHA and provincial highway projects. Motorways, interchanges, flyovers, and ring roads. CZAAH navigates procurement under PPRA, facilitates JVs with Chinese and local contractors, and provides on-ground project coordination.',
              deliverables: ['Tender identification & bidding support', 'NHA/provincial liaison', 'JV structuring with international contractors', 'Right-of-way & land acquisition facilitation', 'Construction oversight & progress reporting'],
              examples: 'M-Tag motorway extensions, CPEC western route, Provincial highway rehabilitation',
              stats: '$15B+ pipeline \u2002|\u2002 NHA + 4 provincial depts'
            },
            {
              desc: 'High-rise office towers, shopping complexes, and mixed-use developments in Islamabad, Lahore, and Karachi. Full-cycle from land acquisition and CDA/LDA approvals through construction management.',
              deliverables: ['Site identification & feasibility', 'Zoning & building permit navigation', 'Developer-contractor matching', 'Construction management & QS oversight', 'Tenant pre-leasing coordination'],
              examples: 'Blue Area commercial towers, Gulberg mixed-use, DHA commercial plazas',
              stats: '3 major cities \u2002|\u2002 CDA/LDA/KDA access'
            },
            {
              desc: 'Purpose-built industrial facilities in CPEC Special Economic Zones and private industrial estates. Tax holiday zones with duty exemptions and preferential utility rates.',
              deliverables: ['SEZ plot allocation & registration', 'Factory design & pre-engineered buildings', 'Utility connections (gas, electricity, water)', 'Environmental clearance (EPA)', 'Equipment installation coordination'],
              examples: 'Rashakai SEZ, Allama Iqbal Industrial City, Faisalabad M-3 Industrial Estate',
              stats: '9 SEZs \u2002|\u2002 Tax holidays up to 10 years'
            },
            {
              desc: 'WAPDA-funded dam projects, run-of-river hydro schemes, solar parks, and electricity transmission infrastructure. Pakistan\u2019s 10,000 MW+ generation gap creates a massive pipeline.',
              deliverables: ['WAPDA & PPIB liaison', 'Environmental & social impact assessments', 'Contractor procurement & pre-qualification', 'Dam safety & quality oversight', 'Transmission line right-of-way'],
              examples: 'Diamer-Bhasha Dam, Dasu Hydropower, Mohmand Dam',
              stats: '10,000MW+ gap \u2002|\u2002 $20B+ investment needed'
            },
            {
              desc: 'Pakistan faces a 10M+ housing unit deficit. Government programmes (Naya Pakistan Housing, ABAD schemes) and private developers are scaling rapidly. CZAAH facilitates land bank assembly, approvals, and construction partnerships.',
              deliverables: ['Land bank identification & due diligence', 'NOC & approval processing', 'Builder-developer partnerships', 'Mortgage & housing finance liaison', 'Community infrastructure planning'],
              examples: 'Naya Pakistan Housing, DHA phases, Bahria Town expansions',
              stats: '10M+ housing deficit \u2002|\u2002 Government subsidy schemes'
            },
            {
              desc: 'Rapid urbanisation demands flyovers, underpasses, and bridges. Federal and provincial governments are actively tendering. CZAAH provides early tender intelligence and contractor facilitation.',
              deliverables: ['Tender pipeline monitoring', 'Pre-qualification documentation', 'International contractor partnerships', 'Traffic management planning', 'Structural engineering oversight'],
              examples: 'Rawalpindi Ring Road, Karachi elevated expressway, Provincial bridge programmes',
              stats: '50+ active tenders \u2002|\u2002 Multi-province'
            }
          ];

          const tiles = document.querySelectorAll('.cx-tile');
          const detail = document.getElementById('cxDetail');
          const prompt = document.getElementById('cxPrompt');
          let activeIdx = -1;

          tiles.forEach(tile => {
            tile.addEventListener('click', function() {
              const idx = parseInt(this.dataset.cx);
              if (idx === activeIdx) {
                // Deselect
                this.classList.remove('cx-active');
                detail.classList.remove('cx-detail-open');
                prompt.style.display = '';
                activeIdx = -1;
                return;
              }
              tiles.forEach(t => t.classList.remove('cx-active'));
              this.classList.add('cx-active');
              activeIdx = idx;
              const d = data[idx];
              document.getElementById('cxDesc').textContent = d.desc;
              const ul = document.getElementById('cxDeliverables');
              ul.innerHTML = d.deliverables.map(item => '<li>' + item + '</li>').join('');
              document.getElementById('cxExamples').innerHTML = '<span>' + d.examples + '</span>';
              document.getElementById('cxStats').textContent = d.stats;
              prompt.style.display = 'none';
              detail.classList.add('cx-detail-open');
            });
          });
        })();




        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));
  }, []);

  return (
    <>
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: `
    .cx-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .cx-tile {
      background: var(--black-card);
      border: 1px solid var(--black-border);
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.3s var(--ease-smooth), box-shadow 0.3s var(--ease-smooth), transform 0.2s var(--ease-out);
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .cx-tile:hover { border-color: rgba(201,168,76,0.4); transform: translateY(-2px); }
    .cx-tile.cx-active {
      border-color: var(--gold);
      box-shadow: 0 0 24px rgba(201,168,76,0.15);
      transform: translateY(-3px);
    }
    .cx-tile-icon {
      font-size: 2.5rem;
      color: var(--white-muted);
      transition: color 0.3s, text-shadow 0.3s;
      line-height: 1;
    }
    .cx-tile.cx-active .cx-tile-icon { color: var(--gold); text-shadow: 0 0 16px rgba(201,168,76,0.4); }
    .cx-tile-name {
      font-family: 'Cinzel', serif;
      font-size: 1.1rem;
      color: var(--white);
      font-weight: 600;
    }
    .cx-tile-tagline {
      font-size: 0.8rem;
      color: var(--white-dim);
      line-height: 1.4;
    }
    .cx-prompt {
      text-align: center;
      color: var(--white-dim);
      font-size: 0.9rem;
      padding: 32px 0 0;
      font-style: italic;
    }
    .cx-detail {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: max-height 0.5s var(--ease-smooth), opacity 0.4s var(--ease-smooth), margin 0.4s var(--ease-smooth);
      background: var(--black-elevated);
      border: 1px solid var(--black-border);
      margin-top: 0;
    }
    .cx-detail.cx-detail-open {
      max-height: 600px;
      opacity: 1;
      margin-top: 24px;
    }
    .cx-detail-inner { padding: 40px; }
    .cx-detail-desc {
      color: var(--white-muted);
      font-size: 0.95rem;
      line-height: 1.7;
      margin-bottom: 28px;
    }
    .cx-detail-columns { display: flex; gap: 48px; margin-bottom: 28px; }
    .cx-detail-col { flex: 1; }
    .cx-detail-col h4 {
      font-family: 'Cinzel', serif;
      color: var(--white);
      font-size: 1rem;
      margin-bottom: 14px;
    }
    .cx-deliverables { list-style: none; padding: 0; margin: 0; }
    .cx-deliverables li {
      position: relative;
      padding-left: 18px;
      color: var(--white-muted);
      font-size: 0.88rem;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .cx-deliverables li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 6px;
      height: 6px;
      background: var(--gold);
      border-radius: 50%;
    }
    .cx-examples {
      color: var(--white-dim);
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .cx-examples span { color: var(--gold-dim); }
    .cx-stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--black-border);
      padding-top: 20px;
    }
    .cx-stat-text {
      font-family: 'Cinzel', serif;
      color: var(--gold);
      font-size: 1rem;
      letter-spacing: 0.02em;
    }
    .cx-detail-link {
      color: var(--gold);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .cx-detail-link:hover { opacity: 0.75; }

    @media (max-width: 900px) {
      .cx-grid { grid-template-columns: repeat(2, 1fr); }
      .cx-detail-columns { flex-direction: column; gap: 24px; }
    }
    @media (max-width: 540px) {
      .cx-grid { grid-template-columns: 1fr; }
      .cx-detail-inner { padding: 24px; }
    }

    /* TIMELINE */
    .cx-timeline {
      display: flex;
      align-items: flex-start;
      position: relative;
      justify-content: space-between;
    }
    .cx-timeline::before {
      content: '';
      position: absolute;
      top: 30px;
      left: 30px;
      right: 30px;
      height: 2px;
      background: linear-gradient(90deg, var(--gold), rgba(201,168,76,0.3), var(--gold));
      background-size: 200% 100%;
      animation: cx-pulse 4s ease-in-out infinite;
    }
    @keyframes cx-pulse {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .cx-phase {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      flex: 1;
      position: relative;
      z-index: 1;
      cursor: default;
    }
    .cx-node {
      width: 60px;
      height: 60px;
      border: 2px solid var(--gold);
      background: var(--black-card);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Cinzel', serif;
      font-size: 1.2rem;
      color: var(--gold);
      font-weight: 600;
      margin-bottom: 16px;
      transition: transform 0.3s var(--ease-smooth), box-shadow 0.3s var(--ease-smooth);
      flex-shrink: 0;
    }
    .cx-phase:hover .cx-node {
      transform: scale(1.15);
      box-shadow: 0 0 20px rgba(201,168,76,0.25);
    }
    .cx-phase-name {
      font-family: 'Cinzel', serif;
      font-size: 1rem;
      color: var(--white);
      font-weight: 600;
      margin-bottom: 8px;
    }
    .cx-phase-desc {
      font-size: 0.82rem;
      color: var(--white-dim);
      line-height: 1.55;
      max-width: 180px;
      transition: color 0.3s;
    }
    .cx-phase:hover .cx-phase-desc { color: var(--white-muted); }

    @media (max-width: 768px) {
      .cx-timeline { flex-direction: column; align-items: flex-start; gap: 0; }
      .cx-timeline::before {
        top: 30px;
        bottom: 30px;
        left: 30px;
        right: auto;
        width: 2px;
        height: auto;
        background: linear-gradient(180deg, var(--gold), rgba(201,168,76,0.3), var(--gold));
        background-size: 100% 200%;
        animation: cx-pulse-v 4s ease-in-out infinite;
      }
      @keyframes cx-pulse-v {
        0%, 100% { background-position: 50% 0%; }
        50% { background-position: 50% 100%; }
      }
      .cx-phase {
        flex-direction: row;
        text-align: left;
        gap: 20px;
        padding: 16px 0;
      }
      .cx-node { margin-bottom: 0; }
      .cx-phase-desc { max-width: 100%; }
    }
  ` }} />

      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{backgroundImage: "url('/Images/Construction.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Infrastructure &amp; Development</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Construction &amp;<br /><span className="text-primary">Development.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Infrastructure megaprojects, commercial development, CPEC corridor builds, and Special Economic Zone construction &mdash; delivered through CZAAH's network of vetted local partners and institutional project management.</p>
            <a href="/contact?interest=Construction%20%26%20Development#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss a Project &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  PROJECT TYPE SELECTOR  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Project <span className="text-primary">types.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Select a category to explore our construction capabilities across Pakistan's key development sectors.</p>

            <div className="cx-grid" id="cxGrid">
              <div className="cx-tile" data-cx="0">
                <div className="cx-tile-icon">&#9644;</div>
                <div className="cx-tile-name">Roads &amp; Motorways</div>
                <div className="cx-tile-tagline">CPEC corridors &amp; national highways</div>
              </div>
              <div className="cx-tile" data-cx="1">
                <div className="cx-tile-icon">&#9962;</div>
                <div className="cx-tile-name">Commercial &amp; Mixed-Use</div>
                <div className="cx-tile-tagline">Towers, malls &amp; urban development</div>
              </div>
              <div className="cx-tile" data-cx="2">
                <div className="cx-tile-icon">&#9881;</div>
                <div className="cx-tile-name">Industrial &amp; SEZ</div>
                <div className="cx-tile-tagline">Factories, warehouses &amp; special zones</div>
              </div>
              <div className="cx-tile" data-cx="3">
                <div className="cx-tile-icon">&#9889;</div>
                <div className="cx-tile-name">Dams &amp; Energy Infrastructure</div>
                <div className="cx-tile-tagline">Hydropower, transmission &amp; water</div>
              </div>
              <div className="cx-tile" data-cx="4">
                <div className="cx-tile-icon">&#8962;</div>
                <div className="cx-tile-name">Residential &amp; Housing</div>
                <div className="cx-tile-tagline">Housing schemes &amp; gated communities</div>
              </div>
              <div className="cx-tile" data-cx="5">
                <div className="cx-tile-icon">&#9650;</div>
                <div className="cx-tile-name">Bridges &amp; Flyovers</div>
                <div className="cx-tile-tagline">Urban &amp; intercity connectivity</div>
              </div>
            </div>

            <p className="cx-prompt" id="cxPrompt">Select a project type to explore our capabilities</p>

            <div className="cx-detail" id="cxDetail">
              <div className="cx-detail-inner">
                <p className="cx-detail-desc" id="cxDesc"></p>
                <div className="cx-detail-columns">
                  <div className="cx-detail-col">
                    <h4>Key Deliverables</h4>
                    <ul className="cx-deliverables" id="cxDeliverables"></ul>
                  </div>
                  <div className="cx-detail-col">
                    <h4>Example Projects</h4>
                    <p className="cx-examples" id="cxExamples"></p>
                  </div>
                </div>
                <div className="cx-stat-row">
                  <span className="cx-stat-text" id="cxStats"></span>
                  <a href="/contact" className="cx-detail-link">Discuss a Project &rarr;</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  PROJECT DELIVERY TIMELINE  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Project delivery <span className="text-primary">timeline.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-14 leading-relaxed">Five phases from opportunity to operational asset — every project follows a disciplined path.</p>

            <div className="cx-timeline">
              <div className="cx-phase">
                <div className="cx-node">1</div>
                <div className="cx-phase-name">Identify</div>
                <p className="cx-phase-desc">Project scoping, feasibility analysis, and tender pipeline matching. We identify the right opportunity before anyone else moves.</p>
              </div>
              <div className="cx-phase">
                <div className="cx-node">2</div>
                <div className="cx-phase-name">Structure</div>
                <p className="cx-phase-desc">JV formation, contractor pre-qualification, bid preparation, and financing structure. Every partnership built on solid commercial terms.</p>
              </div>
              <div className="cx-phase">
                <div className="cx-node">3</div>
                <div className="cx-phase-name">Navigate</div>
                <p className="cx-phase-desc">Regulatory approvals, environmental clearances, land acquisition, and government liaison. We clear the path before construction begins.</p>
              </div>
              <div className="cx-phase">
                <div className="cx-node">4</div>
                <div className="cx-phase-name">Build</div>
                <p className="cx-phase-desc">Construction management, quality assurance, cost monitoring, and progress reporting. Independent oversight protecting your investment.</p>
              </div>
              <div className="cx-phase">
                <div className="cx-node">5</div>
                <div className="cx-phase-name">Deliver</div>
                <p className="cx-phase-desc">Handover coordination, commissioning, defects liability management, and post-completion support. The project isn't done until it performs.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  TWO PILLARS  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in-left">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Infrastructure</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Building Pakistan's <span className="text-primary">backbone.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">From CPEC motorways and energy transmission lines to bridges, dams, and water treatment facilities — Pakistan's infrastructure pipeline demands capable partners who understand both the engineering and the regulatory landscape.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">CZAAH works with international and domestic contractors to navigate government procurement, NHA and WAPDA requirements, and provincial development authorities. We provide access to tender pipelines, joint venture structuring, and on-the-ground project facilitation.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Our relationships with federal and provincial planning departments give us early visibility into upcoming projects, allowing partners to prepare competitive bids with local intelligence that others simply don't have.</p>
            </div>
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Commercial Development</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Shaping Pakistan's <span className="text-primary">skyline.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Rapid urbanisation and a growing middle class are driving demand for commercial towers, mixed-use developments, shopping complexes, and industrial parks across Islamabad, Lahore, and Karachi.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">CZAAH facilitates commercial development projects from land acquisition and zoning approvals through construction management to tenant leasing. We bring together developers, investors, and construction firms into structured partnerships.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Our expertise extends to Special Economic Zones along CPEC corridors, where industrial construction offers significant incentives including tax holidays, duty exemptions, and preferential utility rates.</p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SERVICES  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">capabilities.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Full-lifecycle construction facilitation &mdash; from project identification through delivery.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {[
                { icon: 'domain', title: 'Civil Infrastructure', desc: 'Roads, bridges, flyovers, dams, and water management systems. Government and CPEC-funded projects facilitated through our procurement network and regulatory relationships.' },
                { icon: 'apartment', title: 'Commercial Buildings', desc: 'Office towers, retail complexes, hotels, and mixed-use developments. Full-cycle facilitation from land identification and approvals to construction oversight and handover.' },
                { icon: 'factory', title: 'Industrial Construction', desc: 'Factories, warehouses, processing plants, and SEZ facilities. Turnkey industrial construction with compliance-ready design, utility coordination, and environmental clearances.' },
                { icon: 'assignment', title: 'Project Management', desc: 'Independent project management and construction oversight for international investors. Cost monitoring, timeline tracking, quality assurance, and contractor coordination on your behalf.' },
                { icon: 'handshake', title: 'Contractor Sourcing', desc: 'Vetted network of Pakistani and international construction firms, subcontractors, and material suppliers. Competitive bidding coordination and contract negotiation support.' },
                { icon: 'gavel', title: 'Regulatory Navigation', desc: 'Building permits, environmental impact assessments, CDA/LDA/KDA approvals, and safety certifications. We manage the regulatory pipeline so your project stays on schedule.' },
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

        {/*  KEY RELATIONSHIPS  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Key <span className="text-primary">relationships.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Deep connections across the construction ecosystem.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              {[
                { icon: 'route', title: 'NHA & Provincial Highways', desc: 'Direct relationships with the National Highway Authority and provincial highway departments for road, bridge, and motorway project pipelines and tender access.' },
                { icon: 'location_city', title: 'Development Authorities', desc: 'CDA (Islamabad), LDA (Lahore), KDA (Karachi), and RDA (Rawalpindi) — zoning approvals, land-use changes, and building permits navigated through established channels.' },
                { icon: 'public', title: 'CPEC Authority', desc: 'Coordination with the CPEC Authority and Chinese contractors for infrastructure and SEZ development projects under the China-Pakistan Economic Corridor framework.' },
                { icon: 'engineering', title: 'Engineering Council', desc: 'Pakistan Engineering Council relationships for contractor licensing, professional certifications, and compliance with national building codes and safety standards.' },
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

        {/*  STATS  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center stagger">
              {[
                { number: '$65B+', label: 'CPEC investment pipeline' },
                { number: '9', label: 'SEZs under development' },
                { number: '8%', label: 'Annual sector growth' },
                { number: 'Multi', label: 'Province coverage' },
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
            <h2 className="cinzel-text text-4xl text-on-surface mb-4">Build with the right <span className="text-primary">partner.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-2xl mx-auto">Infrastructure, commercial development, and CPEC corridor projects &mdash; executed through trusted local partnerships.</p>
            <a href="/contact?interest=Construction%20%26%20Development#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss a Project &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
