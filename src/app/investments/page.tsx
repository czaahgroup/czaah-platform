'use client'
// @ts-nocheck

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function InvestmentsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const dealsRef = useRef<HTMLDivElement>(null)

  const deals = [
    { sector: 'minerals' },
    { sector: 'minerals' },
    { sector: 'realestate' },
    { sector: 'technology' },
    { sector: 'agriculture' },
    { sector: 'pharma' },
    { sector: 'textiles' },
    { sector: 'construction' },
    { sector: 'tourism' },
    { sector: 'minerals' },
  ]

  const visibleCount = activeFilter === 'all'
    ? deals.length
    : deals.filter(d => d.sector === activeFilter).length

  function filterDeals(filter: string) {
    setActiveFilter(filter)
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible') })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const filterButtons = [
    { key: 'all', label: 'All Sectors' },
    { key: 'minerals', label: 'Minerals' },
    { key: 'realestate', label: 'Real Estate' },
    { key: 'technology', label: 'Technology' },
    { key: 'agriculture', label: 'Agriculture' },
    { key: 'pharma', label: 'Pharma' },
    { key: 'textiles', label: 'Textiles' },
    { key: 'construction', label: 'Construction' },
    { key: 'tourism', label: 'Tourism' },
  ]

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">

        {/* HERO */}
        <section className="relative min-h-[60dvh] md:min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Investments.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-xs tracking-[0.15em] uppercase text-on-surface-variant hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="h-px w-16 bg-primary mb-8"></div>
            <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">Investment Opportunities</p>
            <h1 className="cinzel-text text-2xl sm:text-4xl md:text-6xl font-bold text-on-surface mb-8">Investment <span className="text-primary">Opportunities.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Pre-vetted, legally structured opportunities across the UK and our international markets &mdash; each assessed for feasibility, regulatory compliance, and investor-ready execution.</p>
            <Link href="/contact#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">View Opportunities &rarr;</Link>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* FEATURED DEAL FLOW */}
        <section className="py-32 px-8 md:px-24 bg-surface" id="iv-dealflow">
          <div className="max-w-[1600px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Active deal <span className="text-primary">flow.</span></h2>
              <p className="raleway-text text-on-surface-variant text-base max-w-[700px] mx-auto">Pre-vetted, structured investment opportunities across the UK and our international markets. Each opportunity is assessed for regulatory compliance, financial viability, and defined exit strategy.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {filterButtons.map(f => (
                <button
                  key={f.key}
                  className={`raleway-text text-xs px-5 py-2.5 border transition-all duration-300 ${activeFilter === f.key ? 'liquid-gold-bg text-on-primary border-primary font-semibold' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-on-surface bg-surface-container'}`}
                  onClick={() => filterDeals(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="text-center mb-8 raleway-text text-sm text-on-surface-variant">Showing <span className="text-primary font-medium">{visibleCount}</span> of 10 opportunities</div>

            <div className="flex flex-col gap-5" ref={dealsRef}>

              {/* PLACER GOLD */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'minerals' ? 'hidden' : ''}`} data-sector="minerals">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">diamond</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Minerals &amp; Mining</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Indus-K Placer Gold Project &mdash; Riverine Gold Extraction</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">Open</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Placer gold extraction from Pakistan&apos;s Indus river system using indigenously engineered Indus-K processing units. For millennia, Himalayan, Karakoram, and Hindukush floods have deposited gold-bearing sediments across Pakistan&apos;s riverbeds. Each Indus-K unit processes 70 tons of material daily, yielding 25 grams of 22-karat gold. Operations deploy in scalable 10-unit sectors producing 250 grams of gold per sector daily. Geophysical and geochemical studies have identified thousands of high-yield hotspots. SPV-structured with 50/50 profit share after OPEX and projected full CAPEX recovery within 36 months.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['SPV Structure', 'Placer Gold', 'Indigenous Technology', 'Indus River System'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 flex-wrap items-center">
                    <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                    <a href="/CZAAH-IndusK-Gold.pdf" download className="raleway-text text-sm font-medium text-primary px-4 py-2 border border-primary/40 hover:bg-primary/10 transition-colors inline-flex items-center gap-2">&#8681; Download Project PDF</a>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Per Sector</div><div className="raleway-text text-xl font-semibold text-primary">~$650K</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Total 10-Year Return</div><div className="raleway-text text-xl font-semibold text-on-surface">$2.43M</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">3.74x profit multiple</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Payback Period</div><div className="raleway-text text-xl font-semibold text-on-surface">~2.7 years</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '50%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Medium &mdash; Proven resource, operational tech</div></div>
                </div>
              </div>

              {/* MINERALS - Copper Gold */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'minerals' ? 'hidden' : ''}`} data-sector="minerals">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">diamond</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Minerals &amp; Mining</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Copper-Gold Exploration Licenses &mdash; Balochistan</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">Open</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Joint venture opportunity for copper-gold exploration across three licensed blocks in the Chagai District, Balochistan &mdash; the same geological belt as Reko Diq. CZAAH holds facilitation rights with the provincial Mines &amp; Minerals Department. Geological surveys completed; partner sought for drill programme financing and operational execution.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Joint Venture', 'Exploration Stage', 'Balochistan', 'Provincial License'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$5M &ndash; $25M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Projected IRR</div><div className="raleway-text text-xl font-semibold text-on-surface">25&ndash;40%</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">Post-discovery valuation uplift</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Timeline to Discovery</div><div className="raleway-text text-xl font-semibold text-on-surface">18&ndash;36 months</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '75%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">High &mdash; Exploration stage</div></div>
                </div>
              </div>

              {/* REAL ESTATE */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'realestate' ? 'hidden' : ''}`} data-sector="realestate">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">home_work</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Real Estate</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">CPEC Industrial Plots &mdash; Rashakai &amp; Allama Iqbal SEZ</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-primary/15 text-primary border border-primary/30 shrink-0">Limited</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Pre-allocated industrial plots in Pakistan&apos;s most advanced Special Economic Zones with 10-year tax holidays, customs duty exemptions, and one-window regulatory clearance. Ideal for manufacturing companies seeking to establish Pakistan operations, or investors seeking land appreciation with guaranteed tenant demand from Chinese and local firms.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Direct Purchase', 'SEZ Tax Holidays', 'KPK & Punjab', 'CPEC Corridor'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$500K &ndash; $10M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Rental Yield</div><div className="raleway-text text-xl font-semibold text-on-surface">6&ndash;8%</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">+ 15&ndash;25% capital appreciation p.a.</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Tax Holiday</div><div className="raleway-text text-xl font-semibold text-on-surface">10 years</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '35%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Low-Medium &mdash; Government-backed SEZ</div></div>
                </div>
              </div>

              {/* TECHNOLOGY */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'technology' ? 'hidden' : ''}`} data-sector="technology">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">memory</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Technology &amp; IT</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">IT Export Company Acquisition &mdash; Staff Augmentation Platform</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">Open</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Acquisition opportunity in a profitable Pakistani IT services company with 150+ engineers, established US/EU client base, and $2M+ annual revenue. Dollar-denominated revenue with PKR cost base creates exceptional margin structure. Special Technology Zone registration provides additional tax benefits.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Acquisition', 'USD Revenue', 'Lahore STZ', 'Profitable'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$2M &ndash; $5M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Revenue Multiple</div><div className="raleway-text text-xl font-semibold text-on-surface">1.5&ndash;2.5x</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">Current annual revenue</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">EBITDA Margin</div><div className="raleway-text text-xl font-semibold text-on-surface">30&ndash;35%</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '40%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Medium &mdash; Established business</div></div>
                </div>
              </div>

              {/* AGRICULTURE */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'agriculture' ? 'hidden' : ''}`} data-sector="agriculture">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">eco</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Agriculture</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Cold Chain &amp; Food Processing &mdash; Punjab Agri Corridor</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">Open</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Greenfield cold storage and food processing facility targeting Pakistan&apos;s $5B+ agricultural export market. 30&ndash;40% of Pakistani produce is wasted due to inadequate cold chain infrastructure &mdash; addressing this gap with modern blast freezing, controlled atmosphere storage, and export-grade packaging for rice, mangoes, citrus, and dairy.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Greenfield', 'Export-Oriented', 'Punjab', 'Infrastructure Gap'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$3M &ndash; $15M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Projected IRR</div><div className="raleway-text text-xl font-semibold text-on-surface">18&ndash;28%</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">Year 3 onwards at capacity</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Payback Period</div><div className="raleway-text text-xl font-semibold text-on-surface">3&ndash;4 years</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '50%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Medium &mdash; Proven demand, new build</div></div>
                </div>
              </div>

              {/* PHARMA */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'pharma' ? 'hidden' : ''}`} data-sector="pharma">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">medication</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Pharmaceuticals</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Generic Drug Manufacturing JV &mdash; WHO GMP Certified Facility</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-primary/15 text-primary border border-primary/30 shrink-0">Limited</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Joint venture with an established Pakistani pharmaceutical manufacturer (WHO GMP certified, 800+ product registrations) seeking capital for capacity expansion and Africa/Central Asia export push. Factory operational, DRAP licenses active, distribution networks in place. Partner sought for $8M expansion programme to triple export capacity.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Joint Venture', 'WHO GMP', 'Export Expansion', 'Operational'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$5M &ndash; $12M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Market Growth</div><div className="raleway-text text-xl font-semibold text-on-surface">12% p.a.</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">$4B+ domestic market</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Export Target</div><div className="raleway-text text-xl font-semibold text-on-surface">$25M by Y3</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '35%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Low-Medium &mdash; Operational facility</div></div>
                </div>
              </div>

              {/* TEXTILES */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'textiles' ? 'hidden' : ''}`} data-sector="textiles">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">checkroom</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Textiles &amp; Trade</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Denim Export Trading House &mdash; GSP+ EU Market Access</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">Open</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Trading company aggregating Pakistani denim production for European buyers under GSP+ zero-duty access. Partner mills in Faisalabad and Lahore with combined capacity of 5M metres/month. OEKO-TEX and GOTS certified supply chain. Seeking investment to scale order book and establish EU distribution presence.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Trading Company', 'GSP+ Access', 'Internationally Structured', 'USD Revenue'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$1M &ndash; $5M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Trading Margin</div><div className="raleway-text text-xl font-semibold text-on-surface">8&ndash;12%</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">On USD-denominated orders</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Order Pipeline</div><div className="raleway-text text-xl font-semibold text-on-surface">$15M+</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '30%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Low &mdash; Established mills, confirmed buyers</div></div>
                </div>
              </div>

              {/* CONSTRUCTION */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'construction' ? 'hidden' : ''}`} data-sector="construction">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">apartment</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Construction</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Commercial Tower Development &mdash; Blue Area, Islamabad</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-primary/15 text-primary border border-primary/30 shrink-0">Limited</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Grade-A commercial tower in Islamabad&apos;s prime business district. 18-storey mixed-use development with pre-leasing interest from multinational tenants and embassy offices. CDA-approved plans, foundation works underway. Seeking co-investment for construction completion and anchor tenant fit-out.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Co-Investment', 'CDA Approved', 'Pre-Leased 40%', 'Blue Area'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$10M &ndash; $30M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Rental Yield</div><div className="raleway-text text-xl font-semibold text-on-surface">7&ndash;9%</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">Grade-A Islamabad rates</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Completion</div><div className="raleway-text text-xl font-semibold text-on-surface">24 months</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '40%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Medium &mdash; Under construction, pre-leased</div></div>
                </div>
              </div>

              {/* TOURISM */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'tourism' ? 'hidden' : ''}`} data-sector="tourism">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">landscape</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Tourism &amp; Hospitality</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Boutique Hotel &amp; Eco-Lodge &mdash; Hunza Valley</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-on-surface/10 text-on-surface-variant border border-on-surface/15 shrink-0">Coming Soon</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Boutique hospitality development in Pakistan&apos;s most in-demand tourism destination. 40-room eco-lodge with panoramic Rakaposhi views, designed to international boutique hotel standards. Land secured, feasibility complete, architectural plans in progress. Pakistan&apos;s hotel deficit (under 5,000 branded rooms for 240M people) ensures strong occupancy.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Greenfield', 'Tourism Boom', 'Hunza Valley', 'Eco-Tourism'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Register Interest &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$2M &ndash; $8M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Tourism Growth</div><div className="raleway-text text-xl font-semibold text-on-surface">300%+</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">Recent years, accelerating</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Occupancy Target</div><div className="raleway-text text-xl font-semibold text-on-surface">75%+ Y2</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '55%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Medium &mdash; New market, strong demand</div></div>
                </div>
              </div>

              {/* MINERALS 2 - Marble */}
              <div className={`grid lg:grid-cols-[1fr_340px] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 ${activeFilter !== 'all' && activeFilter !== 'minerals' ? 'hidden' : ''}`} data-sector="minerals">
                <div className="p-8 lg:p-10 flex flex-col">
                  <div className="flex items-start gap-4 mb-4 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-2xl w-12 h-12 flex items-center justify-center bg-primary/10 shrink-0">diamond</span>
                    <div className="flex-1 min-w-0">
                      <div className="raleway-text text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-1">Minerals &amp; Mining</div>
                      <div className="cinzel-text text-xl font-semibold text-on-surface leading-tight">Marble &amp; Granite Quarry &mdash; Export-Grade Processing</div>
                    </div>
                    <span className="raleway-text text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">Open</span>
                  </div>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">Operational marble quarry in KPK with existing extraction license and road access. Investment sought for modern cutting and polishing plant to produce export-grade slabs for Gulf and European markets. Pakistan has the world&apos;s largest onyx reserves and significant marble deposits &mdash; currently exported mostly as raw blocks at minimal value-add.</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {['Operational Asset', 'Value-Add Processing', 'KPK', 'Export Revenue'].map(t => (
                      <span key={t} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2.5 py-1 bg-on-surface/5 text-on-surface-variant">{t}</span>
                    ))}
                  </div>
                  <Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Request Information Memorandum &rarr;</Link>
                </div>
                <div className="bg-surface-container-lowest p-8 lg:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/10">
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Investment Range</div><div className="raleway-text text-xl font-semibold text-primary">$1M &ndash; $5M</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Projected IRR</div><div className="raleway-text text-xl font-semibold text-on-surface">20&ndash;30%</div><div className="raleway-text text-[11px] text-on-surface-variant mt-0.5">With processing plant</div></div>
                  <div className="mb-5"><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Payback</div><div className="raleway-text text-xl font-semibold text-on-surface">2&ndash;3 years</div></div>
                  <div><div className="raleway-text text-[10px] font-semibold tracking-[0.1em] uppercase text-on-surface-variant mb-1">Risk Profile</div><div className="h-1 bg-outline-variant/20 mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: '45%' }}></div></div><div className="raleway-text text-[11px] text-on-surface-variant mt-1">Medium &mdash; Operational quarry, new plant</div></div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* INVESTMENT PROCESS */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Investment <span className="text-primary">process.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-[700px] mx-auto mb-12">Every opportunity follows our rigorous five-stage pipeline &mdash; from initial identification through to exit strategy.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-outline-variant/10 border border-outline-variant/10 stagger">
              {[
                { num: '01', name: 'Source', desc: 'Opportunity identification through our network, regulatory contacts, and sector intelligence' },
                { num: '02', name: 'Assess', desc: 'Financial modelling, legal due diligence, regulatory review, and risk assessment' },
                { num: '03', name: 'Structure', desc: 'SPV formation, investment terms, governance framework, and compliance architecture' },
                { num: '04', name: 'Deploy', desc: 'Capital deployment, operational launch, and ongoing performance monitoring' },
                { num: '05', name: 'Report', desc: 'Quarterly reporting, milestone tracking, and strategic exit planning' },
              ].map((step, i) => (
                <div key={i} className="bg-surface-container p-8 text-center hover:bg-surface transition-colors duration-300">
                  <div className="cinzel-text text-3xl font-bold text-primary mb-2">{step.num}</div>
                  <div className="cinzel-text text-sm font-semibold text-on-surface mb-2">{step.name}</div>
                  <div className="raleway-text text-xs text-on-surface-variant leading-relaxed">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* WHY PAKISTAN */}
        <section className="py-32 px-8 md:px-24 bg-surface text-center fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Why <span className="text-primary">Pakistan.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-[700px] mx-auto mb-12">A convergence of untapped resources, demographic scale, preferential trade access, and infrastructure investment is creating a generational opportunity.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline-variant/10 border border-outline-variant/10 stagger">
              {[
                { number: '$1T+', label: 'Mineral Reserves', desc: 'Copper, gold, rare earths, coal \u2014 largely unexplored' },
                { number: '240M', label: 'Consumer Market', desc: '5th largest population, growing middle class' },
                { number: 'GSP+', label: 'EU Market Access', desc: 'Zero-duty exports to the European Union' },
                { number: '$65B', label: 'CPEC Investment', desc: '9 Special Economic Zones, motorways, ports' },
                { number: '64%', label: 'Under 30', desc: "One of the world's youngest workforces" },
                { number: '$3.2B', label: 'IT Exports', desc: 'Growing 20%+ annually, dollar-denominated' },
                { number: '300%', label: 'Tourism Growth', desc: "World's next frontier destination" },
                { number: '10M+', label: 'Housing Deficit', desc: 'Massive construction and real estate demand' },
              ].map((item, i) => (
                <div key={i} className="bg-surface-container p-8 text-center hover:bg-surface-container-lowest transition-colors duration-300">
                  <div className="cinzel-text text-3xl font-bold text-primary mb-1">{item.number}</div>
                  <div className="raleway-text text-xs font-semibold tracking-[0.06em] uppercase text-on-surface-variant mb-2">{item.label}</div>
                  <div className="raleway-text text-xs text-on-surface-variant/60 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* INVESTOR PROFILES */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Who we <span className="text-primary">serve.</span></h2>
              <p className="raleway-text text-on-surface-variant text-base max-w-[700px] mx-auto">We structure opportunities for a range of investor profiles, each with tailored access, structures, and reporting.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 stagger">
              {[
                { icon: 'account_balance', title: 'Institutional Investors', desc: 'Sovereign funds, PE firms, and family offices seeking structured emerging market exposure with institutional-grade governance, quarterly reporting, and defined exit timelines.', tags: ['SPV Structures', 'Pooled Vehicles', 'Board Seats'] },
                { icon: 'corporate_fare', title: 'Multinational Corporations', desc: 'Companies evaluating Pakistan market entry or supply chain diversification with on-the-ground facilitation, regulatory navigation, and JV partnership structuring.', tags: ['Joint Ventures', 'Direct Investment', 'Market Entry'] },
                { icon: 'groups', title: 'Diaspora Investors', desc: 'Overseas Pakistanis (UAE, UK, US, Gulf) seeking home market investment with international standards, transparent reporting, and USD-denominated structures through our international operations.', tags: ['Internationally Structured', 'Deal-by-Deal', 'USD Denominated'] },
                { icon: 'person', title: 'High-Net-Worth Individuals', desc: "Private investors seeking portfolio diversification into Pakistan's high-growth sectors with curated deal flow, dedicated advisory, and flexible entry sizes.", tags: ['Direct Investment', 'Co-Investment', 'Streaming Deals'] },
              ].map((profile, i) => (
                <div key={i} className="bg-surface-container border border-outline-variant/10 hover:border-primary/30 p-10 transition-all duration-500 relative group">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="material-symbols-outlined text-primary text-3xl mb-5 block">{profile.icon}</span>
                  <h4 className="cinzel-text text-lg font-bold text-on-surface mb-3">{profile.title}</h4>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-4">{profile.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {profile.tags.map(tag => (
                      <span key={tag} className="raleway-text text-[10px] font-medium tracking-[0.05em] uppercase px-2 py-1 bg-primary/10 text-primary">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface text-center fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Explore the current <span className="text-primary">pipeline.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">Institutional capital or private portfolio &mdash; each opportunity is structured with the access, oversight, and compliance your investment requires.</p>
            <Link href="/contact#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request Deal Access &rarr;</Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
