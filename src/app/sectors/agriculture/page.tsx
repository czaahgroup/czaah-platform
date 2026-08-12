'use client';
// @ts-nocheck

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function AgriculturePage() {
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



      // ── CROP DIRECTORY: Filter + Search + Expand ──
      (function() {
        const grid = document.getElementById('cropGrid');
        const noResults = document.getElementById('cropNoResults');
        if (!grid) return;
        const cards = [...grid.querySelectorAll('.crop-card')];
        let activeFilter = 'all';
        let searchQuery = '';

        function applyFilters() {
          const q = searchQuery.toLowerCase().trim();
          let visible = 0;
          cards.forEach(card => {
            const catMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
            const text = (card.dataset.keywords || '') + ' ' + (card.dataset.category || '') + ' ' +
              (card.querySelector('h3')?.textContent || '') + ' ' + (card.querySelector('.crop-card-body > p')?.textContent || '');
            const textMatch = !q || text.toLowerCase().includes(q);
            if (catMatch && textMatch) { card.style.display = ''; visible++; }
            else { card.style.display = 'none'; card.classList.remove('expanded'); }
          });
          noResults.classList.toggle('show', visible === 0);
        }

        window.filterCrops = function(btn) {
          activeFilter = btn.dataset.filter;
          document.querySelectorAll('.crop-filter').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('cropSearchInput').value = '';
          searchQuery = '';
          applyFilters();
        };

        window.searchCrops = function(query) {
          searchQuery = query;
          if (query.trim()) {
            document.querySelectorAll('.crop-filter').forEach(b => b.classList.remove('active'));
            document.querySelector('.crop-filter[data-filter="all"]').classList.add('active');
            activeFilter = 'all';
          }
          applyFilters();
        };

        window.toggleCrop = function(btn) {
          const card = btn.closest('.crop-card');
          card.classList.toggle('expanded');
        };
      })();

      // ── HARVEST CALENDAR ──
      (function() {
        const body = document.getElementById('harvestBody');
        const tooltip = document.getElementById('harvestTooltip');
        if (!body) return;

        const crops = [
          { name: 'Wheat', sub: 'Rabi crop', months: [3,4,5], bar: 'bar-grain', tip: 'Pakistan\'s largest crop. 27M+ tonnes. Harvest: March–May. Sowing: Nov–Dec.' },
          { name: 'Basmati Rice', sub: 'Premium export', months: [9,10,11], bar: 'bar-rice', tip: 'Super Kernel Basmati. 8.2M tonnes. $2.5B+ annual exports to 80+ countries.' },
          { name: 'IRRI Rice', sub: 'Non-basmati', months: [9,10,11], bar: 'bar-rice', tip: 'High-volume non-basmati for price-sensitive markets. 4M+ tonnes.' },
          { name: 'Cotton', sub: 'Kharif crop', months: [9,10,11,12], bar: 'bar-cotton', tip: '5th largest producer. 7.7M bales. Backbone of the textile industry.' },
          { name: 'Mangoes', sub: 'Sindhri, Chaunsa', months: [5,6,7,8], bar: 'bar-fruit', tip: '5th largest producer. 1.8M tonnes. $90M+ exports. Season: May–August.' },
          { name: 'Kinnow / Citrus', sub: 'Mandarin', months: [12,1,2,3], bar: 'bar-citrus', tip: '2.3M tonnes. $200M+ exports. Intense flavour, high juice content.' },
          { name: 'Dates', sub: 'Aseel, Dhakki', months: [6,7,8,9,10], bar: 'bar-fruit', tip: '6th largest producer. 540K tonnes. Fresh, dried, paste, syrup.' },
          { name: 'Sugarcane', sub: '90+ mills', months: [11,12,1,2,3], bar: 'bar-sugar', tip: '5th largest producer. 88M tonnes. Sugar, molasses, ethanol.' },
          { name: 'Maize', sub: 'Spring & Autumn', months: [6,7,10,11], bar: 'bar-grain', tip: '10.6M tonnes. Poultry feed, starch, oil. Two seasons per year.' },
          { name: 'Potatoes', sub: 'Year-round supply', months: [1,2,3,10,11,12], bar: 'bar-veg', tip: '7.8M tonnes. Cold storage enables year-round supply for export.' },
          { name: 'Onions & Chillies', sub: 'Multiple seasons', months: [3,4,5,6,11,12], bar: 'bar-veg', tip: 'Major exports to Afghanistan, Gulf, Central Asia. Red chillies for processing.' },
          { name: 'Dairy & Milk', sub: 'Year-round', months: [1,2,3,4,5,6,7,8,9,10,11,12], bar: 'bar-dairy', tip: '4th largest producer. 62B litres/year. Only 5% commercially processed.' }
        ];

        crops.forEach(crop => {
          const tr = document.createElement('tr');
          tr.className = 'harvest-row';
          let cells = `<td>${crop.name}<small>${crop.sub}</small></td>`;
          for (let m = 1; m <= 12; m++) {
            const active = crop.months.includes(m);
            cells += `<td>${active ? `<div class="harvest-bar ${crop.bar}"></div>` : ''}</td>`;
          }
          tr.innerHTML = cells;

          tr.addEventListener('mouseenter', (e) => {
            tooltip.innerHTML = `<h4>${crop.name}</h4><p>${crop.tip}</p>`;
            tooltip.classList.add('show');
          });
          tr.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 16) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
          });
          tr.addEventListener('mouseleave', () => { tooltip.classList.remove('show'); });

          body.appendChild(tr);
        });
      })();
  }, []);

  return (
    <>
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: `
    /* ── CROP GRID ── */
    .crop-filters {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; align-items: center;
    }
    .crop-filter {
      padding: 8px 18px; border: 1px solid var(--black-border); background: var(--black-card);
      color: var(--white-muted); font-family: 'Raleway', sans-serif;
      font-size: 13px; cursor: pointer; transition: all 0.3s;
    }
    .crop-filter:hover { border-color: var(--gold-dim); color: var(--white); }
    .crop-filter.active { background: var(--gold); border-color: var(--gold); color: var(--black); font-weight: 500; }

    .crop-search-wrap { position: relative; margin-left: auto; flex-shrink: 0; }
    .crop-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--white-muted); stroke-width: 2; fill: none; pointer-events: none; transition: stroke 0.3s; }
    .crop-search-input { padding: 8px 18px 8px 38px; background: var(--black-card); border: 1px solid var(--black-border); color: var(--white); font-family: 'Raleway', sans-serif; font-size: 13px; width: 240px; outline: none; transition: all 0.3s; }
    .crop-search-input::placeholder { color: var(--white-muted); }
    .crop-search-input:focus { border-color: var(--gold); width: 280px; }
    .crop-search-wrap:focus-within .crop-search-icon { stroke: var(--gold); }

    .crop-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .crop-no-results { grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--white-muted); font-size: 14px; display: none; }
    .crop-no-results.show { display: block; }

    .crop-card {
      background: var(--black-card);
      border: 1px solid var(--black-border);
      overflow: hidden;
      transition: all 0.4s var(--ease-smooth);
      cursor: pointer;
      position: relative;
    }
    .crop-card:hover { border-color: rgba(201, 168, 76, 0.3); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(201, 168, 76, 0.08); }
    .crop-card.expanded { border-color: rgba(201, 168, 76, 0.4); }


    .crop-card-body { padding: 20px; }
    .crop-tags { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .crop-tag { padding: 3px 10px; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; background: var(--gold-dim); color: var(--gold); }
    .crop-tag.loc { background: rgba(255, 255, 255, 0.06); color: var(--white-dim); }

    .crop-card-body h3 { font-family: 'Cinzel', serif; font-size: 17px; font-weight: 600; margin-bottom: 8px; color: var(--white); }
    .crop-card-body > p { font-size: 13px; line-height: 1.65; color: var(--white-muted); margin-bottom: 14px; }

    .crop-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; padding: 10px 12px; background: var(--black-elevated); }
    .crop-meta-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--white-muted); margin-bottom: 2px; }
    .crop-meta-value { display: block; font-size: 14px; font-weight: 500; color: var(--gold); }

    .crop-expand-btn {
      font-size: 11px; font-weight: 500; color: var(--white-muted); display: flex; align-items: center; gap: 6px;
      transition: all 0.3s; cursor: pointer; margin-bottom: 4px;
    }
    .crop-expand-btn:hover { color: var(--gold); }
    .crop-expand-btn .arrow { transition: transform 0.3s; display: inline-block; }
    .crop-card.expanded .crop-expand-btn .arrow { transform: rotate(180deg); }

    .crop-details {
      max-height: 0; overflow: hidden; transition: max-height 0.5s ease, padding 0.3s ease, opacity 0.3s ease;
      opacity: 0; padding: 0 20px;
    }
    .crop-card.expanded .crop-details {
      max-height: 400px; opacity: 1; padding: 0 20px 20px;
    }
    .crop-details-inner { border-top: 1px solid var(--black-border); padding-top: 16px; }
    .crop-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .crop-detail-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--white-muted); margin-bottom: 3px; }
    .crop-detail-item span { font-size: 13px; color: var(--white-dim); }
    .crop-certs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
    .crop-cert { padding: 3px 8px; font-size: 9px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: rgba(76, 175, 80, 0.12); color: #4CAF50; border: 1px solid rgba(76, 175, 80, 0.25); }

    .crop-enquire { font-size: 12px; font-weight: 500; color: var(--gold); text-decoration: none; transition: all 0.3s var(--ease-out); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .crop-enquire:hover { gap: 10px; color: var(--gold-light); }

    /* ── HARVEST CALENDAR ── */
    .harvest-calendar { margin-top: 32px; overflow-x: auto; max-width: 100%; }
    .harvest-table { width: 100%; min-width: 900px; border-collapse: separate; border-spacing: 0; }
    .harvest-table thead th {
      font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--white-muted); padding: 10px 6px; text-align: center;
      border-bottom: 1px solid var(--black-border);
    }
    .harvest-table thead th:first-child { text-align: left; width: 160px; color: var(--gold); }

    .harvest-row { cursor: pointer; transition: background 0.2s; }
    .harvest-row:hover { background: rgba(201, 168, 76, 0.04); }
    .harvest-row td { padding: 0; height: 44px; border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; }
    .harvest-row td:first-child {
      padding: 10px 12px; font-size: 13px; font-weight: 500; color: var(--white);
      font-family: 'Raleway', sans-serif;
    }
    .harvest-row td:first-child small { display: block; font-size: 10px; font-weight: 400; color: var(--white-muted); margin-top: 1px; }

    .harvest-bar {
      position: absolute; top: 50%; transform: translateY(-50%);
      height: 22px; left: 4px; right: 4px;
      transition: all 0.3s;
    }
    .harvest-row:hover .harvest-bar { height: 28px; filter: brightness(1.15); }

    .bar-grain { background: linear-gradient(135deg, #C9A84C, #A88B3A); }
    .bar-rice { background: linear-gradient(135deg, #8BC34A, #689F38); }
    .bar-cotton { background: linear-gradient(135deg, #E0E0E0, #BDBDBD); }
    .bar-fruit { background: linear-gradient(135deg, #FF9800, #E65100); }
    .bar-citrus { background: linear-gradient(135deg, #FFC107, #FF8F00); }
    .bar-sugar { background: linear-gradient(135deg, #795548, #5D4037); }
    .bar-veg { background: linear-gradient(135deg, #4CAF50, #2E7D32); }
    .bar-dairy { background: linear-gradient(135deg, #42A5F5, #1565C0); }

    .harvest-legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 20px; justify-content: center; }
    .harvest-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--white-muted); }
    .harvest-legend-swatch { width: 14px; height: 14px; }

    .harvest-tooltip {
      display: none; position: fixed; z-index: 100;
      background: var(--black-card); border: 1px solid var(--gold-dim);
      padding: 14px 18px; pointer-events: none;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5); max-width: 260px;
    }
    .harvest-tooltip.show { display: block; }
    .harvest-tooltip h4 { font-family: 'Cinzel', serif; font-size: 15px; color: var(--white); margin-bottom: 6px; }
    .harvest-tooltip p { font-size: 12px; color: var(--white-muted); line-height: 1.5; margin-bottom: 4px; }
    .harvest-tooltip .ht-stat { font-size: 12px; color: var(--gold); font-weight: 500; }

    @media (max-width: 768px) {
      .crop-grid { grid-template-columns: 1fr; }
      .crop-detail-grid { grid-template-columns: 1fr; }
      .crop-filters { gap: 6px; }
      .crop-filter { padding: 6px 14px; font-size: 12px; }
    }
  ` }} />

      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{backgroundImage: "url('/Images/Agriculture.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Agriculture &amp; Farming Projects</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Agriculture &amp;<br /><span className="text-primary">Farming.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Pakistan's agricultural sector accounts for 23% of GDP with vast modernisation potential. CZAAH structures international investment into large-scale farming, organic production, food processing, and cold chain infrastructure.</p>
            <a href="/contact?interest=Agriculture#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore Opportunities &rarr;</a>
          </section>
        </div>

        {/*  CROP & PRODUCT DIRECTORY  */}

        <div className="w-full h-px bg-outline-variant/20" />

        <section className="py-32 px-5 md:px-24 bg-surface fade-in" id="crop-directory">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Crop &amp; product <span className="text-primary">directory.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Explore Pakistan's agricultural commodities — from premium Basmati rice and world-class mangoes to organic produce and dairy. Click any card for full export details.</p>

            <div className="crop-filters">
              <button className="crop-filter active" data-filter="all" onClick={() => { filterCrops(this) }}>All Products</button>
              <button className="crop-filter" data-filter="grain" onClick={() => { filterCrops(this) }}>Grains</button>
              <button className="crop-filter" data-filter="rice" onClick={() => { filterCrops(this) }}>Rice</button>
              <button className="crop-filter" data-filter="cotton" onClick={() => { filterCrops(this) }}>Cotton</button>
              <button className="crop-filter" data-filter="fruit" onClick={() => { filterCrops(this) }}>Fruits</button>
              <button className="crop-filter" data-filter="vegetable" onClick={() => { filterCrops(this) }}>Vegetables</button>
              <button className="crop-filter" data-filter="dairy" onClick={() => { filterCrops(this) }}>Dairy &amp; Livestock</button>
              <button className="crop-filter" data-filter="organic" onClick={() => { filterCrops(this) }}>Organic</button>
              <div className="crop-search-wrap">
                <svg className="crop-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" className="crop-search-input" id="cropSearchInput" placeholder="Search crops, regions..." onInput={(e) => { searchCrops(e.target.value) }} />
              </div>
            </div>

            <div className="crop-no-results" id="cropNoResults">No products match your search.</div>

            <div className="crop-grid" id="cropGrid">

              {/*  RICE  */}
              <div className="crop-card" data-category="rice" data-keywords="basmati super kernel premium aromatic long grain punjab sindh export">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Rice</span><span className="crop-tag loc">Punjab &middot; Sindh</span></div>
                  <h3>Super Kernel Basmati Rice</h3>
                  <p>Pakistan's flagship export — premium long-grain Basmati known for its aroma, length, and cooking quality. Exported to 80+ countries including the Gulf, EU, and North America.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Annual Export</span><span className="crop-meta-value">$2.5B+</span></div>
                    <div><span className="crop-meta-label">Harvest</span><span className="crop-meta-value">Oct &ndash; Nov</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>UAE, Saudi Arabia, EU, USA, Kenya</span></div>
                      <div className="crop-detail-item"><label>Production Volume</label><span>8.2M tonnes/year</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>20 tonnes (FCL)</span></div>
                      <div className="crop-detail-item"><label>Packaging</label><span>5kg, 10kg, 25kg, 50kg bags</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">ISO 22000</span>
                      <span className="crop-cert">HACCP</span>
                      <span className="crop-cert">Halal</span>
                      <span className="crop-cert">BRC</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              <div className="crop-card" data-category="rice" data-keywords="irri non basmati white rice broken parboiled sindh lower punjab">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Rice</span><span className="crop-tag loc">Sindh &middot; Lower Punjab</span></div>
                  <h3>IRRI / Non-Basmati Rice</h3>
                  <p>High-volume white and parboiled rice varieties for price-sensitive markets. Broken rice grades also available for animal feed and industrial use.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Volume</span><span className="crop-meta-value">4M+ tonnes</span></div>
                    <div><span className="crop-meta-label">Harvest</span><span className="crop-meta-value">Sep &ndash; Nov</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>China, Africa, Indonesia, Bangladesh</span></div>
                      <div className="crop-detail-item"><label>Grades</label><span>5%, 10%, 25%, 100% Broken</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>25 tonnes (FCL)</span></div>
                      <div className="crop-detail-item"><label>Packaging</label><span>25kg, 50kg PP bags</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">ISO 22000</span>
                      <span className="crop-cert">Phytosanitary</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  FRUITS  */}
              <div className="crop-card" data-category="fruit" data-keywords="mango sindhri chaunsa anwar ratol summer tropical export premium">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Fruit</span><span className="crop-tag loc">Sindh &middot; South Punjab</span></div>
                  <h3>Mangoes — Sindhri, Chaunsa, Anwar Ratol</h3>
                  <p>Pakistan is the 5th largest mango producer globally. Premium varieties renowned for sweetness, aroma, and fibreless flesh. Season: May–August. Hot-water treated for phytosanitary compliance.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Annual Export</span><span className="crop-meta-value">$90M+</span></div>
                    <div><span className="crop-meta-label">Season</span><span className="crop-meta-value">May &ndash; Aug</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>UAE, UK, EU, USA, Malaysia</span></div>
                      <div className="crop-detail-item"><label>Production</label><span>1.8M tonnes/year</span></div>
                      <div className="crop-detail-item"><label>Varieties</label><span>Sindhri, Chaunsa, Anwar Ratol, Langra</span></div>
                      <div className="crop-detail-item"><label>Shipping</label><span>Air &amp; sea freight (reefer)</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">GlobalGAP</span>
                      <span className="crop-cert">Hot Water Treated</span>
                      <span className="crop-cert">Phytosanitary</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              <div className="crop-card" data-category="fruit" data-keywords="kinnow citrus mandarin orange winter sargodha bhalwal export juice">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Fruit</span><span className="crop-tag loc">Sargodha &middot; Punjab</span></div>
                  <h3>Kinnow &amp; Citrus</h3>
                  <p>Pakistan's Kinnow mandarin is prized for its intense flavour and high juice content. Exported fresh and as concentrate. Season: December–March.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Annual Export</span><span className="crop-meta-value">$200M+</span></div>
                    <div><span className="crop-meta-label">Season</span><span className="crop-meta-value">Dec &ndash; Mar</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>Russia, Afghanistan, Iran, Gulf, EU</span></div>
                      <div className="crop-detail-item"><label>Production</label><span>2.3M tonnes/year</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>20 tonnes (FCL)</span></div>
                      <div className="crop-detail-item"><label>Forms</label><span>Fresh, juice concentrate, dried peel</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">GlobalGAP</span>
                      <span className="crop-cert">Phytosanitary</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              <div className="crop-card" data-category="fruit" data-keywords="dates ajwa aseel medjool khajoor balochistan sindh dry fruit">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Fruit</span><span className="crop-tag loc">Balochistan &middot; Sindh</span></div>
                  <h3>Dates — Aseel, Begum Jangi, Dhakki</h3>
                  <p>Pakistan is the 6th largest date producer. Aseel variety dominates exports — naturally sweet, ideal for processing, snacking, and Ramadan demand spikes.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Production</span><span className="crop-meta-value">540K tonnes</span></div>
                    <div><span className="crop-meta-label">Season</span><span className="crop-meta-value">Jun &ndash; Oct</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>India, Gulf, EU, UK, North America</span></div>
                      <div className="crop-detail-item"><label>Forms</label><span>Fresh, dried, pitted, paste, syrup</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>10 tonnes</span></div>
                      <div className="crop-detail-item"><label>Packaging</label><span>5kg cartons, bulk 10–25kg</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">ISO 22000</span>
                      <span className="crop-cert">Organic Available</span>
                      <span className="crop-cert">Halal</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  GRAINS  */}
              <div className="crop-card" data-category="grain" data-keywords="wheat flour atta rabi crop punjab sindh staple food">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Grain</span><span className="crop-tag loc">Punjab &middot; Sindh &middot; KPK</span></div>
                  <h3>Wheat &amp; Wheat Flour</h3>
                  <p>Pakistan's largest crop by acreage. 27M+ tonnes produced annually. While primarily consumed domestically, surplus years create export windows for flour and semolina.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Production</span><span className="crop-meta-value">27M+ tonnes</span></div>
                    <div><span className="crop-meta-label">Harvest</span><span className="crop-meta-value">Mar &ndash; May</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Export Markets</label><span>Afghanistan, Gulf (surplus years)</span></div>
                      <div className="crop-detail-item"><label>Products</label><span>Grain, flour, semolina, bran</span></div>
                      <div className="crop-detail-item"><label>Sowing</label><span>November – December</span></div>
                      <div className="crop-detail-item"><label>Irrigation</label><span>Canal + tube well</span></div>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              <div className="crop-card" data-category="grain" data-keywords="maize corn feed poultry kharif kpk punjab starch">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Grain</span><span className="crop-tag loc">KPK &middot; Punjab</span></div>
                  <h3>Maize &amp; Corn</h3>
                  <p>Pakistan's maize production has doubled in a decade — driven by poultry feed demand and starch industry growth. Increasingly exported as animal feed and corn gluten.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Production</span><span className="crop-meta-value">10.6M tonnes</span></div>
                    <div><span className="crop-meta-label">Harvest</span><span className="crop-meta-value">Jun &amp; Nov</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Products</label><span>Grain, gluten meal, starch, oil</span></div>
                      <div className="crop-detail-item"><label>Growth Rate</label><span>8–10% annually</span></div>
                      <div className="crop-detail-item"><label>Seasons</label><span>Spring (Feb–Jun), Autumn (Jul–Nov)</span></div>
                      <div className="crop-detail-item"><label>Uses</label><span>Poultry feed, starch, ethanol</span></div>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  COTTON  */}
              <div className="crop-card" data-category="cotton" data-keywords="cotton lint seed raw textile fiber sindh punjab ginning">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Cotton</span><span className="crop-tag loc">Sindh &middot; South Punjab</span></div>
                  <h3>Raw Cotton &amp; Cotton Lint</h3>
                  <p>Pakistan is the 5th largest cotton producer globally. The backbone of the textile industry — seed cotton, lint, and cottonseed oil are all major trade commodities.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Production</span><span className="crop-meta-value">7.7M bales</span></div>
                    <div><span className="crop-meta-label">Harvest</span><span className="crop-meta-value">Sep &ndash; Dec</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Staple Length</label><span>28–32mm (medium-long)</span></div>
                      <div className="crop-detail-item"><label>By-Products</label><span>Cottonseed oil, cake, linters</span></div>
                      <div className="crop-detail-item"><label>Sowing</label><span>April – June</span></div>
                      <div className="crop-detail-item"><label>Ginning Capacity</label><span>1,200+ mills</span></div>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  VEGETABLES  */}
              <div className="crop-card" data-category="vegetable" data-keywords="potato onion chili pepper tomato fresh vegetable export wholesale">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Vegetable</span><span className="crop-tag loc">Punjab &middot; Sindh &middot; Balochistan</span></div>
                  <h3>Potatoes, Onions &amp; Chillies</h3>
                  <p>Major vegetable crops with growing export potential. Pakistani potatoes and onions are price-competitive for Gulf, Central Asian, and Afghan markets. Red chillies exported for spice processing.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Potato Output</span><span className="crop-meta-value">7.8M tonnes</span></div>
                    <div><span className="crop-meta-label">Availability</span><span className="crop-meta-value">Year-round</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Export Markets</label><span>Afghanistan, Gulf, Central Asia, Russia</span></div>
                      <div className="crop-detail-item"><label>Chilli Varieties</label><span>Dundicut, Red, Capsicum</span></div>
                      <div className="crop-detail-item"><label>Cold Storage</label><span>Available for year-round supply</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>20 tonnes (FCL)</span></div>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  DAIRY & LIVESTOCK  */}
              <div className="crop-card" data-category="dairy" data-keywords="milk dairy cattle buffalo yogurt cheese cream uht powder livestock">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Dairy</span><span className="crop-tag loc">Punjab &middot; Sindh</span></div>
                  <h3>Dairy &amp; Milk Products</h3>
                  <p>Pakistan is the 4th largest milk producer globally (62B litres/year). Massive potential for UHT processing, cheese, yogurt, and powder — currently only 5% is processed commercially.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Annual Output</span><span className="crop-meta-value">62B litres</span></div>
                    <div><span className="crop-meta-label">Processed</span><span className="crop-meta-value">~5% only</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Opportunity</label><span>Processing, cold chain, packaging</span></div>
                      <div className="crop-detail-item"><label>Products</label><span>UHT milk, cheese, yogurt, powder</span></div>
                      <div className="crop-detail-item"><label>Livestock</label><span>Buffalo, cow, goat</span></div>
                      <div className="crop-detail-item"><label>Investment</label><span>Processing plants, genetics</span></div>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              <div className="crop-card" data-category="dairy" data-keywords="halal meat beef mutton goat chicken poultry export slaughter">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Livestock</span><span className="crop-tag loc">Punjab &middot; Balochistan</span></div>
                  <h3>Halal Meat &amp; Poultry</h3>
                  <p>Rapidly growing halal meat exports — beef, mutton, and poultry to Gulf, Central Asian, and Southeast Asian markets. HACCP-certified abattoirs expanding capacity.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Meat Export</span><span className="crop-meta-value">$350M+</span></div>
                    <div><span className="crop-meta-label">Growth</span><span className="crop-meta-value">15% YoY</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>UAE, Saudi Arabia, Bahrain, Vietnam</span></div>
                      <div className="crop-detail-item"><label>Products</label><span>Chilled, frozen, offal, bone-in</span></div>
                      <div className="crop-detail-item"><label>Livestock Pop.</label><span>220M+ head</span></div>
                      <div className="crop-detail-item"><label>Availability</label><span>Year-round</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">HACCP</span>
                      <span className="crop-cert">Halal Certified</span>
                      <span className="crop-cert">ISO 22000</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  ORGANIC  */}
              <div className="crop-card" data-category="organic" data-keywords="organic basmati rice certified sustainable fair trade premium eu usa">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Organic</span><span className="crop-tag loc">Punjab</span></div>
                  <h3>Organic Basmati Rice</h3>
                  <p>EU and USDA-certified organic Basmati — grown without synthetic fertilisers or pesticides. Premium pricing, strong demand from European and North American health food markets.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Premium Over</span><span className="crop-meta-value">30–50%</span></div>
                    <div><span className="crop-meta-label">Certification</span><span className="crop-meta-value">EU / USDA</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Key Markets</label><span>Germany, UK, USA, Canada</span></div>
                      <div className="crop-detail-item"><label>Certifications</label><span>EU Organic, USDA NOP, Bio Suisse</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>15 tonnes</span></div>
                      <div className="crop-detail-item"><label>Packaging</label><span>Retail-ready or bulk</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">EU Organic</span>
                      <span className="crop-cert">USDA NOP</span>
                      <span className="crop-cert">Fair Trade</span>
                      <span className="crop-cert">Non-GMO</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              <div className="crop-card" data-category="organic" data-keywords="organic herbs spices turmeric moringa sesame seeds natural superfood">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Organic</span><span className="crop-tag loc">Sindh &middot; Balochistan</span></div>
                  <h3>Organic Herbs, Seeds &amp; Spices</h3>
                  <p>Growing range of certified organic products — turmeric, moringa, sesame seeds, cumin, and fennel. Pakistan's biodiversity supports unique flavour profiles valued in premium markets.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Growth</span><span className="crop-meta-value">25%+ YoY</span></div>
                    <div><span className="crop-meta-label">Markets</span><span className="crop-meta-value">EU &middot; USA &middot; Gulf</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Products</label><span>Turmeric, moringa, sesame, cumin, fennel</span></div>
                      <div className="crop-detail-item"><label>Forms</label><span>Whole, ground, oil, extract</span></div>
                      <div className="crop-detail-item"><label>Min. Order</label><span>1–5 tonnes</span></div>
                      <div className="crop-detail-item"><label>Packaging</label><span>Vacuum-sealed, retail-ready</span></div>
                    </div>
                    <div className="crop-certs">
                      <span className="crop-cert">EU Organic</span>
                      <span className="crop-cert">USDA NOP</span>
                      <span className="crop-cert">Kosher</span>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

              {/*  SUGARCANE  */}
              <div className="crop-card" data-category="grain" data-keywords="sugarcane sugar jaggery gur ethanol molasses sindh punjab mill">
                <div className="crop-card-body">
                  <div className="crop-tags"><span className="crop-tag">Grain</span><span className="crop-tag loc">Sindh &middot; Punjab</span></div>
                  <h3>Sugarcane &amp; Sugar</h3>
                  <p>Pakistan is the 5th largest sugarcane producer. 90+ sugar mills processing raw cane into refined sugar, molasses, and increasingly ethanol for fuel blending.</p>
                  <div className="crop-meta">
                    <div><span className="crop-meta-label">Production</span><span className="crop-meta-value">88M tonnes</span></div>
                    <div><span className="crop-meta-label">Harvest</span><span className="crop-meta-value">Nov &ndash; Mar</span></div>
                  </div>
                  <div className="crop-expand-btn" onClick={() => { toggleCrop(this) }}>View export details <span className="arrow">&#9660;</span></div>
                </div>
                <div className="crop-details">
                  <div className="crop-details-inner">
                    <div className="crop-detail-grid">
                      <div className="crop-detail-item"><label>Sugar Mills</label><span>90+ operational</span></div>
                      <div className="crop-detail-item"><label>By-Products</label><span>Molasses, ethanol, bagasse</span></div>
                      <div className="crop-detail-item"><label>Investment</label><span>Ethanol plants, refining capacity</span></div>
                      <div className="crop-detail-item"><label>Export</label><span>Surplus years (gov. dependent)</span></div>
                    </div>
                    <a href="/contact#contact-form" className="crop-enquire">Enquire &rarr;</a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SEASONAL HARVEST CALENDAR  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in" id="harvest-calendar">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Seasonal harvest <span className="text-primary">calendar.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Plan your procurement cycle around Pakistan's agricultural seasons. Hover over any bar to see production details.</p>

            <div className="harvest-calendar">
              <table className="harvest-table">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>May</th><th>Jun</th>
                    <th>Jul</th><th>Aug</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dec</th>
                  </tr>
                </thead>
                <tbody id="harvestBody">
                </tbody>
              </table>
            </div>

            <div className="harvest-legend">
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-grain"></div>Wheat &amp; Grains</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-rice"></div>Rice</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-cotton"></div>Cotton</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-fruit"></div>Mangoes &amp; Fruits</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-citrus"></div>Citrus</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-sugar"></div>Sugarcane</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-veg"></div>Vegetables</div>
              <div className="harvest-legend-item"><div className="harvest-legend-swatch bar-dairy"></div>Dairy (Year-Round)</div>
            </div>
          </div>
        </section>

        <div className="harvest-tooltip" id="harvestTooltip"></div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SERVICES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Comprehensive agricultural investment facilitation — from land acquisition through to international market access.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {[
                { icon: 'grass', title: 'Large-Scale Farming', desc: 'Facilitation of agricultural land acquisition, crop planning, and mechanised farming operations across Punjab, Sindh, and KPK.' },
                { icon: 'eco', title: 'Organic Food Production', desc: 'GOTS and organic certification support, sustainable farming practices, and access to premium international markets for organic Pakistani produce.' },
                { icon: 'precision_manufacturing', title: 'Food Processing', desc: 'Investment facilitation for food processing plants — packaging, cold storage, and value-added processing for domestic and export markets.' },
                { icon: 'pets', title: 'Livestock & Dairy', desc: "Pakistan is the 4th largest milk producer globally. Investment opportunities in dairy farming, meat processing, and livestock genetics." },
                { icon: 'local_shipping', title: 'Export Facilitation', desc: 'Connection with international buyers for Pakistani rice, mangoes, citrus, dates, and specialty crops through our international trading network.' },
                { icon: 'smart_toy', title: 'Agri-Tech', desc: "Modern farming technology, precision agriculture, irrigation systems, and supply chain digitisation for Pakistan's agricultural sector." },
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
            <h2 className="cinzel-text text-4xl text-on-surface mb-10">Pakistan's agricultural sector <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              {[
                { number: '23%', label: "Share of Pakistan's GDP" },
                { number: '4th', label: 'Largest milk producer globally' },
                { number: '$5B+', label: 'Annual agricultural exports' },
                { number: '37%', label: 'Of workforce employed' },
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

        {/*  WHY PAKISTAN  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Why <span className="text-primary">Pakistan.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">A compelling investment destination for agricultural capital.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              {[
                { icon: 'landscape', title: 'Fertile Land', desc: 'Punjab and Sindh contain some of the most fertile agricultural land in South Asia, with extensive canal irrigation from the Indus River system.' },
                { icon: 'wb_sunny', title: 'Climate Advantage', desc: 'Diverse climate zones enable year-round cultivation of a wide variety of crops — from tropical fruits to temperate grains.' },
                { icon: 'trending_up', title: 'Growing Export Demand', desc: 'Rising global demand for organic and halal food products positions Pakistan as a key supplier to Gulf, EU, and Asian markets.' },
                { icon: 'account_balance', title: 'Government Support', desc: 'Agricultural subsidies, tax incentives, and Special Economic Zones for food processing are attracting domestic and foreign investment.' },
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
            <h2 className="cinzel-text text-4xl text-on-surface mb-4">Access Pakistan's <span className="text-primary">agricultural potential.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-2xl mx-auto">Large-scale farming, organic production, and cold chain infrastructure &mdash; structured for international capital deployment.</p>
            <a href="/contact?interest=Agriculture#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Briefing &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
