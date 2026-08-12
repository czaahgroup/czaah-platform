'use client';
// @ts-nocheck

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function TechnologyPage() {
  useEffect(() => {
    // Intersection Observer for fade-in sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));



      // IT Services Directory — Grid + Filter + Search
      (function() {
        const grid = document.getElementById('itTrack');
        const noResults = document.getElementById('itNoResults');
        if (!grid) return;
        const cards = [...grid.querySelectorAll('.it-card')];
        let activeFilter = 'all';
        let searchQuery = '';

        function applyFilters() {
          const q = searchQuery.toLowerCase().trim();
          let visible = 0;
          cards.forEach(card => {
            const catMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
            let searchMatch = true;
            if (q) {
              const text = (card.dataset.keywords || '') + ' ' + (card.dataset.category || '') + ' ' +
                (card.querySelector('h3')?.textContent || '') + ' ' + (card.querySelector('.it-card-body p')?.textContent || '');
              searchMatch = text.toLowerCase().includes(q);
            }
            if (catMatch && searchMatch) { card.classList.remove('hidden'); visible++; }
            else { card.classList.add('hidden'); }
          });
          noResults.classList.toggle('show', visible === 0);
        }

        window.filterIT = function(btn) {
          activeFilter = btn.dataset.filter;
          document.querySelectorAll('.it-filter').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('itSearchInput').value = '';
          searchQuery = '';
          applyFilters();
        };

        window.searchIT = function(query) {
          searchQuery = query;
          if (query.trim()) {
            document.querySelectorAll('.it-filter').forEach(b => b.classList.remove('active'));
            document.querySelector('.it-filter[data-filter="all"]').classList.add('active');
            activeFilter = 'all';
          }
          applyFilters();
        };
      })();
  }, []);

  return (
    <>
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: `
    /* ── IT SERVICES DIRECTORY ── */
    .it-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 32px;
      margin-bottom: 28px;
    }
    .it-filter {
      padding: 8px 18px;
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 20px;
      color: var(--white-muted);
      font-family: 'Raleway', sans-serif;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .it-filter:hover { border-color: var(--gold-dim); color: var(--white); }
    .it-filter.active { background: var(--gold); border-color: var(--gold); color: var(--black); font-weight: 500; }

    .it-search-wrap { position: relative; margin-left: auto; flex-shrink: 0; }
    .it-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--white-muted); stroke-width: 2; fill: none; pointer-events: none; transition: stroke 0.3s; }
    .it-search-input { padding: 8px 18px 8px 38px; background: var(--black-card); border: 1px solid var(--black-border); border-radius: 20px; color: var(--white); font-family: 'Raleway', sans-serif; font-size: 13px; width: 240px; outline: none; transition: all 0.3s; }
    .it-search-input::placeholder { color: var(--white-muted); }
    .it-search-input:focus { border-color: var(--gold); width: 280px; }
    .it-search-wrap:focus-within .it-search-icon { stroke: var(--gold); }

    .it-directory-layout { display: flex; gap: 24px; align-items: flex-start; }
    .it-directory-layout .it-grid-wrapper { flex: 1; min-width: 0; }

    .it-no-results { padding: 40px 20px; text-align: center; color: var(--white-muted); font-size: 14px; display: none; width: 100%; }
    .it-no-results.show { display: block; }

    .it-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .it-card {
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 10px;
      overflow: hidden;
      transition: all 0.4s var(--ease-smooth);
    }
    .it-card:hover { border-color: rgba(201, 168, 76, 0.3); transform: translateY(-3px); box-shadow: 0 8px 28px rgba(201, 168, 76, 0.08); }
    .it-card.hidden { display: none; }

    .it-card-body { padding: 16px; }
    .it-tags { display: flex; gap: 5px; margin-bottom: 8px; flex-wrap: wrap; }
    .it-tag { padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; background: var(--gold-dim); color: var(--gold); }
    .it-tag.loc { background: rgba(255, 255, 255, 0.06); color: var(--white-dim); }

    .it-card-body h3 { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; margin-bottom: 6px; color: var(--white); }
    .it-card-body p { font-size: 12px; line-height: 1.55; color: var(--white-muted); margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

    .it-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 8px 10px; background: var(--black-elevated); border-radius: 6px; }
    .it-meta-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--white-muted); margin-bottom: 1px; }
    .it-meta-value { display: block; font-size: 12px; font-weight: 500; color: var(--gold); }

    .it-enquire { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; font-weight: 500; color: var(--gold); text-decoration: none; transition: all 0.3s; }
    .it-enquire:hover { gap: 10px; color: var(--gold-light); }

    .it-stats-panel { width: 280px; flex-shrink: 0; background: var(--black-card); border: 1px solid var(--black-border); border-radius: 10px; padding: 24px; position: sticky; top: 100px; }
    .it-stats-title { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; text-align: center; }
    .it-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--black-border); border: 1px solid var(--black-border); border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
    .it-stat { background: var(--black-elevated); padding: 14px 12px; text-align: center; }
    .it-stat-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--white-muted); margin-bottom: 4px; }
    .it-stat-value { display: block; font-size: 16px; font-weight: 600; color: var(--white); }
    .it-stat-value.gold { color: var(--gold); }
    .it-stats-footer { font-size: 11px; color: var(--white-muted); text-align: center; line-height: 1.5; }

    @media (max-width: 1024px) {
      .it-directory-layout { flex-direction: column; }
      .it-grid { grid-template-columns: repeat(2, 1fr); }
      .it-stats-panel { width: 100%; position: static; }
      .it-stats-grid { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 768px) {
      .it-grid { grid-template-columns: 1fr; }
      .it-stats-grid { grid-template-columns: 1fr 1fr; }
      .it-filters { gap: 6px; }
      .it-filter { padding: 6px 14px; font-size: 12px; }
    }


    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 32px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }
    .tech-pill {
      padding: 8px 20px;
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 400;
      color: var(--white-dim);
      transition: all 0.3s;
    }
    .tech-pill:hover {
      border-color: var(--gold);
      color: var(--gold);
      background: rgba(201, 168, 76, 0.06);
    }
  ` }} />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{backgroundImage: "url('/Images/IT.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">$3.2B+ IT Export Economy &middot; 20%+ Annual Growth</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Technology<br />& <span className="text-primary">IT.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Pakistan is one of the fastest-growing technology markets in the world. CZAAH connects international firms with government digital programmes, elite engineering talent, and a cost structure 60&ndash;70% below Western equivalents.</p>
            <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore Partnerships &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  IT SERVICES DIRECTORY  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in" id="it-directory">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">IT services <span className="text-primary">directory.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-2">Explore Pakistan's IT capabilities — from software engineering and call centers to AI, cybersecurity, and cloud infrastructure. Vetted providers, proven delivery.</p>

            <div className="it-filters">
              <button className="it-filter active" data-filter="all" onClick={() => { filterIT(this) }}>All Services</button>
              <button className="it-filter" data-filter="software" onClick={() => { filterIT(this) }}>Software Dev</button>
              <button className="it-filter" data-filter="callcenter" onClick={() => { filterIT(this) }}>Call Centers</button>
              <button className="it-filter" data-filter="cloud" onClick={() => { filterIT(this) }}>Cloud & Infra</button>
              <button className="it-filter" data-filter="ai" onClick={() => { filterIT(this) }}>AI & Data</button>
              <button className="it-filter" data-filter="cyber" onClick={() => { filterIT(this) }}>Cybersecurity</button>
              <button className="it-filter" data-filter="govtech" onClick={() => { filterIT(this) }}>Gov Tech</button>
              <div className="it-search-wrap">
                <svg className="it-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" className="it-search-input" id="itSearchInput" placeholder="Search services, technologies..." onInput={(e) => { searchIT(e.target.value) }} />
              </div>
            </div>

            <div className="it-directory-layout">
            <div className="it-grid-wrapper">
            <div className="it-no-results" id="itNoResults">No services match your search.</div>
            <div className="it-grid" id="itTrack">

              {/*  SOFTWARE DEV  */}
              <div className="it-card" data-category="software" data-keywords="web app react angular node python django fullstack frontend backend saas platform">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Software Dev</span><span className="it-tag loc">Lahore · Karachi</span></div>
                  <h3>Full-Stack Web Development</h3>
                  <p>React, Angular, Vue frontends with Node.js, Python, and .NET backends. SaaS platforms, enterprise web apps, and e-commerce — from MVP to scale.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">5–50 engineers</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">60–70%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="software" data-keywords="mobile app ios android flutter react native kotlin swift cross platform startup">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Software Dev</span><span className="it-tag loc">Islamabad · Lahore</span></div>
                  <h3>Mobile App Development</h3>
                  <p>Native iOS/Android and cross-platform (Flutter, React Native) mobile applications. Fintech, healthtech, logistics, and consumer apps with end-to-end delivery.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">3–25 engineers</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">60–65%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="software" data-keywords="qa testing automation selenium cypress jest manual quality assurance regression performance">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Software Dev</span><span className="it-tag loc">All Major Cities</span></div>
                  <h3>QA & Test Automation</h3>
                  <p>Manual and automated testing — Selenium, Cypress, Jest, Appium. Performance testing, security testing, and CI/CD pipeline integration for enterprise release cycles.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">2–30 testers</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">65–75%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              {/*  CALL CENTERS  */}
              <div className="it-card" data-category="callcenter" data-keywords="inbound customer support phone email chat helpline service desk agents 24/7">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Call Center</span><span className="it-tag loc">Karachi · Lahore</span></div>
                  <h3>Inbound Customer Support</h3>
                  <p>24/7 multilingual customer service — phone, email, live chat, and social media. US/UK-trained agents with neutral accents, CRM-integrated operations, and real-time QA.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Capacity</span><span className="it-meta-value">50–500 seats</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">55–65%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="callcenter" data-keywords="outbound sales telemarketing lead generation appointment setting b2b cold calling revenue">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Call Center</span><span className="it-tag loc">Islamabad · Lahore</span></div>
                  <h3>Outbound Sales & Telemarketing</h3>
                  <p>B2B/B2C lead generation, appointment setting, market surveys, and outbound sales campaigns. Performance-based models with live reporting dashboards and call recording.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Capacity</span><span className="it-meta-value">20–300 agents</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">50–60%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="callcenter" data-keywords="technical support helpdesk L1 L2 L3 ITIL SaaS troubleshooting tier escalation">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Call Center</span><span className="it-tag loc">Karachi · Islamabad</span></div>
                  <h3>Technical Help Desk</h3>
                  <p>L1/L2/L3 technical support for SaaS, IT infrastructure, and hardware. ITIL-aligned processes, ticket management, SLA compliance, and 24/7 coverage.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Capacity</span><span className="it-meta-value">10–200 agents</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">60–70%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="callcenter" data-keywords="back office data entry document processing claims medical billing accounting bpo">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Call Center</span><span className="it-tag loc">All Major Cities</span></div>
                  <h3>Back-Office Processing</h3>
                  <p>Data entry, document digitisation, claims processing, medical billing, bookkeeping, and payroll. High-volume operations with 99.5%+ accuracy rates.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Capacity</span><span className="it-meta-value">20–500 staff</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">55–65%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              {/*  CLOUD & INFRA  */}
              <div className="it-card" data-category="cloud" data-keywords="aws azure gcp cloud migration devops infrastructure kubernetes docker terraform">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Cloud</span><span className="it-tag loc">Islamabad · Lahore</span></div>
                  <h3>Cloud Migration & DevOps</h3>
                  <p>AWS, Azure, and GCP migration, Kubernetes orchestration, CI/CD pipelines, and infrastructure-as-code. Certified cloud architects managing enterprise workloads.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">3–20 engineers</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">55–65%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="cloud" data-keywords="managed services NOC monitoring server network administration uptime sla hosting">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Cloud</span><span className="it-tag loc">Karachi</span></div>
                  <h3>Managed IT Services</h3>
                  <p>24/7 NOC monitoring, server administration, network management, and incident response. SLA-backed managed services for businesses that need always-on infrastructure.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">5–30 staff</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">50–60%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              {/*  AI & DATA  */}
              <div className="it-card" data-category="ai" data-keywords="machine learning artificial intelligence nlp computer vision deep learning tensorflow pytorch llm">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">AI & Data</span><span className="it-tag loc">Lahore · Islamabad</span></div>
                  <h3>AI & Machine Learning</h3>
                  <p>Custom ML models, NLP, computer vision, recommendation engines, and LLM integration. Pakistan's top AI talent from LUMS, NUST, and FAST — at globally competitive rates.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">2–15 specialists</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">60–70%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="ai" data-keywords="data analytics business intelligence bi tableau powerbi etl warehouse reporting dashboard">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">AI & Data</span><span className="it-tag loc">All Major Cities</span></div>
                  <h3>Data Analytics & BI</h3>
                  <p>Data warehousing, ETL pipelines, BI dashboards (Tableau, Power BI), and predictive analytics. Turn raw data into actionable business intelligence at scale.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">3–20 analysts</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">60–65%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              {/*  CYBERSECURITY  */}
              <div className="it-card" data-category="cyber" data-keywords="security penetration testing soc vulnerability assessment audit compliance iso 27001 gdpr">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Cybersecurity</span><span className="it-tag loc">Islamabad</span></div>
                  <h3>Security Operations & Pen Testing</h3>
                  <p>SOC-as-a-service, penetration testing, vulnerability assessments, and compliance audits (ISO 27001, GDPR, PCI-DSS). Certified security professionals protecting your assets.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Team Size</span><span className="it-meta-value">3–15 specialists</span></div>
                    <div><span className="it-meta-label">Cost Saving</span><span className="it-meta-value">55–65%</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              {/*  GOV TECH  */}
              <div className="it-card" data-category="govtech" data-keywords="e-governance digital government nadra fbr pitb portal citizen services smart city public sector">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Gov Tech</span><span className="it-tag loc">Islamabad · Lahore</span></div>
                  <h3>E-Governance Platforms</h3>
                  <p>Citizen service portals, land record digitisation, tax administration systems, and smart-city infrastructure. We partner international vendors with government bodies for large-scale deployments.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Contracts</span><span className="it-meta-value">Federal + Provincial</span></div>
                    <div><span className="it-meta-label">Partners</span><span className="it-meta-value">PITB, NADRA, FBR</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

              <div className="it-card" data-category="govtech" data-keywords="erp sap oracle enterprise resource planning government ministry department digital transformation">
                <div className="it-card-body">
                  <div className="it-tags"><span className="it-tag">Gov Tech</span><span className="it-tag loc">All Provinces</span></div>
                  <h3>Enterprise ERP Implementation</h3>
                  <p>SAP, Oracle, and Microsoft Dynamics deployments for government ministries, state enterprises, and large private-sector organisations. Full lifecycle — planning, migration, training, support.</p>
                  <div className="it-meta">
                    <div><span className="it-meta-label">Contracts</span><span className="it-meta-value">Public + Private</span></div>
                    <div><span className="it-meta-label">Partners</span><span className="it-meta-value">SAP, Oracle, MS</span></div>
                  </div>
                  <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="it-enquire">Enquire &rarr;</a>
                </div>
              </div>

            </div>{/*  /grid  */}
            </div>{/*  /grid-wrapper  */}

            {/*  Stats Panel  */}
            <div className="it-stats-panel">
              <div className="it-stats-title">Pakistan IT Sector</div>
              <div className="it-stats-grid">
                <div className="it-stat"><span className="it-stat-label">IT Exports</span><span className="it-stat-value">$3.2B+</span></div>
                <div className="it-stat"><span className="it-stat-label">Growth Rate</span><span className="it-stat-value">20%+ YoY</span></div>
                <div className="it-stat"><span className="it-stat-label">IT Workers</span><span className="it-stat-value">500K+</span></div>
                <div className="it-stat"><span className="it-stat-label">Graduates/Year</span><span className="it-stat-value">50K+</span></div>
                <div className="it-stat"><span className="it-stat-label">Freelancers</span><span className="it-stat-value">Top 4 Global</span></div>
                <div className="it-stat"><span className="it-stat-label">Call Centers</span><span className="it-stat-value">400+</span></div>
                <div className="it-stat"><span className="it-stat-label">BPO Workers</span><span className="it-stat-value">100K+</span></div>
                <div className="it-stat"><span className="it-stat-label">Cost Saving</span><span className="it-stat-value gold">60–70%</span></div>
              </div>
              <div className="it-stats-footer">Tech Hubs: Islamabad · Lahore · Karachi · Peshawar</div>
            </div>

            </div>{/*  /directory-layout  */}
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  TECHNOLOGY STACK  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Technology <span className="text-primary">stack.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mx-auto mb-2">Our talent pool delivers across the full modern technology landscape.</p>

            <div className="tech-stack stagger">
              <div className="tech-pill">React</div>
              <div className="tech-pill">Angular</div>
              <div className="tech-pill">Vue.js</div>
              <div className="tech-pill">Node.js</div>
              <div className="tech-pill">Python</div>
              <div className="tech-pill">Django</div>
              <div className="tech-pill">.NET</div>
              <div className="tech-pill">Java</div>
              <div className="tech-pill">Go</div>
              <div className="tech-pill">Flutter</div>
              <div className="tech-pill">React Native</div>
              <div className="tech-pill">Swift</div>
              <div className="tech-pill">Kotlin</div>
              <div className="tech-pill">AWS</div>
              <div className="tech-pill">Azure</div>
              <div className="tech-pill">GCP</div>
              <div className="tech-pill">Kubernetes</div>
              <div className="tech-pill">Docker</div>
              <div className="tech-pill">Terraform</div>
              <div className="tech-pill">TensorFlow</div>
              <div className="tech-pill">PyTorch</div>
              <div className="tech-pill">PostgreSQL</div>
              <div className="tech-pill">MongoDB</div>
              <div className="tech-pill">Redis</div>
              <div className="tech-pill">Salesforce</div>
              <div className="tech-pill">SAP</div>
              <div className="tech-pill">Oracle</div>
              <div className="tech-pill">Tableau</div>
              <div className="tech-pill">Power BI</div>
              <div className="tech-pill">Zendesk</div>
              <div className="tech-pill">HubSpot</div>
              <div className="tech-pill">Twilio</div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  GOVERNMENT IT PARTNERSHIP  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in-left">
          <div className="max-w-[1600px] mx-auto">
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Government IT Partnership</div>
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Enter Pakistan's public-sector <span className="text-primary">digital market.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Pakistan's Digital Pakistan initiative is driving billions in government IT modernisation. International technology companies need a trusted in-country partner to navigate procurement, compliance, and delivery. CZAAH is that partner.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">gavel</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Procurement Navigation</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">We guide international vendors through Pakistan's public-sector procurement frameworks, from pre-qualification to contract award, ensuring full regulatory compliance at every stage.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">engineering</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">In-Country Delivery</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Our on-the-ground teams manage local implementation, staffing, and stakeholder coordination so your technology reaches deployment without delays or missteps.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">domain</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Sector Coverage</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">E-governance platforms, national identity systems, provincial digital services, tax administration modernisation, health-tech, and smart-city infrastructure.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  MARKET ENTRY  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-right">
          <div className="max-w-[1600px] mx-auto">
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Market Entry Advisory</div>
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Your launchpad into <span className="text-primary">South Asia's tech frontier.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Pakistan offers Special Technology Zones with generous tax incentives, a young and digitally native population, and a government actively courting foreign technology investment. CZAAH provides the strategic advisory to navigate your market entry.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">policy</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Regulatory & Licensing</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Entity formation, technology zone registration, tax structuring, and intellectual property protection tailored to Pakistan's evolving digital economy regulations.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">hub</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Stakeholder Mapping</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">We connect you with the right government bodies, institutional buyers, and private-sector partners across Karachi, Lahore, and Islamabad.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">rocket_launch</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Go-to-Market Strategy</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Market sizing, competitive landscape analysis, pricing strategy, and a phased entry roadmap built on real on-the-ground intelligence.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  TALENT  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Talent Solutions</div>
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">World-class engineering.<br /><span className="text-primary">Globally competitive rates.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Pakistan produces over 50,000 IT graduates every year and ranks among the top freelancing nations globally. CZAAH gives you structured access to this deep talent pool — vetted, managed, and scaled to your requirements.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">groups</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Dedicated Development Teams</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Full-stack engineers, QA specialists, DevOps professionals, and UI/UX designers assembled into dedicated teams that integrate directly with your workflows.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">savings</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">60&ndash;70% Cost Advantage</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Comparable quality to Western engineering at a fraction of the cost. Transparent pricing, no hidden fees, and flexible engagement models from project-based to long-term retention.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">trending_up</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Scale On Demand</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">From a focused five-person squad to a 100+ engineer programme, we scale your team up or down based on project demands — with no recruitment lag.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  STATS  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">Pakistan's tech economy <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">$3.2B+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Annual IT exports and growing</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">500K+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">IT professionals nationwide</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">50K+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">IT graduates every year</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">20%+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Year-over-year export growth</div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  DIGITAL TRANSFORMATION  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">Digital transformation <span className="text-primary">consulting.</span></h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">account_balance</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Government Digitisation</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Pakistan's provinces are rapidly digitising public services — from land records to healthcare delivery. We help technology firms position their platforms for these large-scale transformation programmes.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">cloud_sync</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Enterprise Modernisation</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Cloud migration, ERP implementation, and legacy system overhauls for Pakistan's banking, telecom, and manufacturing sectors — delivered through our network of certified engineering teams.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">fingerprint</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Identity & Data Systems</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Pakistan operates one of the world's largest biometric identity databases. We advise firms entering the national data infrastructure, cybersecurity, and digital identity space.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">location_city</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Special Technology Zones</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Pakistan's STZs offer tax holidays, customs duty exemptions, and streamlined regulations for technology companies. We manage the full application and setup process on your behalf.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-6">Enter Pakistan's digital <span className="text-primary">economy.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto mb-10">Government IT partnerships, elite engineering talent, and a cost structure built for global competitiveness.</p>
            <a href="/contact?interest=Technology%20%26%20IT#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore the Sector &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
