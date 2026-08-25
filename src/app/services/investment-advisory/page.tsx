'use client';
// @ts-nocheck

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface SectorData {
  name: string;
  thesis: string;
  drivers: string[];
  structures: string[];
  metrics: { marketSize: number; growth: number; competition: number; regulatory: number };
  investment: string;
  timeline: string;
  risk: string;
}

const sectorsList: SectorData[] = [
  { name: 'Minerals', thesis: 'Pakistan holds over $1 trillion in untapped mineral reserves across copper, gold, coal, rare earths, and gemstones. Balochistan, KPK, and Gilgit-Baltistan offer generational exploration opportunities. CPEC infrastructure is unlocking previously inaccessible deposits, creating a narrow window for early-mover advantage before institutional capital crowds the space.', drivers: ['CPEC infrastructure unlocking deposits', 'Rising global commodity prices', 'Provincial licensing reform', 'Chinese JV demand'], structures: ['Joint Venture', 'Exploration License', 'Streaming / Royalty'], metrics: { marketSize: 95, growth: 85, competition: 40, regulatory: 70 }, investment: '$5M \u2013 $50M', timeline: '3 \u2013 7 years', risk: 'Medium-High' },
  { name: 'Real Estate', thesis: 'Urbanisation, diaspora remittances, and CPEC Special Economic Zones are driving sustained demand across commercial, residential, and industrial real estate. Gwadar, Islamabad, and Lahore present distinct risk-return profiles. The sector offers tangible collateral and proven capital appreciation in a market with limited institutional competition.', drivers: ['CPEC SEZ development', 'Diaspora investment demand', 'Rapid urbanisation', 'Limited institutional supply'], structures: ['Joint Venture', 'Greenfield Development', 'Acquisition'], metrics: { marketSize: 90, growth: 75, competition: 80, regulatory: 50 }, investment: '$2M \u2013 $25M', timeline: '2 \u2013 5 years', risk: 'Medium' },
  { name: 'Textiles', thesis: "Pakistan is the world\u2019s fourth-largest textile exporter with a deeply fragmented supply chain. International buyers increasingly seek compliant, vertically integrated sourcing partners. Opportunities exist in value-added manufacturing, sustainable textiles, and export consolidation serving EU and Gulf markets.", drivers: ['EU GSP+ trade access', 'Sustainability compliance demand', 'Supply chain diversification from China', 'Low labour costs'], structures: ['Joint Venture', 'Contract Manufacturing', 'Acquisition'], metrics: { marketSize: 85, growth: 65, competition: 75, regulatory: 45 }, investment: '$1M \u2013 $15M', timeline: '2 \u2013 4 years', risk: 'Medium' },
  { name: 'Technology', thesis: "Pakistan\u2019s IT exports exceed $2.6 billion annually, with a young, English-speaking developer workforce. Government digitisation programmes and the fintech revolution are creating domestic demand, while global staff augmentation and SaaS opportunities offer dollar-denominated revenue streams with minimal capital intensity.", drivers: ['Government digitisation push', 'Fintech regulatory reform', 'Young developer talent pool', 'Dollar-denominated exports'], structures: ['Equity Investment', 'Greenfield', 'Strategic Partnership'], metrics: { marketSize: 70, growth: 90, competition: 65, regulatory: 35 }, investment: '$500K \u2013 $10M', timeline: '1 \u2013 3 years', risk: 'Low-Medium' },
  { name: 'Agriculture', thesis: "Agriculture contributes 23% of Pakistan\u2019s GDP and employs 37% of the labour force, yet remains underinvested in cold chain, processing, and modern farming techniques. Opportunities in agri-tech, food processing, organic exports, and water management offer high social impact alongside strong commercial returns.", drivers: ['Food security national priority', 'Agri-tech adoption gap', 'Export demand for organic produce', 'Cold chain infrastructure deficit'], structures: ['Joint Venture', 'Greenfield', 'Public-Private Partnership'], metrics: { marketSize: 88, growth: 70, competition: 55, regulatory: 45 }, investment: '$1M \u2013 $20M', timeline: '2 \u2013 5 years', risk: 'Medium' },
  { name: 'Pharmaceuticals', thesis: "Pakistan\u2019s pharmaceutical market is valued at over $4 billion, growing at 12% annually. A 220-million-person domestic market, rising healthcare awareness, and export potential to Central Asia and Africa present compelling opportunities in generics manufacturing, API production, and biotech.", drivers: ['220M domestic population', 'Rising healthcare spend', 'Generics export potential', 'API localisation incentives'], structures: ['Acquisition', 'Joint Venture', 'Licensing'], metrics: { marketSize: 72, growth: 78, competition: 60, regulatory: 75 }, investment: '$3M \u2013 $30M', timeline: '3 \u2013 6 years', risk: 'Medium-High' },
  { name: 'Aviation', thesis: "Pakistan\u2019s aviation sector is underserved relative to population and geography. Private charter, executive transport, and CPEC-related logistics represent immediate opportunities. Regulatory modernisation and tourism growth are expected to further expand demand for both commercial and private aviation services.", drivers: ['CPEC executive logistics demand', 'Underserved private charter market', 'Tourism sector growth', 'Medical evacuation gaps'], structures: ['Greenfield', 'Joint Venture', 'Operational Lease'], metrics: { marketSize: 45, growth: 60, competition: 30, regulatory: 80 }, investment: '$5M \u2013 $40M', timeline: '2 \u2013 5 years', risk: 'High' },
  { name: 'Construction', thesis: 'Pakistan faces a housing deficit of over 10 million units and requires massive infrastructure investment across roads, bridges, dams, and industrial zones. CPEC Phase II, government housing schemes, and provincial development budgets are creating a sustained pipeline of large-scale construction opportunities.', drivers: ['10M+ housing deficit', 'CPEC Phase II infrastructure', 'Government housing schemes', 'Provincial development budgets'], structures: ['Joint Venture', 'EPC Contract', 'Public-Private Partnership'], metrics: { marketSize: 82, growth: 72, competition: 70, regulatory: 60 }, investment: '$3M \u2013 $30M', timeline: '2 \u2013 5 years', risk: 'Medium' },
  { name: 'Tourism', thesis: "Pakistan\u2019s northern areas, cultural heritage sites, and religious tourism circuits represent a largely untapped hospitality market. International media coverage has shifted perception, and government visa liberalisation is accelerating inbound tourism. Hotel, resort, and adventure tourism infrastructure remain critically undersupplied.", drivers: ['Visa liberalisation policy', 'International media exposure', 'Religious tourism circuits', 'Adventure tourism demand'], structures: ['Greenfield', 'Joint Venture', 'Management Contract'], metrics: { marketSize: 50, growth: 82, competition: 25, regulatory: 40 }, investment: '$2M \u2013 $20M', timeline: '3 \u2013 6 years', risk: 'Medium' }
];

export default function InvestmentAdvisoryPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [barHeights, setBarHeights] = useState({ marketSize: 0, growth: 0, competition: 0, regulatory: 0 });

  const selectSector = useCallback((idx: number) => {
    if (idx === currentIndex && barHeights.marketSize > 0) return;
    setBarHeights({ marketSize: 0, growth: 0, competition: 0, regulatory: 0 });
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex(idx);
      setIsFading(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const s = sectorsList[idx];
          setBarHeights({ marketSize: s.metrics.marketSize, growth: s.metrics.growth, competition: s.metrics.competition, regulatory: s.metrics.regulatory });
        });
      });
    }, 300);
  }, [currentIndex, barHeights.marketSize]);

  useEffect(() => {
    const s = sectorsList[0];
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBarHeights({ marketSize: s.metrics.marketSize, growth: s.metrics.growth, competition: s.metrics.competition, regulatory: s.metrics.regulatory });
      });
    });
  }, []);

  const sector = sectorsList[currentIndex];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Investment-Advisory.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Strategy &amp; Analysis</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Investment<br /><span className="text-primary">Advisory.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Data-driven investment advisory across the UK and international markets — feasibility studies, market analysis, financial modelling, opportunity identification, and strategic guidance across all sectors.
            </p>
            <Link href="/contact?interest=Investment%20Advisory#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Get Advisory &rarr;
            </Link>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Sector Opportunity Matrix */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Sector opportunity <span className="text-primary">matrix.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-10">CZAAH&apos;s proprietary assessment of Pakistan&apos;s investment landscape, one of our core advisory markets — evaluating market depth, growth trajectory, competitive dynamics, and regulatory environment across nine priority sectors.</p>

            <div className="flex flex-wrap gap-3 mb-10">
              {sectorsList.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => selectSector(i)}
                  className={`raleway-text text-sm font-medium px-5 py-2.5 border transition-all duration-300 ${
                    currentIndex === i
                      ? 'liquid-gold-bg text-on-primary border-primary font-semibold'
                      : 'bg-transparent border-primary/25 text-on-surface-variant/60 hover:border-primary hover:text-on-surface'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div className={`flex flex-wrap gap-10 border border-primary/15 bg-surface-container-lowest/50 p-10 transition-opacity duration-400 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <div className="flex-[0_0_60%] min-w-0 max-md:flex-[1_1_100%]">
                <div className="cinzel-text text-3xl text-primary mb-4">{sector.name}</div>
                <p className="raleway-text text-on-surface-variant/65 text-sm leading-[1.7] mb-6">{sector.thesis}</p>
                <div className="mb-5">
                  <div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant/35 mb-2">Key Drivers</div>
                  <div className="flex flex-wrap gap-2">
                    {sector.drivers.map((d, i) => (
                      <span key={i} className="raleway-text text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20">{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant/35 mb-2">Recommended Entry Structures</div>
                  <div className="flex flex-wrap gap-2">
                    {sector.structures.map((st, i) => (
                      <span key={i} className="raleway-text text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20">{st}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-[0_0_calc(40%-40px)] flex gap-6 justify-center items-end pb-5 max-md:flex-[1_1_100%] max-md:pt-5 max-md:border-t max-md:border-primary/10">
                {[
                  { key: 'marketSize', label: 'Market Size' },
                  { key: 'growth', label: 'Growth Rate' },
                  { key: 'competition', label: 'Competitive Intensity' },
                  { key: 'regulatory', label: 'Regulatory Complexity' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div className="w-2 h-[180px] max-md:h-[120px] bg-on-surface/5 relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-primary to-primary/70 transition-[height] duration-600 ease-out" style={{ height: `${barHeights[key as keyof typeof barHeights]}%` }} />
                    </div>
                    <div className="raleway-text text-sm font-semibold text-primary">{sector.metrics[key as keyof typeof sector.metrics]}</div>
                    <div className="raleway-text text-[0.68rem] text-on-surface-variant/40 text-center max-w-[60px] leading-tight">{label}</div>
                  </div>
                ))}
              </div>

              <div className="basis-full flex gap-8 flex-wrap mt-4 pt-5 border-t border-primary/10">
                <div><div className="raleway-text text-[0.7rem] uppercase tracking-[0.08em] text-on-surface-variant/35 mb-1">Minimum Investment</div><div className="raleway-text text-sm text-on-surface font-medium">{sector.investment}</div></div>
                <div><div className="raleway-text text-[0.7rem] uppercase tracking-[0.08em] text-on-surface-variant/35 mb-1">Typical Timeline</div><div className="raleway-text text-sm text-on-surface font-medium">{sector.timeline}</div></div>
                <div><div className="raleway-text text-[0.7rem] uppercase tracking-[0.08em] text-on-surface-variant/35 mb-1">Risk Profile</div><div className="raleway-text text-sm text-on-surface font-medium">{sector.risk}</div></div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Institutional-grade advisory services — from initial opportunity identification through to ongoing strategic guidance.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'query_stats', title: 'Feasibility Studies', desc: 'Comprehensive market and financial feasibility for proposed investments. We assess viability, project costs, revenue potential, and regulatory requirements before you commit capital.' },
                { icon: 'monitoring', title: 'Market Analysis', desc: 'Sector research, competitor mapping, demand forecasting, regulatory landscape. Our analysts provide the granular, on-the-ground intelligence that international databases cannot capture.' },
                { icon: 'calculate', title: 'Financial Modelling', desc: 'Revenue projections, IRR analysis, sensitivity testing, capital structuring. Rigorous financial models built with local cost data and realistic assumptions for each market we cover.' },
                { icon: 'lightbulb', title: 'Opportunity Identification', desc: 'Proactive deal sourcing across minerals, real estate, technology, textiles, pharmaceuticals, and agriculture in Pakistan, plus opportunities across our UK and international markets. We surface opportunities that match your investment thesis and risk appetite.' },
                { icon: 'warning', title: 'Risk Assessment', desc: "Political, regulatory, currency, and operational risk evaluation with mitigation strategies. We quantify risks that other advisors treat as unknowns — because we operate inside the system." },
                { icon: 'strategy', title: 'Strategic Advisory', desc: "Board-level guidance on market entry, expansion, and portfolio strategy across the UK and international markets. Whether you're making your first investment or scaling an existing position, we provide the strategic clarity you need." },
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

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Stats */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Advisory capability <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ number: '9', label: 'Pakistan sectors covered' }, { number: '$300B+', label: 'Addressable market' }, { number: 'UK · PK · UAE', label: 'Markets covered' }, { number: 'Institutional', label: 'Advisory grade' }].map((stat, i) => (
                <div key={i}><div className="cinzel-text text-3xl md:text-4xl text-primary mb-2">{stat.number}</div><div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div></div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Why CZAAH */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Why <span className="text-primary">CZAAH.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Our advisory is built on real operational experience across our key markets — not theoretical analysis from a distance.</p>
            <div className="space-y-4">
              {[
                { icon: 'hub', title: 'Cross-Sector Expertise', desc: 'Advisory coverage spanning minerals, real estate, technology, textiles, pharmaceuticals, agriculture, aviation, government, and security. We understand how sectors interconnect and where the real opportunities lie.' },
                { icon: 'pin_drop', title: 'On-the-Ground Intelligence', desc: 'Our teams operate from London and Islamabad with international reach, providing real-time market intelligence that generic advisory firms simply cannot access. We know the players, the regulations, and the unwritten rules.' },
                { icon: 'school', title: 'Institutional Methodology', desc: 'Our advisory process follows institutional standards — structured frameworks, auditable models, and documented assumptions. The quality of work you expect from a global advisory firm, with the depth of a local operator.' },
                { icon: 'diversity_3', title: 'Network Advantage', desc: 'Advisory backed by relationships across government, industry, and finance. When we assess an opportunity, we can validate assumptions directly with the stakeholders who matter — not rely on secondary sources.' },
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

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Informed decisions in <span className="text-primary">complex markets.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Feasibility, financial modelling, and strategic guidance &mdash; grounded in real operational experience across the UK and our international markets.</p>
            <Link href="/contact?interest=Investment%20Advisory#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Request an Assessment &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
