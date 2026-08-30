'use client';
// @ts-nocheck

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function TextilesPage() {
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



      // Textile Directory — Grid Filter + Search
      (function() {
        const grid = document.querySelector('.tx-masonry-grid');
        const cards = [...grid.querySelectorAll('.textile-card')];
        const noResults = document.getElementById('textileNoResults');
        const countEl = document.querySelector('#txResultsCount span');
        let activeFilter = 'all';
        let searchQuery = '';

        function updateGrid() {
          const q = searchQuery.toLowerCase().trim();
          let visible = 0;
          cards.forEach(card => {
            const catMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
            let searchMatch = true;
            if (q) {
              const text = (card.dataset.keywords || '') + ' ' +
                           (card.dataset.category || '') + ' ' +
                           (card.dataset.region || '') + ' ' +
                           (card.dataset.cert || '') + ' ' +
                           (card.querySelector('h3')?.textContent || '') + ' ' +
                           (card.querySelector('.textile-card-body p')?.textContent || '');
              searchMatch = text.toLowerCase().includes(q);
            }
            if (catMatch && searchMatch) {
              card.classList.remove('hidden');
              visible++;
            } else {
              card.classList.add('hidden');
            }
          });
          if (countEl) countEl.textContent = visible;
          if (noResults) noResults.classList.toggle('show', visible === 0);
        }

        function filterTextiles(btn) {
          activeFilter = btn.dataset.filter;
          document.querySelectorAll('.textile-filter').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('textileSearchInput').value = '';
          searchQuery = '';
          updateGrid();
        }

        function searchTextiles(query) {
          searchQuery = query;
          if (query.trim()) {
            document.querySelectorAll('.textile-filter').forEach(b => b.classList.remove('active'));
            document.querySelector('.textile-filter[data-filter="all"]').classList.add('active');
            activeFilter = 'all';
          }
          updateGrid();
        }

        window.filterTextiles = filterTextiles;
        window.searchTextiles = searchTextiles;

        // Inject "Enquire" link into every card
        cards.forEach(card => {
          const body = card.querySelector('.textile-card-body');
          if (body && !body.querySelector('.textile-enquire')) {
            const link = document.createElement('a');
            link.href = '/contact#contact-form';
            link.className = 'textile-enquire';
            link.innerHTML = 'Enquire &rarr;';
            body.appendChild(link);
          }
        });

        // Initial count
        if (countEl) countEl.textContent = cards.length;
      })();
  }, []);

  return (
    <>
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: `
    /* ── FLOATING HERO EXPORT STATS ── */
    .v-hero-wrapper { position: relative; }
    .tx-exports-float {
      position: absolute;
      bottom: 40px;
      right: 40px;
      width: 300px;
      z-index: 10;
    }
    .tx-exchange-label {
      display: block;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 500;
      margin-bottom: 10px;
      text-align: center;
    }
    .tx-exports-panel {
      background: rgba(8, 8, 8, 0.88);
      border: 1px solid var(--black-border);
      border-radius: 14px;
      padding: 20px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }
    .tx-exports-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--black-border);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .tx-export-item {
      background: rgba(15, 15, 15, 0.9);
      padding: 12px 10px;
      text-align: center;
    }
    .tx-exp-label {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--white-muted);
      margin-bottom: 3px;
    }
    .tx-exp-value {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: var(--white);
    }
    .tx-exp-value.tx-gold { color: var(--gold); }
    .tx-exports-hubs {
      font-size: 10px;
      color: var(--white-muted);
      text-align: center;
      letter-spacing: 0.04em;
    }

    /* ── TEXTILE DIRECTORY — MASONRY GRID ── */
    .textile-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 32px;
      margin-bottom: 12px;
    }
    .textile-filter {
      padding: 8px 18px;
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 20px;
      color: var(--white-muted);
      font-family: 'Raleway', sans-serif;
      font-size: 13px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.3s;
    }
    .textile-filter:hover { border-color: var(--gold-dim); color: var(--white); }
    .textile-filter.active { background: var(--gold); border-color: var(--gold); color: var(--black); font-weight: 500; }

    .textile-search-wrap { position: relative; margin-left: auto; flex-shrink: 0; }
    .textile-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--white-muted); stroke-width: 2; fill: none; pointer-events: none; transition: stroke 0.3s; }
    .textile-search-input { padding: 8px 18px 8px 38px; background: var(--black-card); border: 1px solid var(--black-border); border-radius: 20px; color: var(--white); font-family: 'Raleway', sans-serif; font-size: 13px; width: 260px; outline: none; transition: all 0.3s; }
    .textile-search-input::placeholder { color: var(--white-muted); }
    .textile-search-input:focus { border-color: var(--gold); width: 300px; }
    .textile-search-wrap:focus-within .textile-search-icon { stroke: var(--gold); }

    .tx-results-count {
      font-size: 12px;
      color: var(--white-muted);
      margin-bottom: 24px;
      letter-spacing: 0.03em;
    }
    .tx-results-count span { color: var(--gold); font-weight: 600; }

    .textile-no-results { padding: 40px 20px; text-align: center; color: var(--white-muted); font-size: 14px; display: none; width: 100%; }
    .textile-no-results.show { display: block; }

    .tx-masonry-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .textile-card {
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 10px;
      overflow: hidden;
      transition: all 0.4s var(--ease-smooth);
      opacity: 0;
      transform: translateY(20px);
      animation: txCardReveal 0.5s var(--ease-smooth) forwards;
    }
    .textile-card:nth-child(1) { animation-delay: 0.05s; }
    .textile-card:nth-child(2) { animation-delay: 0.1s; }
    .textile-card:nth-child(3) { animation-delay: 0.15s; }
    .textile-card:nth-child(4) { animation-delay: 0.2s; }
    .textile-card:nth-child(5) { animation-delay: 0.25s; }
    .textile-card:nth-child(6) { animation-delay: 0.3s; }
    .textile-card:nth-child(7) { animation-delay: 0.35s; }
    .textile-card:nth-child(8) { animation-delay: 0.4s; }
    .textile-card:nth-child(9) { animation-delay: 0.45s; }
    .textile-card:nth-child(10) { animation-delay: 0.5s; }
    .textile-card:nth-child(11) { animation-delay: 0.55s; }
    .textile-card:nth-child(12) { animation-delay: 0.6s; }
    .textile-card:nth-child(13) { animation-delay: 0.65s; }

    @keyframes txCardReveal {
      to { opacity: 1; transform: translateY(0); }
    }

    .textile-card.hidden {
      display: none;
    }
    .textile-card:hover {
      border-color: rgba(201, 168, 76, 0.3);
      transform: translateY(-6px);
      box-shadow: 0 16px 48px rgba(201, 168, 76, 0.1);
    }
    .textile-enquire {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      font-family: 'Raleway', sans-serif;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gold);
      text-decoration: none;
      transition: all 0.3s ease;
      padding: 8px 0;
      border-top: 1px solid var(--black-border);
      width: 100%;
    }
    .textile-enquire:hover { color: var(--gold-light); letter-spacing: 0.1em; }

    .textile-card-body { padding: 18px; }
    .textile-tags { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .textile-tag { padding: 3px 10px; border-radius: 3px; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; background: var(--gold-dim); color: var(--gold); }
    .textile-tag.region { background: rgba(255, 255, 255, 0.06); color: var(--white-dim); }
    .textile-card-body h3 { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--white); }
    .textile-card-body p { font-size: 12px; line-height: 1.65; color: var(--white-muted); margin-bottom: 14px; }
    .textile-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; padding: 10px 12px; background: var(--black-elevated); border-radius: 6px; }
    .meta-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--white-muted); margin-bottom: 2px; }
    .meta-value { display: block; font-size: 13px; font-weight: 500; color: var(--gold); }
    .textile-certs { display: flex; gap: 6px; flex-wrap: wrap; }
    .cert-badge { padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; border: 1px solid rgba(201, 168, 76, 0.25); color: var(--gold-light); background: rgba(201, 168, 76, 0.06); }

    @media (max-width: 1024px) {
      .tx-masonry-grid { grid-template-columns: repeat(2, 1fr); }
      .tx-exports-float { width: 260px; right: 24px; bottom: 24px; }
    }
    @media (max-width: 768px) {
      .tx-masonry-grid { grid-template-columns: 1fr; }
      .tx-exports-float { position: static; width: 100%; margin: -20px auto 0; padding: 0 20px; box-sizing: border-box; }
      .textile-filters { gap: 6px; }
      .textile-filter { padding: 6px 14px; font-size: 12px; }
    }
  ` }} />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center v-hero-wrapper" style={{backgroundImage: "url('/Images/Textiles.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Sourcing & Trade Facilitation</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Textiles<br />& <span className="text-primary">Trade.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Pakistan is the world's 4th largest textile exporter and 4th largest cotton producer. CZAAH connects international buyers with Pakistan's vast manufacturing base — fully certified, quality-assured, and competitively priced.</p>
            <a href="/contact?interest=Textiles%20%26%20Trade#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Source With Us &rarr;</a>
          </section>
          {/*  Floating Textile Export Stats  */}
          <div className="tx-exports-float">
            <span className="tx-exchange-label">Pakistan Textile Exports</span>
            <div className="tx-exports-panel">
              <div className="tx-exports-grid">
                <div className="tx-export-item"><span className="tx-exp-label">Annual Exports</span><span className="tx-exp-value">$16.5B</span></div>
                <div className="tx-export-item"><span className="tx-exp-label">Cotton Output</span><span className="tx-exp-value">7.7M bales</span></div>
                <div className="tx-export-item"><span className="tx-exp-label">Operating Mills</span><span className="tx-exp-value">1,200+</span></div>
                <div className="tx-export-item"><span className="tx-exp-label">Spinning Units</span><span className="tx-exp-value">500+</span></div>
                <div className="tx-export-item"><span className="tx-exp-label">Workforce</span><span className="tx-exp-value">15M+</span></div>
                <div className="tx-export-item"><span className="tx-exp-label">EU Access</span><span className="tx-exp-value tx-gold">GSP+ 0%</span></div>
              </div>
              <div className="tx-exports-hubs">Faisalabad · Lahore · Karachi · Sialkot · Multan</div>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  RESOURCE DIRECTORY  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in" id="directory">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Textile <span className="text-primary">directory.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-2">Explore Pakistan's textile manufacturing landscape — vetted mills, certified facilities, and export-ready products across the country's major production hubs.</p>

            <div className="textile-filters">
              <button className="textile-filter active" data-filter="all" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>All Products</button>
              <button className="textile-filter" data-filter="denim" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>Denim</button>
              <button className="textile-filter" data-filter="home" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>Home Textiles</button>
              <button className="textile-filter" data-filter="knitwear" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>Knitwear</button>
              <button className="textile-filter" data-filter="woven" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>Woven Garments</button>
              <button className="textile-filter" data-filter="yarn" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>Yarn & Fabric</button>
              <button className="textile-filter" data-filter="sustainable" onClick={(e) => { window.filterTextiles(e.currentTarget) }}>Sustainable</button>
              <div className="textile-search-wrap">
                <svg className="textile-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" className="textile-search-input" id="textileSearchInput" placeholder="Search products, regions, certifications..." onInput={(e) => { window.searchTextiles((e.target as HTMLInputElement).value) }} />
              </div>
            </div>

            <div className="tx-results-count" id="txResultsCount">Showing <span>13</span> products</div>
            <div className="textile-no-results" id="textileNoResults">No products match your search. Try a different term or clear the filter.</div>
            <div className="tx-masonry-grid" id="textileTrack">

              {/*  DENIM  */}
              <div className="textile-card" data-category="denim" data-region="punjab" data-cert="oeko,bci" data-keywords="denim jeans fabric indigo stretch selvedge lahore faisalabad">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Denim</span>
                    <span className="textile-tag region">Punjab</span>
                  </div>
                  <h3>Premium Denim Fabric</h3>
                  <p>Indigo-dyed denim in stretch, rigid, selvedge, and sustainable variants. 8oz–14oz weights for fashion brands and retailers worldwide.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">15M+ yards/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">5,000 yards</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">BCI</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="denim" data-region="punjab" data-cert="oeko,wrap" data-keywords="jeans finished garments denim bottoms lahore fashion brands casual">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Denim</span>
                    <span className="textile-tag region">Punjab</span>
                  </div>
                  <h3>Finished Denim Garments</h3>
                  <p>Complete jeans manufacturing — cutting, stitching, washing, finishing. From basic five-pocket to premium fashion denim for international brands.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">500K+ pcs/month</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">3,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">WRAP</span>
                  </div>
                </div>
              </div>

              {/*  HOME TEXTILES  */}
              <div className="textile-card" data-category="home" data-region="punjab" data-cert="oeko,gots" data-keywords="bedding sheets duvet pillow percale sateen faisalabad home furnishing">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Home Textiles</span>
                    <span className="textile-tag region">Faisalabad</span>
                  </div>
                  <h3>Premium Bed Linen</h3>
                  <p>High thread-count sheeting — percale, sateen, and jacquard. 200TC to 1000TC ranges for luxury hotel suppliers and retail brands.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">2M+ sets/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">1,000 sets</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">GOTS</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="home" data-region="punjab" data-cert="oeko,bci" data-keywords="towels terry bath beach cotton faisalabad karachi hotel hospitality">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Home Textiles</span>
                    <span className="textile-tag region">Faisalabad</span>
                  </div>
                  <h3>Cotton Terry Towels</h3>
                  <p>Bath towels, beach towels, hand towels, and hospitality-grade terry products. 400GSM–700GSM in ring-spun and zero-twist cotton.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">8M+ pcs/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">5,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">BCI</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="home" data-region="punjab" data-cert="oeko" data-keywords="kitchen textile apron oven mitt table linen placemat faisalabad home">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Home Textiles</span>
                    <span className="textile-tag region">Faisalabad</span>
                  </div>
                  <h3>Kitchen & Table Linen</h3>
                  <p>Aprons, oven mitts, dish towels, table cloths, and placemats. Woven and printed kitchen textiles for retail and hospitality buyers.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">3M+ pcs/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">2,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                  </div>
                </div>
              </div>

              {/*  KNITWEAR  */}
              <div className="textile-card" data-category="knitwear" data-region="punjab" data-cert="wrap,sa8000" data-keywords="tshirt polo shirt knitwear cotton pique jersey lahore casual fashion">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Knitwear</span>
                    <span className="textile-tag region">Lahore</span>
                  </div>
                  <h3>T-Shirts & Polo Shirts</h3>
                  <p>Basic and fashion knitwear — round neck, V-neck, polo shirts in single jersey, pique, and interlock. Printing, embroidery, and wash treatments available.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">1M+ pcs/month</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">3,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">WRAP</span>
                    <span className="cert-badge">SA8000</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="knitwear" data-region="sindh" data-cert="oeko,wrap" data-keywords="sportswear activewear performance gym athletic sialkot karachi polyester">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Knitwear</span>
                    <span className="textile-tag region">Sialkot</span>
                  </div>
                  <h3>Sportswear & Activewear</h3>
                  <p>Performance athletic wear — moisture-wicking, compression, and sublimation-printed sportswear. Sialkot is a global hub for sports goods manufacturing.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">500K+ pcs/month</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">2,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">WRAP</span>
                  </div>
                </div>
              </div>

              {/*  WOVEN GARMENTS  */}
              <div className="textile-card" data-category="woven" data-region="punjab" data-cert="wrap,oeko" data-keywords="shirts woven dress casual formal poplin twill lahore faisalabad menswear">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Woven</span>
                    <span className="textile-tag region">Lahore</span>
                  </div>
                  <h3>Woven Dress & Casual Shirts</h3>
                  <p>Men's and women's woven shirts in poplin, twill, oxford, and chambray. Full cut-make-trim capability with embroidery, printing, and custom labelling.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">300K+ pcs/month</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">2,500 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">WRAP</span>
                    <span className="cert-badge">OEKO-TEX</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="woven" data-region="punjab" data-cert="oeko,bci" data-keywords="workwear uniform industrial protective corporate cotton polyester lahore">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Woven</span>
                    <span className="textile-tag region">Punjab</span>
                  </div>
                  <h3>Workwear & Uniforms</h3>
                  <p>Industrial workwear, corporate uniforms, and protective garments. Poly-cotton blends, fire-retardant fabrics, and high-visibility options for global markets.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">200K+ pcs/month</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">1,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">BCI</span>
                  </div>
                </div>
              </div>

              {/*  YARN & FABRIC  */}
              <div className="textile-card" data-category="yarn" data-region="sindh" data-cert="bci" data-keywords="cotton yarn ring spun open end combed carded spinning karachi multan">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Yarn</span>
                    <span className="textile-tag region">Sindh</span>
                  </div>
                  <h3>Cotton Yarn</h3>
                  <p>Ring-spun, open-end, combed, and carded cotton yarn. Count range 6s–80s for knitting and weaving applications. Pakistan's 4th-largest-in-world cotton base.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">50K+ tonnes/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">20 tonnes</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">BCI</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="yarn" data-region="punjab" data-cert="oeko" data-keywords="greige fabric grey woven raw unfinished faisalabad weaving loom">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Fabric</span>
                    <span className="textile-tag region">Faisalabad</span>
                  </div>
                  <h3>Greige & Processed Fabric</h3>
                  <p>Raw and processed woven fabric — poplin, twill, canvas, drill, and sheeting. Available greige or finished (bleached, dyed, printed) for downstream manufacturers.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">25M+ yards/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">10,000 yards</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">OEKO-TEX</span>
                  </div>
                </div>
              </div>

              {/*  SUSTAINABLE  */}
              <div className="textile-card" data-category="sustainable" data-region="punjab" data-cert="gots,oeko,bci" data-keywords="organic cotton sustainable gots certified green eco lahore faisalabad fashion">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Sustainable</span>
                    <span className="textile-tag region">Punjab</span>
                  </div>
                  <h3>GOTS Organic Cotton Products</h3>
                  <p>Fully certified organic cotton garments and home textiles — from seed to shelf. Growing organic cotton acreage in Sindh and Punjab feeding a certified supply chain.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">200K+ pcs/month</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">2,000 pcs</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">GOTS</span>
                    <span className="cert-badge">OEKO-TEX</span>
                    <span className="cert-badge">BCI</span>
                  </div>
                </div>
              </div>

              <div className="textile-card" data-category="sustainable" data-region="sindh" data-cert="grs,oeko" data-keywords="recycled polyester rpet sustainable circular economy karachi upcycled eco fashion">
                <div className="textile-card-body">
                  <div className="textile-tags">
                    <span className="textile-tag">Sustainable</span>
                    <span className="textile-tag region">Karachi</span>
                  </div>
                  <h3>Recycled Polyester & Blends</h3>
                  <p>rPET yarn, recycled cotton blends, and upcycled fabrics. GRS-certified supply chain for brands committed to circular economy and waste-reduction targets.</p>
                  <div className="textile-meta">
                    <div><span className="meta-label">Capacity</span><span className="meta-value">10K+ tonnes/year</span></div>
                    <div><span className="meta-label">Min Order</span><span className="meta-value">5 tonnes</span></div>
                  </div>
                  <div className="textile-certs">
                    <span className="cert-badge">GRS</span>
                    <span className="cert-badge">OEKO-TEX</span>
                  </div>
                </div>
              </div>

            </div>{/*  /masonry-grid  */}
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SERVICES  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Complete textile sourcing and trade facilitation — from product identification through to delivered shipments.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">search</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Sourcing & Procurement</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Access Pakistan's full textile value chain — spinning, weaving, dyeing, finishing, and garments. We match your specifications with the right manufacturers across the country.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">verified</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Quality Assurance</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">In-factory quality control, pre-shipment inspections, and production monitoring. We ensure every order meets your specifications and international quality standards.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">workspace_premium</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Compliance & Certification</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">OEKO-TEX, GOTS, Better Cotton, WRAP, and SA8000 certification management. We ensure your supply chain meets the environmental and ethical standards your markets demand.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">local_shipping</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Export Logistics</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Full export management &mdash; documentation, customs clearance, shipping coordination, and delivery tracking from factory floor to your warehouse.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">account_balance</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Trade Finance</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Structured payment terms, letters of credit facilitation, and trade finance solutions that protect both buyers and suppliers throughout the transaction.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">handshake</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Buyer-Supplier Matching</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">We maintain a vetted network of manufacturers across Pakistan's textile belt. Whether you need a single supplier or a diversified sourcing strategy, we build the right partnerships.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  PRODUCT CATEGORIES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Product <span className="text-primary">categories.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Pakistan's textile sector offers full vertical integration — from raw cotton to finished garments.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Denim</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Pakistan is one of the world's top denim exporters. Premium quality denim fabric and finished jeans for international fashion brands and retailers.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Home Textiles</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Bedding, towels, kitchen textiles, and furnishing fabrics. Pakistan dominates global home textile supply — known for quality cotton terry and jacquard weaving.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Knitwear & Sportswear</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">T-shirts, polo shirts, activewear, and performance textiles. Sialkot is the world's largest producer of sportswear and athletic goods outside China.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Sustainable & Organic</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Growing organic cotton production, recycled polyester blends, and GOTS-certified manufacturing. Pakistan is well-positioned for the global shift to sustainable fashion.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  STATS  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">Pakistan's textile sector <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">$16B+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Annual textile exports</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">4th</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Largest cotton producer globally</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">GSP+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Zero-duty access to EU markets</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">Full</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Vertical integration capability</div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  MARKETS WE SERVE  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Markets we <span className="text-primary">serve.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">We facilitate textile trade into the world's largest consumer markets.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">language</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">European Union</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Pakistan's GSP+ status provides zero-duty access to EU markets — a significant competitive advantage over rival textile exporters. We help you leverage this for maximum cost efficiency.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">public</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">United States & United Kingdom</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Major fashion brands, retailers, and home textile importers sourcing from Pakistan. We manage compliance, quality, and logistics to meet the demanding standards of Western markets.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">mosque</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Gulf States — UAE & Saudi Arabia</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">A rapidly growing market for Pakistani textiles with geographic proximity and established trade routes. Our network provides direct access to Gulf retail and wholesale buyers.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">south_america</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Emerging Markets</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Growing demand from Africa, Central Asia, and Southeast Asia for competitively priced, quality Pakistani textiles — markets where CZAAH's trade network creates unique access.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  COMPLIANCE  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-left">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Compliance <span className="text-primary">standards.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">International buyers demand rigorous certifications. We ensure your supply chain meets every requirement.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">check_circle</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">OEKO-TEX Standard 100</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">International certification for textiles tested for harmful substances — required by most European retailers and increasingly demanded across all markets.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">check_circle</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">GOTS Certification</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Global Organic Textile Standard — mandatory for organic textile supply chains. Covers environmental and social criteria across the full production process.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">check_circle</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Better Cotton Initiative</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Sustainable cotton sourcing certification — increasingly required by global fashion brands committed to responsible sourcing and environmental sustainability.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">check_circle</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">WRAP & SA8000</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Social compliance certifications ensuring ethical labour practices, safe working conditions, and responsible manufacturing across the supply chain.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-6">Source from Pakistan <span className="text-primary">with confidence.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto mb-10">Certified, quality-assured Pakistani textiles &mdash; from factory floor to your warehouse, managed by a single counterparty.</p>
            <a href="/contact?interest=Textiles%20%26%20Trade#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Begin Sourcing &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
