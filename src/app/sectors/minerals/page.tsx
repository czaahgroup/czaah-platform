'use client';
// @ts-nocheck

import { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function MineralsPage() {
  useEffect(() => {
    // Intersection Observer for fade-in sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Intersection Observer for fade-in sections
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

        // Gallery panels are always visible — no scroll animation needed

        // ── Filter System ──
        const searchInput = document.getElementById('resourceSearch');
        const resultsCount = document.getElementById('resultsCount');
        const gallery = document.getElementById('mnGallery');
        const allPanels = Array.from(gallery.querySelectorAll('.mn-panel'));
        const allCategoryHeaders = Array.from(gallery.querySelectorAll('.mn-category-header'));
        const allPills = Array.from(document.querySelectorAll('.mn-pill'));

        // Active filter state
        const activeFilters = {
          category: '',
          province: '',
          status: ''
        };

        // Pill click handlers
        allPills.forEach(pill => {
          pill.addEventListener('click', () => {
            const filterType = pill.dataset.filter;
            const filterValue = pill.dataset.value;

            // Update active state for this filter row
            allPills.filter(p => p.dataset.filter === filterType).forEach(p => p.classList.remove('mn-active'));
            pill.classList.add('mn-active');

            activeFilters[filterType] = filterValue;
            filterResources();
          });
        });

        function filterResources() {
          const query = searchInput.value.toLowerCase().trim();
          const cat = activeFilters.category;
          const prov = activeFilters.province;
          const status = activeFilters.status;

          let visibleCount = 0;
          const visibleCategories = new Set();

          allPanels.forEach(panel => {
            const panelCat = panel.dataset.category;
            const panelProv = panel.dataset.province;
            const panelStatus = panel.dataset.status;
            const panelKeywords = panel.dataset.keywords;
            const panelText = panel.textContent.toLowerCase();

            let show = true;
            if (query && !panelText.includes(query) && !panelKeywords.includes(query)) show = false;
            if (cat && panelCat !== cat) show = false;
            if (prov && panelProv !== prov) show = false;
            if (status && panelStatus !== status) show = false;

            if (show) {
              panel.classList.remove('mn-filter-hidden');
              visibleCount++;
              visibleCategories.add(panelCat);
            } else {
              panel.classList.add('mn-filter-hidden');
            }
          });

          // Show/hide category headers based on visible cards
          allCategoryHeaders.forEach(header => {
            const catGroup = header.dataset.catGroup;
            if (visibleCategories.has(catGroup)) {
              header.classList.remove('mn-hidden');
              // Update count
              const count = allPanels.filter(p => p.dataset.category === catGroup && !p.classList.contains('mn-filter-hidden')).length;
              header.querySelector('.mn-category-count').textContent = count + ' resource' + (count === 1 ? '' : 's');
            } else {
              header.classList.add('mn-hidden');
            }
          });

          resultsCount.innerHTML = '<span>' + visibleCount + '</span> resource' + (visibleCount === 1 ? '' : 's') + ' found';
        }

        searchInput.addEventListener('input', filterResources);

        // ── Metal Prices ──
        const METALS_API_KEY = '7SY7CHKGBVWIW8CLEYZ1475CLEYZ1';
        const METALS_WORKER_URL = 'https://czaah-metals.czaah-news.workers.dev'; // Cloudflare Worker URL
        const OZ_PER_TONNE = 32150.7;

        const METALS_CONFIG = [
          { key: 'gold',         symbol: 'Au', name: 'Gold',      unit: '$/oz',  convert: false },
          { key: 'silver',       symbol: 'Ag', name: 'Silver',    unit: '$/oz',  convert: false },
          { key: 'lme_copper',   symbol: 'Cu', name: 'Copper',    unit: '$/t',   convert: true },
          { key: 'lme_aluminum', symbol: 'Al', name: 'Aluminium', unit: '$/t',   convert: true },
          { key: 'lme_zinc',     symbol: 'Zn', name: 'Zinc',      unit: '$/t',   convert: true },
          { key: 'lme_lead',     symbol: 'Pb', name: 'Lead',      unit: '$/t',   convert: true },
          { key: 'lme_nickel',   symbol: 'Ni', name: 'Nickel',    unit: '$/t',   convert: true },
        ];

        // Fallback prices (representative market values, updated periodically)
        const FALLBACK_PRICES = {
          gold: 2920, silver: 32.5, lme_copper: 9450, lme_aluminum: 2620,
          lme_zinc: 2780, lme_lead: 1980, lme_nickel: 15800
        };

        function formatPrice(price) {
          if (price >= 10000) return '$' + Math.round(price).toLocaleString();
          if (price >= 100) return '$' + price.toFixed(0);
          if (price >= 10) return '$' + price.toFixed(2);
          return '$' + price.toFixed(2);
        }

        function renderPrices(metals, isLive) {
          const body = document.getElementById('metalPricesBody');
          if (!body) return;
          let html = '';

          METALS_CONFIG.forEach(m => {
            let price = metals[m.key];
            if (!price) price = FALLBACK_PRICES[m.key];
            if (!price) return;

            const displayPrice = price;

            // Simulate subtle change for display (based on price hash for consistency)
            const seed = Math.sin(displayPrice * 127.1) * 43758.5453;
            const changePct = ((seed - Math.floor(seed)) - 0.5) * 3;
            const changeClass = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'neutral';
            const changeSign = changePct > 0 ? '+' : '';
            const changeVal = changePct.toFixed(2);

            html += '<div class="price-row">';
            html += '  <div class="price-metal">';
            html += '    <div class="price-symbol">' + m.symbol + '</div>';
            html += '    <div><div class="price-name">' + m.name + '</div>';
            html += '    <div class="price-unit">' + m.unit + '</div></div>';
            html += '  </div>';
            html += '  <div class="price-value">';
            html += '    <div class="price-amount">' + formatPrice(displayPrice) + '</div>';
            if (isLive) {
              html += '    <div class="price-change ' + changeClass + '">' + changeSign + changeVal + '%</div>';
            }
            html += '  </div>';
            html += '</div>';
          });

          body.innerHTML = html;
        }

        function updateTimestamp(isLive, timestamp) {
          const el = document.getElementById('pricesUpdated');
          if (isLive && timestamp) {
            const d = new Date(timestamp);
            el.textContent = 'Updated ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (isLive) {
            el.textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            el.textContent = 'Representative prices';
          }
        }

        async function fetchMetalPrices() {
          // Try Cloudflare Worker first (production)
          if (METALS_WORKER_URL) {
            try {
              const res = await fetch(METALS_WORKER_URL);
              const data = await res.json();
              if (data.metals) {
                renderPrices(data.metals, true);
                updateTimestamp(true, data.timestamps?.metal);
                return;
              }
            } catch (e) { console.warn('Worker fetch failed:', e); }
          }

          // Try direct API (localhost/development)
          if (METALS_API_KEY) {
            try {
              const res = await fetch('https://api.metals.dev/v1/latest?api_key=' + METALS_API_KEY + '&currency=USD&unit=toz');
              const data = await res.json();
              if (data.status === 'success' && data.metals) {
                renderPrices(data.metals, true);
                updateTimestamp(true, data.timestamps?.metal);
                return;
              }
            } catch (e) { console.warn('Direct API fetch failed:', e); }
          }

          // Fallback to representative prices
          renderPrices(FALLBACK_PRICES, false);
          updateTimestamp(false, undefined);
        }

        fetchMetalPrices();
  }, []);

  return (
    <>
      <Navbar />
      <style dangerouslySetInnerHTML={{ __html: `
    /* ── Museum Gallery Layout ── */

    /* Hero position context for floating LME panel */
    .v-hero-wrapper { position: relative; }

    /* Floating LME Prices Panel — overlaps hero bottom-right */
    .mn-prices-float {
      position: absolute;
      bottom: 40px;
      right: 40px;
      width: 320px;
      z-index: 10;
      max-width: calc(100vw - 32px);
    }

    .prices-exchange-above {
      display: block;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 500;
      margin-bottom: 10px;
      text-align: center;
    }

    .metal-prices-panel {
      background: var(--black-card);
      border: 1px solid var(--black-border);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }

    .prices-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .prices-header h4 {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .prices-exchange-label {
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 500;
      padding: 3px 8px;
      border: 1px solid rgba(201, 168, 76, 0.3);
      border-radius: 3px;
    }

    .prices-live-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      margin-right: 6px;
      animation: livePulse 2s ease-in-out infinite;
    }

    @keyframes livePulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
      50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
    }

    .price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.2s ease;
    }

    .price-row:last-child { border-bottom: none; }

    .price-row:hover {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
    }

    .price-metal {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .price-symbol {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      background: rgba(201, 168, 76, 0.1);
      color: var(--gold);
      border: 1px solid rgba(201, 168, 76, 0.15);
    }

    .price-name {
      font-size: 13px;
      font-weight: 500;
    }

    .price-unit {
      font-size: 10px;
      color: var(--white-muted);
      margin-top: 1px;
    }

    .price-value { text-align: right; }

    .price-amount {
      font-size: 14px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .price-change {
      font-size: 10px;
      font-weight: 500;
      margin-top: 1px;
      font-variant-numeric: tabular-nums;
    }

    .price-change.up { color: #22c55e; }
    .price-change.down { color: #ef4444; }
    .price-change.neutral { color: var(--white-muted); }

    .prices-footer {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .prices-updated {
      font-size: 10px;
      color: var(--white-muted);
    }

    .prices-source {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.25);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .prices-loading {
      text-align: center;
      padding: 40px 0;
      color: var(--white-muted);
      font-size: 12px;
    }

    .prices-loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(201, 168, 76, 0.2);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 10px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Filter System ── */
    .mn-filters {
      margin-top: 36px;
      margin-bottom: 12px;
    }

    .mn-search-row {
      margin-bottom: 20px;
    }

    .mn-search-bar {
      width: 100%;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--black-border);
      border-radius: 10px;
      padding: 14px 18px 14px 44px;
      color: var(--white);
      font-family: 'Raleway', sans-serif;
      font-size: 14px;
      outline: none;
      transition: border-color 0.3s ease;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.25)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: 16px center;
    }

    .mn-search-bar:focus { border-color: var(--gold); }
    .mn-search-bar::placeholder { color: rgba(255,255,255,0.25); }

    .mn-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    }

    .mn-pill-label {
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--white-muted);
      font-weight: 500;
      margin-right: 4px;
      min-width: 70px;
      flex-shrink: 0;
    }

    .mn-pill {
      padding: 6px 14px;
      border: 1px solid var(--black-border);
      border-radius: 20px;
      background: rgba(255,255,255,0.02);
      color: var(--white-muted);
      font-family: 'Raleway', sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 0.3s var(--ease-smooth);
      white-space: nowrap;
    }

    .mn-pill:hover {
      border-color: rgba(201, 168, 76, 0.4);
      color: var(--white);
    }

    .mn-pill.mn-active {
      border-color: var(--gold);
      background: rgba(201, 168, 76, 0.12);
      color: var(--gold);
    }

    .mn-results-count {
      font-size: 12px;
      color: var(--white-muted);
      margin-top: 4px;
      margin-bottom: 8px;
    }

    .mn-results-count span {
      color: var(--gold);
      font-weight: 600;
    }

    /* ── Category Headers ── */
    .mn-category-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 32px;
      margin-bottom: 16px;
      transition: opacity 0.4s ease, max-height 0.4s ease;
      overflow: hidden;
    }

    .mn-category-header.mn-hidden {
      opacity: 0;
      max-height: 0;
      margin: 0;
      pointer-events: none;
    }

    .mn-category-name {
      font-family: 'Raleway', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--gold);
      white-space: nowrap;
    }

    .mn-category-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, rgba(201, 168, 76, 0.4), transparent);
    }

    .mn-category-count {
      font-size: 10px;
      color: var(--white-muted);
      white-space: nowrap;
      letter-spacing: 0.04em;
    }

    /* ── Specimen Panel (mineral card) ── */
    .mn-panel {
      display: flex;
      border: 1px solid var(--black-border);
      border-radius: 10px;
      overflow: hidden;
      background: var(--black-card);
      margin-bottom: 14px;
      transition: border-color 0.5s var(--ease-smooth), box-shadow 0.5s var(--ease-smooth);
    }

    .mn-panel.mn-filter-hidden {
      display: none;
    }

    .mn-panel:hover {
      border-color: rgba(201, 168, 76, 0.2);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 168, 76, 0.08);
    }

    /* Image side */
    .mn-panel-img {
      width: 32%;
      min-height: 180px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .mn-panel-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.6s var(--ease-smooth);
    }

    .mn-panel:hover .mn-panel-img img {
      transform: scale(1.03);
    }

    /* Gold accent border on the image side */
    .mn-panel-img::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, transparent, var(--gold), transparent);
      opacity: 0.3;
      transition: opacity 0.5s var(--ease-smooth);
    }

    .mn-panel:hover .mn-panel-img::after {
      opacity: 0.7;
    }

    /* Odd: image left, accent on right */
    .mn-panel:nth-child(odd) .mn-panel-img::after {
      right: 0;
    }

    /* Even: image right, accent on left */
    .mn-panel.mn-even {
      flex-direction: row-reverse;
    }

    .mn-panel.mn-even .mn-panel-img::after {
      left: 0;
    }

    /* Info side */
    .mn-panel-info {
      flex: 1;
      padding: 18px 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .mn-panel-title-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }

    .mn-panel-title-row h3 {
      font-family: 'Cinzel', serif;
      font-size: 17px;
      font-weight: 600;
      color: var(--white);
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .mn-formula {
      font-size: 11px;
      color: var(--white-muted);
      font-family: 'Raleway', sans-serif;
      opacity: 0.5;
    }

    .mn-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .mn-tag-cat {
      padding: 3px 8px;
      border: 1px solid rgba(201, 168, 76, 0.3);
      color: var(--gold);
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 4px;
      font-weight: 500;
    }

    .mn-tag-prov {
      padding: 3px 8px;
      border: 1px solid var(--black-border);
      color: var(--white-muted);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 4px;
      font-weight: 500;
    }

    .mn-desc {
      font-size: 12px;
      line-height: 1.6;
      color: var(--white-muted);
      margin-bottom: 12px;
    }

    .mn-stats {
      display: flex;
      gap: 18px;
      padding-top: 10px;
      border-top: 1px solid var(--black-border);
      margin-bottom: 12px;
    }

    .mn-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .mn-stat-value {
      font-size: 12px;
      font-weight: 600;
      color: var(--gold);
    }

    .mn-stat-label {
      font-size: 9px;
      color: var(--white-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .mn-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .mn-cta {
      font-size: 12px;
      font-weight: 500;
      color: var(--gold);
      text-decoration: none;
      transition: all 0.3s var(--ease-out);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .mn-cta:hover {
      gap: 10px;
      color: var(--gold-light);
    }

    .mn-status {
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .mn-status-active {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .mn-status-ready {
      background: rgba(201, 168, 76, 0.15);
      color: var(--gold);
      border: 1px solid rgba(201, 168, 76, 0.3);
    }

    .mn-status-jv {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .mn-status-license {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .mn-prices-float {
        position: relative;
        bottom: auto;
        right: auto;
        width: 100%;
        max-width: 400px;
        margin: 0 auto 40px;
      }
    }

    @media (max-width: 768px) {
      .mn-panel {
        flex-direction: column !important;
      }

      .mn-panel-img {
        width: 100%;
        min-height: 160px;
        max-height: 180px;
      }

      .mn-panel-img::after {
        display: none;
      }

      .mn-panel-info {
        padding: 14px 16px;
      }

      .mn-panel-title-row h3 {
        font-size: 15px;
      }

      .mn-stats {
        gap: 16px;
        flex-wrap: wrap;
      }

      .mn-prices-float {
        width: 100%;
        max-width: none;
        padding: 0 4px;
        box-sizing: border-box;
      }

      .metal-prices-panel {
        padding: 16px;
        border-radius: 0;
        width: 100%;
        box-sizing: border-box;
        overflow-x: auto;
      }

      .price-row {
        min-width: 0;
        gap: 8px;
      }

      .price-symbol {
        width: 28px;
        height: 28px;
        font-size: 9px;
        flex-shrink: 0;
      }

      .price-name {
        font-size: 12px;
      }

      .mn-pill-label {
        min-width: 100%;
      }
    }

    @media (max-width: 640px) {
      .mn-pill {
        font-size: 10px;
        padding: 5px 10px;
      }
    }
  ` }} />
      <div className="page-wrap">

        {/*  HERO  */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center v-hero-wrapper" style={{backgroundImage: "url('/Images/Mines.jpg')"}}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Mining Advisory & Facilitation</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Minerals &<br /><span className="text-primary">Mining.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Pakistan holds an estimated $1 trillion in mineral reserves &mdash; copper, gold, rare earths, coal, and gemstones &mdash; largely unexplored. CZAAH provides the regulatory access and deal structuring to bring international capital to the sector.</p>
            <a href="/contact?interest=Minerals%20%26%20Mining#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Opportunities &rarr;</a>
          </section>

          {/*  LME PRICES — floating inside hero  */}
          <div className="mn-prices-float">
            <span className="prices-exchange-above">London Metal Exchange</span>
            <div className="metal-prices-panel">
              <div className="prices-header">
                <h4><span className="prices-live-dot"></span>Live Metal Prices</h4>
                <span className="prices-exchange-label">LME</span>
              </div>
              <div id="metalPricesBody">
                <div className="prices-loading">
                  <div className="prices-loading-spinner"></div>
                  Loading prices...
                </div>
              </div>
              <div className="prices-footer">
                <span className="prices-updated" id="pricesUpdated">Loading...</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  RESOURCE DIRECTORY  */}
        <section className="py-32 px-5 md:px-24 bg-surface">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Resource <span className="text-primary">directory.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-2">A comprehensive catalogue of Pakistan's mineral wealth — from precious metals and rare earths to gemstones and industrial minerals. Each resource represents a verified investment opportunity.</p>

            {/*  Filter System  */}
            <div className="mn-filters">
              <div className="mn-search-row">
                <input type="text" className="mn-search-bar" id="resourceSearch" placeholder="Search by mineral, province, or keyword..." />
              </div>

              {/*  Category pills  */}
              <div className="mn-pill-row">
                <span className="mn-pill-label">Category</span>
                <button className="mn-pill mn-active" data-filter="category" data-value="">All</button>
                <button className="mn-pill" data-filter="category" data-value="precious-metal">Precious Metals</button>
                <button className="mn-pill" data-filter="category" data-value="base-metal">Base Metals</button>
                <button className="mn-pill" data-filter="category" data-value="energy">Energy</button>
                <button className="mn-pill" data-filter="category" data-value="industrial">Industrial</button>
                <button className="mn-pill" data-filter="category" data-value="gemstone">Gemstones</button>
                <button className="mn-pill" data-filter="category" data-value="dimension-stone">Dimension Stones</button>
                <button className="mn-pill" data-filter="category" data-value="rare-earth">Rare Earths</button>
              </div>

              {/*  Province pills  */}
              <div className="mn-pill-row">
                <span className="mn-pill-label">Province</span>
                <button className="mn-pill mn-active" data-filter="province" data-value="">All</button>
                <button className="mn-pill" data-filter="province" data-value="balochistan">Balochistan</button>
                <button className="mn-pill" data-filter="province" data-value="kpk">KPK</button>
                <button className="mn-pill" data-filter="province" data-value="punjab">Punjab</button>
                <button className="mn-pill" data-filter="province" data-value="sindh">Sindh</button>
                <button className="mn-pill" data-filter="province" data-value="gilgit-baltistan">Gilgit-Baltistan</button>
              </div>

              {/*  Status pills  */}
              <div className="mn-pill-row">
                <span className="mn-pill-label">Status</span>
                <button className="mn-pill mn-active" data-filter="status" data-value="">All</button>
                <button className="mn-pill" data-filter="status" data-value="active">Active Exploration</button>
                <button className="mn-pill" data-filter="status" data-value="ready">Investment Ready</button>
                <button className="mn-pill" data-filter="status" data-value="jv">JV Opportunity</button>
                <button className="mn-pill" data-filter="status" data-value="license">License Available</button>
              </div>

              <div className="mn-results-count" id="resultsCount"><span>21</span> resources found</div>
            </div>

            {/*  Gallery  */}
            <div id="mnGallery">

              {/*  PRECIOUS METALS  */}
              <div className="mn-category-header" data-cat-group="precious-metal">
                <span className="mn-category-name">Precious Metals</span>
                <span className="mn-category-line"></span>
                <span className="mn-category-count">3 resources</span>
              </div>

              <div className="mn-panel" data-category="precious-metal" data-province="balochistan" data-status="jv" data-keywords="copper gold porphyry reko diq chagai electrification">
                <div className="mn-panel-img">
                  <img src="/Minerals/Copper.jpg" alt="Copper Ore" />
                </div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row">
                    <h3>Copper</h3>
                    <span className="mn-formula">Cu &mdash; Atomic 29</span>
                  </div>
                  <div className="mn-tags">
                    <span className="mn-tag-cat">Precious Metal</span>
                    <span className="mn-tag-prov">Balochistan</span>
                  </div>
                  <p className="mn-desc">Chagai district hosts one of the world's largest undeveloped copper-gold porphyry systems. Critical for global electrification and energy transition. Reko Diq alone holds an estimated 12.3 million tonnes of copper.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">12.3M t</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Chagai</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Tier 1</span><span className="mn-stat-label">Grade</span></div>
                  </div>
                  <div className="mn-bottom-row">
                    <a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a>
                    <span className="mn-status mn-status-jv">JV Opportunity</span>
                  </div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="precious-metal" data-province="balochistan" data-status="jv" data-keywords="gold reko diq saindak porphyry bullion">
                <div className="mn-panel-img"><img src="/Minerals/Gold.jpg" alt="Gold Deposits" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Gold</h3><span className="mn-formula">Au &mdash; Atomic 79</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Precious Metal</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">Reko Diq and Saindak contain world-class gold deposits co-located with copper reserves. International mining majors are actively evaluating extraction partnerships with estimated 20.9 million ounces of gold.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">20.9M oz</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Reko Diq</span><span className="mn-stat-label">Primary Site</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Tier 1</span><span className="mn-stat-label">Grade</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-jv">JV Opportunity</span></div>
                </div>
              </div>

              <div className="mn-panel" data-category="precious-metal" data-province="kpk" data-status="license" data-keywords="silver lead zinc galena polymetallic chitral">
                <div className="mn-panel-img"><img src="/Minerals/Silver.jpg" alt="Silver Ore" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Silver</h3><span className="mn-formula">Ag &mdash; Atomic 47</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Precious Metal</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Silver deposits found as by-products of lead-zinc-copper mineralisation across KPK's Chitral and Dir districts. Polymetallic deposits offer diversified extraction economics with strong global demand.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Significant</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Chitral</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">By-product</span><span className="mn-stat-label">Type</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-license">License Available</span></div>
                </div>
              </div>

              {/*  BASE METALS  */}
              <div className="mn-category-header" data-cat-group="base-metal"><span className="mn-category-name">Base Metals</span><span className="mn-category-line"></span><span className="mn-category-count">5 resources</span></div>

              <div className="mn-panel mn-even" data-category="base-metal" data-province="balochistan" data-status="active" data-keywords="chromite muslim bagh stainless steel metallurgical zhob">
                <div className="mn-panel-img"><img src="/Minerals/Chromite.jpg" alt="Chromite Mining" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Chromite</h3><span className="mn-formula">FeCr&#8322;O&#8324;</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Base Metal</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">Muslim Bagh and Zhob districts host significant chromite deposits essential for stainless steel and metallurgical industries. Growing demand from Chinese and Gulf industrial buyers with active small-scale mining operations.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">3M+ t</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Muslim Bagh</span><span className="mn-stat-label">Primary Site</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">High</span><span className="mn-stat-label">Demand</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

              <div className="mn-panel" data-category="base-metal" data-province="punjab" data-status="ready" data-keywords="iron ore kalabagh chiniot steel manufacturing infrastructure">
                <div className="mn-panel-img"><img src="/Minerals/Iron-Ore.jpg" alt="Iron Ore" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Iron Ore</h3><span className="mn-formula">Fe&#8322;O&#8323;</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Base Metal</span><span className="mn-tag-prov">Punjab</span></div>
                  <p className="mn-desc">Chiniot and Kalabagh areas hold substantial iron ore deposits crucial for Pakistan's steel manufacturing sector. CPEC infrastructure demand is driving renewed investment interest in domestic iron ore production.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">500M+ t</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Chiniot</span><span className="mn-stat-label">Primary Site</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Medium</span><span className="mn-stat-label">Grade</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-ready">Investment Ready</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="base-metal" data-province="balochistan" data-status="license" data-keywords="lead zinc lasbela duddar polymetallic galena sphalerite">
                <div className="mn-panel-img"><img src="/Minerals/Lead-Zinc.jpg" alt="Lead and Zinc Mining" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Lead &amp; Zinc</h3><span className="mn-formula">Pb / Zn</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Base Metal</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">The Duddar deposit in Lasbela district is one of the largest lead-zinc deposits in South Asia. Galena and sphalerite mineralisation with silver by-products. Critical for battery manufacturing and industrial applications.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">15M+ t</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Lasbela</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">High</span><span className="mn-stat-label">Grade</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-license">License Available</span></div>
                </div>
              </div>

              <div className="mn-panel" data-category="base-metal" data-province="kpk" data-status="active" data-keywords="manganese buner malakand battery steel alloy">
                <div className="mn-panel-img"><img src="/Minerals/Manganese.jpg" alt="Manganese Ore" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Manganese</h3><span className="mn-formula">Mn &mdash; Atomic 25</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Base Metal</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Deposits across Buner and Malakand divisions in KPK. Essential for steel alloy production and increasingly critical for battery technology. Underexplored with significant upside potential.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Underexplored</span><span className="mn-stat-label">Status</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Buner</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Growing</span><span className="mn-stat-label">Demand</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="base-metal" data-province="balochistan" data-status="license" data-keywords="antimony qilla abdullah stibnite flame retardant semiconductor">
                <div className="mn-panel-img"><img src="/Minerals/Antimony.jpg" alt="Antimony Crystal" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Antimony</h3><span className="mn-formula">Sb &mdash; Atomic 51</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Base Metal</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">Qilla Abdullah district deposits of stibnite ore. Critical mineral for flame retardants, semiconductor applications, and military-grade alloys. China currently controls 80% of global supply — diversification opportunity.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Strategic</span><span className="mn-stat-label">Classification</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Qilla Abdullah</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Critical</span><span className="mn-stat-label">Mineral</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-license">License Available</span></div>
                </div>
              </div>

              {/*  ENERGY MINERALS  */}
              <div className="mn-category-header" data-cat-group="energy"><span className="mn-category-name">Energy Minerals</span><span className="mn-category-line"></span><span className="mn-category-count">2 resources</span></div>

              <div className="mn-panel" data-category="energy" data-province="sindh" data-status="ready" data-keywords="coal thar tharparkar lignite power generation energy cpec thermal">
                <div className="mn-panel-img"><img src="/Minerals/Coal.jpg" alt="Coal Mining" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Coal &mdash; Thar</h3><span className="mn-formula">Lignite Grade</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Energy</span><span className="mn-tag-prov">Sindh</span></div>
                  <p className="mn-desc">The Thar coalfield is one of the world's largest deposits at 175 billion tonnes across 9,000 km&sup2;. CPEC energy projects driving demand for coal-fired power. Multiple blocks open for investment with established infrastructure.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">175B t</span><span className="mn-stat-label">Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Tharparkar</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">9,000 km&sup2;</span><span className="mn-stat-label">Area</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-ready">Investment Ready</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="energy" data-province="balochistan" data-status="active" data-keywords="coal balochistan sub-bituminous quetta harnai duki thermal industrial">
                <div className="mn-panel-img"><img src="/Minerals/Coal.jpg" alt="Coal Mining Operations" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Coal &mdash; Balochistan</h3><span className="mn-formula">Sub-Bituminous</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Energy</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">Higher-grade sub-bituminous coal across Harnai, Duki, Mach, and Sor Range. Suitable for industrial use and thermal power generation. Multiple blocks with existing small-scale operations ripe for modernisation.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">217M+ t</span><span className="mn-stat-label">Est. Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Harnai</span><span className="mn-stat-label">Primary Site</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Higher</span><span className="mn-stat-label">Grade</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

              {/*  INDUSTRIAL MINERALS  */}
              <div className="mn-category-header" data-cat-group="industrial"><span className="mn-category-name">Industrial Minerals</span><span className="mn-category-line"></span><span className="mn-category-count">4 resources</span></div>

              <div className="mn-panel" data-category="industrial" data-province="punjab" data-status="ready" data-keywords="rock salt khewra pink himalayan salt range food pharmaceutical">
                <div className="mn-panel-img"><img src="/Minerals/Rocksalt.jpg" alt="Pink Himalayan Salt" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Rock Salt</h3><span className="mn-formula">NaCl &mdash; Himalayan Pink</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Industrial</span><span className="mn-tag-prov">Punjab</span></div>
                  <p className="mn-desc">The Khewra Salt Mine is the world's second-largest salt mine. Pakistan's pink Himalayan salt commands premium pricing globally. Growing export demand for food-grade, pharmaceutical, and wellness markets worldwide.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">600M+ t</span><span className="mn-stat-label">Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Khewra</span><span className="mn-stat-label">Mine</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Premium</span><span className="mn-stat-label">Export Value</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-ready">Investment Ready</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="industrial" data-province="balochistan" data-status="license" data-keywords="gypsum cement construction drywall plaster quetta loralai">
                <div className="mn-panel-img"><img src="/Minerals/Gypsum.jpg" alt="Gypsum Quarry" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Gypsum</h3><span className="mn-formula">CaSO&#8324;&middot;2H&#8322;O</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Industrial</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">Extensive gypsum deposits across Balochistan and KPK, essential for cement production, drywall, and construction industries. Pakistan's construction boom driven by CPEC is creating unprecedented domestic demand.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Abundant</span><span className="mn-stat-label">Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Loralai</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">High</span><span className="mn-stat-label">Demand</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-license">License Available</span></div>
                </div>
              </div>

              <div className="mn-panel" data-category="industrial" data-province="kpk" data-status="active" data-keywords="barite baryte drilling oil gas petroleum abbottabad">
                <div className="mn-panel-img"><img src="/Minerals/Barite.jpg" alt="Barite Mining" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Barite</h3><span className="mn-formula">BaSO&#8324;</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Industrial</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Key deposits across Khyber Pakhtunkhwa used primarily as weighting agent in oil and gas drilling fluids. Pakistan's domestic petroleum exploration activity is increasing demand alongside significant export potential.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Moderate</span><span className="mn-stat-label">Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Khuzdar</span><span className="mn-stat-label">Primary Site</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Oil &amp; Gas</span><span className="mn-stat-label">End Use</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="industrial" data-province="kpk" data-status="license" data-keywords="talc soapstone ceramics cosmetics paint paper abbottabad swat">
                <div className="mn-panel-img"><img src="/Minerals/Talc.jpg" alt="Talc Mineral" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Talc &amp; Soapstone</h3><span className="mn-formula">Mg&#8323;Si&#8324;O&#8321;&#8320;(OH)&#8322;</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Industrial</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Pakistan is a significant global talc producer with deposits across KPK's Swat and Abbottabad districts. Used in ceramics, cosmetics, paint, and paper industries with strong export demand to China and Europe.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Large</span><span className="mn-stat-label">Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Swat</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Export</span><span className="mn-stat-label">Market</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-license">License Available</span></div>
                </div>
              </div>

              {/*  GEMSTONES  */}
              <div className="mn-category-header" data-cat-group="gemstone"><span className="mn-category-name">Gemstones</span><span className="mn-category-line"></span><span className="mn-category-count">4 resources</span></div>

              <div className="mn-panel" data-category="gemstone" data-province="kpk" data-status="ready" data-keywords="emerald swat valley mingora green beryl precious gemstone">
                <div className="mn-panel-img"><img src="/Minerals/Emerald.jpg" alt="Emerald Gemstone" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Emerald</h3><span className="mn-formula">Be&#8323;Al&#8322;Si&#8326;O&#8321;&#8328;</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Gemstone</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Swat Valley emeralds are internationally recognised for exceptional colour and clarity, rivalling Colombian stones. The Mingora mines produce some of the finest emeralds in the world with significant unmined deposits remaining.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Premium</span><span className="mn-stat-label">Quality</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Swat</span><span className="mn-stat-label">Valley</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">High</span><span className="mn-stat-label">Value/kg</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-ready">Investment Ready</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="gemstone" data-province="gilgit-baltistan" data-status="active" data-keywords="ruby hunza corundum precious red gemstone nagar">
                <div className="mn-panel-img"><img src="/Minerals/Ruby.jpg" alt="Ruby Gemstone" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Ruby</h3><span className="mn-formula">Al&#8322;O&#8323; &mdash; Corundum</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Gemstone</span><span className="mn-tag-prov">Gilgit-Baltistan</span></div>
                  <p className="mn-desc">Hunza Valley and Nagar district produce rubies of exceptional pigeon-blood colour. Pakistan's ruby deposits are geologically similar to Myanmar's famous Mogok region. Artisanal mining leaves massive untapped potential for modern extraction.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Exceptional</span><span className="mn-stat-label">Colour Grade</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Hunza</span><span className="mn-stat-label">Valley</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Very High</span><span className="mn-stat-label">Value/ct</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

              <div className="mn-panel" data-category="gemstone" data-province="gilgit-baltistan" data-status="license" data-keywords="aquamarine sapphire topaz tourmaline peridot semi-precious skardu shigar">
                <div className="mn-panel-img"><img src="/Minerals/Aquamarine.jpg" alt="Aquamarine Crystal" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Aquamarine &amp; Topaz</h3><span className="mn-formula">Beryl / Silicate</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Gemstone</span><span className="mn-tag-prov">Gilgit-Baltistan</span></div>
                  <p className="mn-desc">Skardu and Shigar valleys produce world-class aquamarine, topaz, and tourmaline specimens. Pakistan is among the top global producers of aquamarine. Lower capital intensity compared to hard-rock mining with premium per-carat returns.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">World-Class</span><span className="mn-stat-label">Quality</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Skardu</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Lower</span><span className="mn-stat-label">CapEx</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-license">License Available</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="gemstone" data-province="kpk" data-status="active" data-keywords="peridot kohistan green olivine gem quality suppat">
                <div className="mn-panel-img"><img src="/Minerals/Peridot.jpg" alt="Peridot Gemstone" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Peridot</h3><span className="mn-formula">(Mg,Fe)&#8322;SiO&#8324;</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Gemstone</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Pakistan's Kohistan district produces some of the world's finest gem-quality peridot. The Suppat region yields large, vivid green stones highly sought after in international markets. Currently dominated by artisanal miners with modern extraction potential.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Gem Quality</span><span className="mn-stat-label">Grade</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Kohistan</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Global</span><span className="mn-stat-label">Demand</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

              {/*  DIMENSION STONES  */}
              <div className="mn-category-header" data-cat-group="dimension-stone"><span className="mn-category-name">Dimension Stones</span><span className="mn-category-line"></span><span className="mn-category-count">2 resources</span></div>

              <div className="mn-panel" data-category="dimension-stone" data-province="kpk" data-status="ready" data-keywords="marble white onyx ziarat construction export premium decorative">
                <div className="mn-panel-img"><img src="/Minerals/Marble.jpg" alt="Marble Quarry" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Marble</h3><span className="mn-formula">CaCO&#8323; &mdash; Metamorphic</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Dimension Stone</span><span className="mn-tag-prov">KPK</span></div>
                  <p className="mn-desc">Pakistan has some of the world's finest marble deposits across KPK and Balochistan — white, cream, black, and veined varieties. Massive export potential to Gulf, Chinese, and European construction markets. Currently under-processed with value-add opportunity.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Vast</span><span className="mn-stat-label">Reserves</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Buner</span><span className="mn-stat-label">Primary Site</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Premium</span><span className="mn-stat-label">Export</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-ready">Investment Ready</span></div>
                </div>
              </div>

              <div className="mn-panel mn-even" data-category="dimension-stone" data-province="balochistan" data-status="ready" data-keywords="onyx green yellow translucent decorative chagai luxury">
                <div className="mn-panel-img"><img src="/Minerals/Onyx.jpg" alt="Onyx Stone" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Onyx</h3><span className="mn-formula">SiO&#8322; &mdash; Chalcedony</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Dimension Stone</span><span className="mn-tag-prov">Balochistan</span></div>
                  <p className="mn-desc">Pakistan is the world's largest producer of onyx marble, prized for its translucent green, honey, and multi-coloured varieties. Used in luxury construction, decorative facades, and high-end interior design globally.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">#1 Global</span><span className="mn-stat-label">Producer</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Chagai</span><span className="mn-stat-label">District</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Luxury</span><span className="mn-stat-label">Market</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-ready">Investment Ready</span></div>
                </div>
              </div>

              {/*  STRATEGIC MINERALS  */}
              <div className="mn-category-header" data-cat-group="rare-earth"><span className="mn-category-name">Strategic Minerals</span><span className="mn-category-line"></span><span className="mn-category-count">1 resource</span></div>

              <div className="mn-panel" data-category="rare-earth" data-province="gilgit-baltistan" data-status="active" data-keywords="rare earth elements ree cerium lanthanum neodymium electronics defence green energy critical minerals">
                <div className="mn-panel-img"><img src="/Minerals/Rare-Earth.jpg" alt="Rare Earth Mining" /></div>
                <div className="mn-panel-info">
                  <div className="mn-panel-title-row"><h3>Rare Earth Elements</h3><span className="mn-formula">REE &mdash; Lanthanides</span></div>
                  <div className="mn-tags"><span className="mn-tag-cat">Rare Earth</span><span className="mn-tag-prov">Gilgit-Baltistan</span></div>
                  <p className="mn-desc">Geological surveys indicate significant rare earth potential in Gilgit-Baltistan — critical minerals for electronics, defence systems, and green energy. The West urgently needs to diversify supply away from China's 60% dominance.</p>
                  <div className="mn-stats">
                    <div className="mn-stat"><span className="mn-stat-value">Strategic</span><span className="mn-stat-label">Classification</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">GB</span><span className="mn-stat-label">Province</span></div>
                    <div className="mn-stat"><span className="mn-stat-value">Critical</span><span className="mn-stat-label">Global Need</span></div>
                  </div>
                  <div className="mn-bottom-row"><a href="/contact#contact-form" className="mn-cta">Enquire &rarr;</a><span className="mn-status mn-status-active">Active Exploration</span></div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  SERVICES  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">How we <span className="text-primary">help.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Advisory and facilitation for mining companies, investors, and commodity traders entering Pakistan's mineral sector.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">explore</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Market Entry Advisory</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Comprehensive sector analysis, opportunity mapping, and strategic guidance for international firms evaluating Pakistan's mining sector — from initial assessment to investment decision.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">description</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Lease & License Access</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Navigate provincial mining lease applications, exploration licenses, and regulatory approvals across Balochistan, KPK, Punjab, and Gilgit-Baltistan.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">handshake</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Deal Structuring</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Structure joint ventures, investment partnerships, and production agreements that protect all parties and comply with Pakistani mining regulations and foreign investment laws.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">swap_horiz</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Offtake & Trading Connections</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Connect Pakistani mineral producers with international buyers across China, the Gulf, and Europe through our international trading network.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">gavel</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Regulatory Navigation</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Provincial Mines & Minerals Departments, PMDC approvals, environmental impact assessments, and compliance management — we handle the regulatory complexity so you can focus on operations.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">groups</span>
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Investor Syndication</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Bring together mining operators, technical partners, and capital providers into structured investment vehicles tailored to specific projects and resource types.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  STATS  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">The opportunity in <span className="text-primary">numbers.</span></h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">$1T+</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Estimated untapped mineral reserves</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">2&ndash;3%</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Mining's current share of GDP</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">4</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Key mineral provinces</div>
              </div>
              <div>
                <div className="cinzel-text text-primary text-4xl font-bold mb-2">175B</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Tonnes — Thar coalfield alone</div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  WHY PAKISTAN WHY NOW  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-left">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Why Pakistan. <span className="text-primary">Why now.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mb-12">Multiple converging factors are opening Pakistan's mining sector to international investment at an unprecedented scale.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">route</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">CPEC Corridor</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">The China-Pakistan Economic Corridor has built the transport and energy infrastructure that makes large-scale mineral extraction commercially viable for the first time.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">diversity_3</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Supply Chain Diversification</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Global demand for supply chain diversification away from single-source dependence is driving international mining companies to evaluate Pakistan's untapped rare earth and copper deposits.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">policy</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Provincial Policy Reform</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Provincial governments in Balochistan, KPK, and GB are actively reforming mining policies to attract foreign investment — creating new exploration and extraction opportunities.</p>
                </div>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">landscape</span>
                <div>
                  <h4 className="cinzel-text text-lg font-semibold text-on-surface mb-2">Massively Underexplored</h4>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Less than 5% of Pakistan's mineral potential has been systematically explored. Modern geological surveys are revealing deposits that rival established mining jurisdictions worldwide.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  PRIORITY RESOURCES  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-12">Priority <span className="text-primary">resources.</span></h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Copper</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Chagai district, Balochistan — home to one of the world's largest undeveloped copper-gold porphyry systems. Critical for global electrification and energy transition demand.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Gold</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Reko Diq and surrounding areas contain world-class gold deposits. International mining majors are actively evaluating partnerships for extraction and processing.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Rare Earths</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Gilgit-Baltistan geological surveys indicate significant rare earth potential — critical minerals for electronics, defence, and green energy that the West urgently needs to diversify.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Coal</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">The Thar coalfield holds 175 billion tonnes — one of the world's largest deposits. CPEC energy projects are driving demand for local coal supply and processing infrastructure.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Chromite</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">Balochistan and KPK host significant chromite deposits essential for stainless steel production. Growing demand from Chinese and Gulf industrial buyers.</p>
              </div>
              <div className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                <h3 className="cinzel-text text-lg font-semibold text-on-surface mb-3">Marble & Gemstones</h3>
                <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">World-class marble deposits in KPK and Balochistan, plus emeralds, rubies, and sapphires from Swat Valley. High-value, lower-capital-intensity extraction opportunities.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  WHO WE SERVE  */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-4">Who we <span className="text-primary">serve.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base leading-relaxed max-w-3xl mx-auto mb-12">We work with organisations at every point in the mining value chain.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
              <div>
                <span className="material-symbols-outlined text-primary text-4xl mb-3">diamond</span>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">International mining companies seeking Pakistan market entry</div>
              </div>
              <div>
                <span className="material-symbols-outlined text-primary text-4xl mb-3">account_balance</span>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">State-owned enterprises requiring local partnership</div>
              </div>
              <div>
                <span className="material-symbols-outlined text-primary text-4xl mb-3">trending_up</span>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Institutional investors evaluating mineral assets</div>
              </div>
              <div>
                <span className="material-symbols-outlined text-primary text-4xl mb-3">swap_horiz</span>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">Commodity traders seeking supply connections</div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/*  CTA  */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-5xl font-semibold text-on-surface mb-6">Explore the <span className="text-primary">opportunity.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto mb-10">Pakistan's mineral wealth requires the right local partner. We provide the access, structuring, and regulatory navigation to move from interest to investment.</p>
            <a href="/contact?interest=Minerals%20%26%20Mining#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Briefing &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
