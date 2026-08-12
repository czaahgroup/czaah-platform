'use client';
// @ts-nocheck

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function PharmaceuticalsPage() {
  useEffect(() => {
    // Intersection Observer for fade-in sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    /* Product Catalog Tab Switching */
        (function() {
          const tabs = document.querySelectorAll('.ph-tab-btn');
          const panels = document.querySelectorAll('.ph-panel');
          tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
              var target = this.getAttribute('data-ph-tab');
              tabs.forEach(function(t) { t.classList.remove('ph-active'); });
              this.classList.add('ph-active');
              panels.forEach(function(p) { p.classList.remove('ph-panel-active'); });
              var activePanel = document.querySelector('[data-ph-panel="' + target + '"]');
              if (activePanel) activePanel.classList.add('ph-panel-active');
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
    .ph-catalog { display: flex; gap: 0; min-height: 520px; }
    .ph-tabs { display: flex; flex-direction: column; min-width: 220px; max-width: 220px; border-right: 1px solid var(--black-border); }
    .ph-tab-btn {
      display: flex; align-items: center; gap: 12px; padding: 18px 20px;
      background: transparent; border: none; border-left: 3px solid transparent;
      color: var(--white-dim); font-family: 'Raleway', sans-serif; font-size: 0.9rem;
      cursor: pointer; text-align: left; transition: all 0.3s var(--ease-smooth);
    }
    .ph-tab-btn:hover { color: var(--white-muted); background: var(--black-elevated); }
    .ph-tab-btn.ph-active {
      border-left-color: var(--gold); color: var(--gold);
      background: var(--black-elevated);
    }
    .ph-tab-icon { font-size: 1.2rem; width: 24px; text-align: center; flex-shrink: 0; }
    .ph-tab-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ph-panels { flex: 1; position: relative; overflow: hidden; }
    .ph-panel {
      position: absolute; inset: 0; padding: 32px 40px;
      opacity: 0; visibility: hidden;
      transition: opacity 0.4s var(--ease-smooth), transform 0.4s var(--ease-smooth);
      transform: translateY(12px);
      overflow-y: auto;
    }
    .ph-panel.ph-panel-active {
      opacity: 1; visibility: visible; transform: translateY(0);
    }
    .ph-panel-title { font-family: 'Cinzel', serif; font-size: 1.6rem; color: var(--white); margin-bottom: 6px; }
    .ph-panel-desc { color: var(--white-muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 24px; }
    .ph-stats-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px;
    }
    .ph-stat-card {
      background: var(--black-card); border: 1px solid var(--black-border);
      padding: 16px 18px; text-align: center;
    }
    .ph-stat-value { font-family: 'Cinzel', serif; font-size: 1.3rem; color: var(--gold); margin-bottom: 4px; }
    .ph-stat-label { font-size: 0.78rem; color: var(--white-dim); text-transform: uppercase; letter-spacing: 0.05em; }
    .ph-detail-row { display: flex; gap: 32px; margin-bottom: 20px; flex-wrap: wrap; }
    .ph-detail-block { flex: 1; min-width: 180px; }
    .ph-detail-block h5 {
      font-family: 'Raleway', sans-serif; font-size: 0.75rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em; color: var(--gold-dim);
      margin-bottom: 8px;
    }
    .ph-detail-block ul { list-style: none; padding: 0; margin: 0; }
    .ph-detail-block li {
      color: var(--white-muted); font-size: 0.88rem; padding: 3px 0;
      position: relative; padding-left: 14px;
    }
    .ph-detail-block li::before { content: '\u203A'; position: absolute; left: 0; color: var(--gold); }
    .ph-enquire {
      display: inline-block; margin-top: 8px; color: var(--gold); font-size: 0.9rem;
      font-weight: 500; text-decoration: none; transition: opacity 0.2s;
    }
    .ph-enquire:hover { opacity: 0.75; }

    /* Responsive: tabs become horizontal on mobile */
    @media (max-width: 768px) {
      .ph-catalog { flex-direction: column; min-height: auto; }
      .ph-tabs {
        flex-direction: row; max-width: none; min-width: 0;
        overflow-x: auto; border-right: none; border-bottom: 1px solid var(--black-border);
        -webkit-overflow-scrolling: touch; scrollbar-width: none;
      }
      .ph-tabs::-webkit-scrollbar { display: none; }
      .ph-tab-btn {
        border-left: none; border-bottom: 3px solid transparent;
        padding: 14px 18px; white-space: nowrap; flex-shrink: 0;
      }
      .ph-tab-btn.ph-active { border-left-color: transparent; border-bottom-color: var(--gold); }
      .ph-panels { position: relative; min-height: 480px; }
      .ph-panel { padding: 24px 16px; }
      .ph-stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* COMPLIANCE MATRIX */
    .ph-matrix-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
    .ph-matrix {
      width: 100%; border-collapse: separate; border-spacing: 0;
      min-width: 640px;
    }
    .ph-matrix thead th {
      font-family: 'Raleway', sans-serif; font-size: 0.72rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold-dim);
      padding: 14px 20px; text-align: left; border-bottom: 1px solid var(--black-border);
    }
    .ph-matrix tbody tr { transition: background 0.2s; }
    .ph-matrix tbody tr:nth-child(odd) { background: var(--black-card); }
    .ph-matrix tbody tr:nth-child(even) { background: var(--black-elevated); }
    .ph-matrix tbody tr:hover { background: rgba(201,168,76,0.06); }
    .ph-matrix td {
      padding: 16px 20px; font-size: 0.9rem; color: var(--white-muted);
      border-bottom: 1px solid var(--black-border);
    }
    .ph-matrix td:first-child { color: var(--white); font-weight: 500; }
    .ph-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; font-size: 0.78rem; font-weight: 500;
    }
    .ph-badge-active { background: rgba(34,197,94,0.12); color: #22c55e; }
    .ph-badge-progress { background: rgba(201,168,76,0.15); color: var(--gold); }
    .ph-badge-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .ph-badge-active .ph-badge-dot { background: #22c55e; }
    .ph-badge-progress .ph-badge-dot { background: var(--gold); }
  ` }} />

      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{backgroundImage: "url('/Images/Pharma.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Pharmaceutical Manufacturing &amp; Healthcare</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6"><span className="text-primary">Pharmaceuticals.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">A $4 billion market growing at 12% annually, with 800+ licensed manufacturers and rising export demand. CZAAH facilitates market entry, manufacturing partnerships, and regulatory navigation for international pharmaceutical investors.</p>
            <a href="/contact?interest=Pharmaceuticals#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore Partnerships &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  PRODUCT CATALOG — VERTICAL TABBED INTERFACE  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Product <span className="text-primary">catalog.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Pakistan's pharmaceutical manufacturing covers a comprehensive range of products — from high-volume generics to precision surgical instruments.</p>

            <div className="ph-catalog" style={{background: 'var(--black-card)', border: '1px solid var(--black-border)', overflow: 'hidden', marginTop: '32px'}}>
              {/*  Tabs  */}
              <div className="ph-tabs">
                <button className="ph-tab-btn ph-active" data-ph-tab="generics"><span className="ph-tab-icon">&#128138;</span><span className="ph-tab-label">Generic Medicines</span></button>
                <button className="ph-tab-btn" data-ph-tab="apis"><span className="ph-tab-icon">&#9879;</span><span className="ph-tab-label">APIs</span></button>
                <button className="ph-tab-btn" data-ph-tab="surgical"><span className="ph-tab-icon">&#9986;</span><span className="ph-tab-label">Surgical &amp; Devices</span></button>
                <button className="ph-tab-btn" data-ph-tab="nutra"><span className="ph-tab-icon">&#127807;</span><span className="ph-tab-label">Nutraceuticals</span></button>
                <button className="ph-tab-btn" data-ph-tab="halal"><span className="ph-tab-icon">&#9774;</span><span className="ph-tab-label">Halal Pharma</span></button>
                <button className="ph-tab-btn" data-ph-tab="vaccines"><span className="ph-tab-icon">&#129657;</span><span className="ph-tab-label">Vaccines &amp; Biologics</span></button>
                <button className="ph-tab-btn" data-ph-tab="contract"><span className="ph-tab-icon">&#9874;</span><span className="ph-tab-label">Contract Mfg</span></button>
              </div>

              {/*  Panels  */}
              <div className="ph-panels">

                {/*  Generic Medicines  */}
                <div className="ph-panel ph-panel-active" data-ph-panel="generics">
                  <div className="ph-panel-title">Generic Medicines</div>
                  <p className="ph-panel-desc">Pakistan supplies affordable, WHO GMP-certified generic medicines to over 80 countries, offering up to 70% cost savings versus branded equivalents.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">800+</div><div className="ph-stat-label">Manufacturers</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">$500M+</div><div className="ph-stat-label">Annual Exports</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">70%</div><div className="ph-stat-label">Cost Saving vs Branded</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Cardiovascular</li><li>Anti-infectives</li><li>CNS</li><li>Gastrointestinal</li><li>Respiratory</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>WHO GMP</li><li>ISO 9001</li><li>ICH Guidelines</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>Africa</li><li>Central Asia</li><li>Gulf</li><li>Southeast Asia</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

                {/*  APIs  */}
                <div className="ph-panel" data-ph-panel="apis">
                  <div className="ph-panel-title">Active Pharmaceutical Ingredients</div>
                  <p className="ph-panel-desc">Pakistan has a growing API manufacturing base producing over 200 molecules, supporting both domestic formulation and international supply chains.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">50+</div><div className="ph-stat-label">API Plants</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">200+</div><div className="ph-stat-label">Molecules</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">$150M+</div><div className="ph-stat-label">Annual Exports</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Paracetamol</li><li>Metformin</li><li>Amoxicillin</li><li>Omeprazole</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>WHO GMP</li><li>EU GMP (select)</li><li>FDA Registered (select)</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>EU</li><li>USA</li><li>Gulf</li><li>Africa</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

                {/*  Surgical & Medical Devices  */}
                <div className="ph-panel" data-ph-panel="surgical">
                  <div className="ph-panel-title">Surgical &amp; Medical Devices</div>
                  <p className="ph-panel-desc">Pakistan is a globally significant exporter of surgical instruments, anchored by the renowned Sialkot manufacturing cluster with over 2,500 manufacturers.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">2,500+</div><div className="ph-stat-label">Manufacturers</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">$450M+</div><div className="ph-stat-label">Annual Exports</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">Sialkot</div><div className="ph-stat-label">Global Cluster</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Surgical forceps</li><li>Scissors &amp; retractors</li><li>Dental instruments</li><li>Orthopedic implants</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>CE Mark</li><li>FDA 510(k)</li><li>ISO 13485</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>USA</li><li>EU</li><li>Japan</li><li>Gulf</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

                {/*  Nutraceuticals  */}
                <div className="ph-panel" data-ph-panel="nutra">
                  <div className="ph-panel-title">Nutraceuticals &amp; Supplements</div>
                  <p className="ph-panel-desc">A fast-growing segment fuelled by rising health consciousness, Pakistan's herbal traditions, and strong demand from diaspora communities worldwide.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">$200M+</div><div className="ph-stat-label">Market Size</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">25%</div><div className="ph-stat-label">Growth YoY</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">Herbal</div><div className="ph-stat-label">Tradition-Based</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Herbal supplements</li><li>Vitamins</li><li>Protein powders</li><li>Dietary supplements</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>ISO 22000</li><li>GMP</li><li>Halal</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>Gulf</li><li>UK</li><li>USA diaspora</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

                {/*  Halal Pharma  */}
                <div className="ph-panel" data-ph-panel="halal">
                  <div className="ph-panel-title">Halal Pharmaceuticals</div>
                  <p className="ph-panel-desc">Uniquely positioned to serve the $3 trillion global halal economy and 1.8 billion Muslim consumers with certified halal medicines and formulations.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">$3T</div><div className="ph-stat-label">Global Halal Economy</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">1.8B</div><div className="ph-stat-label">Muslim Consumers</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">First</div><div className="ph-stat-label">Mover Advantage</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Gelatin-free capsules</li><li>Halal-certified syrups</li><li>Plant-based coatings</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>Halal (SANHA, JAKIM)</li><li>WHO GMP</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>Gulf</li><li>Malaysia</li><li>Indonesia</li><li>Turkey</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

                {/*  Vaccines & Biologics  */}
                <div className="ph-panel" data-ph-panel="vaccines">
                  <div className="ph-panel-title">Vaccines &amp; Biologics</div>
                  <p className="ph-panel-desc">An emerging segment backed by government investment, COVID-era capacity expansion, and planned biotech parks positioned for regional supply.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">NIH</div><div className="ph-stat-label">Islamabad Hub</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">3</div><div className="ph-stat-label">Biotech Parks Planned</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">COVID</div><div className="ph-stat-label">Capacity Built</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Vaccine fill-finish</li><li>Biosimilars</li><li>Sera</li><li>Blood products</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>WHO PQ (in progress)</li><li>GMP</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>Domestic</li><li>GAVI</li><li>African Union</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

                {/*  Contract Manufacturing  */}
                <div className="ph-panel" data-ph-panel="contract">
                  <div className="ph-panel-title">Contract Manufacturing</div>
                  <p className="ph-panel-desc">OEM and ODM manufacturing for international pharmaceutical brands, leveraging spare capacity, competitive pricing, and an English-speaking workforce.</p>
                  <div className="ph-stats-grid">
                    <div className="ph-stat-card"><div className="ph-stat-value">30%+</div><div className="ph-stat-label">Spare Capacity</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">Low</div><div className="ph-stat-label">Competitive Pricing</div></div>
                    <div className="ph-stat-card"><div className="ph-stat-value">English</div><div className="ph-stat-label">Speaking Workforce</div></div>
                  </div>
                  <div className="ph-detail-row">
                    <div className="ph-detail-block">
                      <h5>Key Products</h5>
                      <ul><li>Tablets &amp; capsules</li><li>Syrups</li><li>Injectables</li><li>Ointments</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Certifications</h5>
                      <ul><li>WHO GMP</li><li>EU GMP (select)</li><li>ISO 9001</li></ul>
                    </div>
                    <div className="ph-detail-block">
                      <h5>Export Markets</h5>
                      <ul><li>Brand-owner directed</li></ul>
                    </div>
                  </div>
                  <a href="/contact" className="ph-enquire">Enquire &rarr;</a>
                </div>

              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  REGULATORY & COMPLIANCE MATRIX  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Regulatory &amp; <span className="text-primary">compliance.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Pakistan's pharmaceutical regulatory framework aligned with international standards across manufacturing, quality, and product certification.</p>

            <div className="ph-matrix-wrap" style={{marginTop: '32px', border: '1px solid var(--black-border)'}}>
              <table className="ph-matrix">
                <thead>
                  <tr>
                    <th>Certification</th>
                    <th>Governing Body</th>
                    <th>Status</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>WHO GMP</td>
                    <td>DRAP</td>
                    <td><span className="ph-badge ph-badge-active"><span className="ph-badge-dot"></span>Active</span></td>
                    <td>400+ certified facilities</td>
                  </tr>
                  <tr>
                    <td>ISO 9001:2015</td>
                    <td>PSQCA</td>
                    <td><span className="ph-badge ph-badge-active"><span className="ph-badge-dot"></span>Active</span></td>
                    <td>Standard for all manufacturers</td>
                  </tr>
                  <tr>
                    <td>EU GMP</td>
                    <td>EMA via DRAP</td>
                    <td><span className="ph-badge ph-badge-progress"><span className="ph-badge-dot"></span>In Progress</span></td>
                    <td>15+ facilities certified</td>
                  </tr>
                  <tr>
                    <td>US FDA Registration</td>
                    <td>FDA</td>
                    <td><span className="ph-badge ph-badge-active"><span className="ph-badge-dot"></span>Active</span></td>
                    <td>25+ registered facilities</td>
                  </tr>
                  <tr>
                    <td>CE Marking</td>
                    <td>EU Notified Bodies</td>
                    <td><span className="ph-badge ph-badge-active"><span className="ph-badge-dot"></span>Active</span></td>
                    <td>Surgical instruments (Sialkot)</td>
                  </tr>
                  <tr>
                    <td>ISO 13485</td>
                    <td>Medical Devices</td>
                    <td><span className="ph-badge ph-badge-active"><span className="ph-badge-dot"></span>Active</span></td>
                    <td>500+ manufacturers</td>
                  </tr>
                  <tr>
                    <td>Halal Certification</td>
                    <td>SANHA / JAKIM</td>
                    <td><span className="ph-badge ph-badge-active"><span className="ph-badge-dot"></span>Active</span></td>
                    <td>Growing adoption</td>
                  </tr>
                  <tr>
                    <td>WHO Prequalification</td>
                    <td>WHO</td>
                    <td><span className="ph-badge ph-badge-progress"><span className="ph-badge-dot"></span>In Progress</span></td>
                    <td>Vaccines &amp; APIs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SERVICES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Pharmaceutical market entry and partnership facilitation across Pakistan's growing healthcare sector.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {[
                { icon: 'trending_up', title: 'Market Entry Advisory', desc: 'Sector analysis, regulatory landscape mapping, and strategic guidance for pharmaceutical companies evaluating Pakistan.' },
                { icon: 'precision_manufacturing', title: 'Manufacturing Partnerships', desc: 'Connection with licensed Pakistani manufacturers for contract manufacturing, toll manufacturing, and joint venture production facilities.' },
                { icon: 'verified', title: 'Regulatory Navigation', desc: 'DRAP (Drug Regulatory Authority of Pakistan) registration, product licensing, GMP compliance, and import/export permits.' },
                { icon: 'local_shipping', title: 'Supply Chain Development', desc: "Distribution network access, cold chain logistics, and hospital/pharmacy channel partnerships across Pakistan's 230M+ consumer market." },
                { icon: 'science', title: 'API & Raw Materials', desc: "Access to Pakistan's growing Active Pharmaceutical Ingredient production capabilities and raw material sourcing networks." },
                { icon: 'public', title: 'Export Facilitation', desc: 'International registration support and connection with buyers in Gulf, African, and Central Asian markets through our international trading network.' },
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

        {/*  STATS  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-4xl text-on-surface mb-10">Pakistan's pharmaceutical sector <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              {[
                { number: '$4B+', label: 'Pharmaceutical market size' },
                { number: '800+', label: 'Licensed manufacturers' },
                { number: '12%', label: 'Annual market growth' },
                { number: '230M+', label: 'Domestic consumer base' },
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

        {/*  INVESTMENT OPPORTUNITIES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Investment <span className="text-primary">opportunities.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">High-growth segments within Pakistan's pharmaceutical and healthcare landscape.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              {[
                { icon: 'medication', title: 'Generic Manufacturing', desc: "Pakistan's generic drug market is rapidly expanding. Growing domestic demand and export opportunities to underserved markets create strong investment cases." },
                { icon: 'local_hospital', title: 'Healthcare Infrastructure', desc: 'Hospitals, diagnostic centres, and medical supply chains are severely underdeveloped relative to population. Private investment is being actively encouraged.' },
                { icon: 'spa', title: 'Halal Pharmaceuticals', desc: 'Growing global demand for halal-certified medicines positions Pakistan as a natural manufacturing hub for Gulf and Southeast Asian markets.' },
                { icon: 'biotech', title: 'Biotech & Innovation', desc: 'Government incentives for biotechnology research and pharmaceutical R&D are creating opportunities for technology-forward investors.' },
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

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-4xl text-on-surface mb-4">A $4 billion market, <span className="text-primary">growing.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-2xl mx-auto">Market entry, manufacturing partnerships, and regulatory navigation for pharmaceutical and healthcare investors.</p>
            <a href="/contact?interest=Pharmaceuticals#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Market Entry &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
