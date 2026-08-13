'use client'
// @ts-nocheck

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const sectorCards = [
  { name: 'Minerals & Mining', icon: 'diamond', description: 'Access Pakistan\'s $1T+ in untapped mineral reserves — copper, gold, rare earths, coal, and gemstones across Balochistan, KPK, and Gilgit-Baltistan.', tag: '$1T+ Reserves', slug: 'minerals' },
  { name: 'Real Estate', icon: 'location_city', description: 'International real estate across the UK, UAE, and Pakistan — London commercial property, Dubai freehold investments, and Pakistan\'s CPEC growth corridors, with structured, transparent investment vehicles.', tag: 'UK · UAE · Pakistan', slug: 'realestate' },
  { name: 'Construction & Development', icon: 'architecture', description: 'Civil infrastructure, commercial buildings, and Special Economic Zone development across Pakistan, the UK, and the Gulf — including CPEC corridor projects, delivered through trusted construction partners.', tag: 'Infrastructure', slug: 'construction' },
  { name: 'Human Resources', icon: 'groups', description: 'Access Pakistan\'s 70M+ workforce — deployment across the Gulf, UK, Europe, and the Balkans, plus domestic staffing, executive search, trade testing, and HR advisory services.', tag: 'Gulf · UK · EU', slug: 'manpower' },
  { name: 'Textiles & Trade', icon: 'storefront', description: 'Source from the world\'s 4th largest textile exporter — certified, compliant, and competitively priced. Denim, knitwear, home textiles, and sportswear.', tag: '4th Global Exporter', slug: 'textiles' },
  { name: 'Technology & IT', icon: 'memory', description: 'Enter Pakistan\'s $3.2B+ IT sector — government digital transformation partnerships and access to 500,000+ skilled technology professionals.', tag: '$3.2B+ Sector', slug: 'technology' },
  { name: 'Agriculture', icon: 'grass', description: 'Pakistan\'s agricultural sector accounts for 23% of GDP. Large-scale farming, organic food production, and food processing — vast fertile land and growing export demand.', tag: '23% of GDP', slug: 'agriculture' },
  { name: 'Pharmaceuticals', icon: 'medication', description: 'A $4B+ market growing at 12% annually. Medicine production, medical supply chains, and healthcare manufacturing with access to 230M+ domestic consumers.', tag: '$4B+ Market', slug: 'pharmaceuticals' },
  { name: 'Engineering & Energy', icon: 'bolt', description: 'HVAC systems, elevators, escalators, power generation, civil works, solar panels, and industrial air conditioning solutions across Pakistan.', tag: '8 Disciplines', slug: 'engineering' },
  { name: 'Aviation', icon: 'flight', description: 'Premium private charter and executive transport across Pakistan. Corporate travel, site access flights, medical evacuation, and VIP delegation logistics.', tag: 'Private Charter', slug: 'aviation' },
  { name: 'Tourism & Hospitality', icon: 'travel_explore', description: 'Luxury hotel investment, destination management, and adventure expeditions across the Karakoram, Hindukush, and Pakistan\'s ancient heritage sites.', tag: 'Destination Mgmt', slug: 'tourism' },
  { name: 'Luxury Car Rentals', icon: 'directions_car', description: 'Premium executive chauffeur services, armoured transport, corporate fleet management, and VIP delegation logistics across Pakistan, the Gulf, and the UK.', tag: 'Executive Fleet', slug: 'luxury-rentals' },
  { name: 'Education', icon: 'school', description: 'University partnerships, campus development, vocational training, and EdTech deployment across Pakistan\'s $8B+ education market.', tag: '230M Population', slug: 'education' },
] as const

const serviceCards = [
  { icon: 'gavel', model: 'Setup & Registration', title: 'Business Setup', description: 'Company registration through SECP, corporate structuring, legal documentation, and entity formation for foreign and overseas investors.', slug: 'business-setup' },
  { icon: 'verified_user', model: 'Government & Regulatory', title: 'Licensing & Compliance', description: 'Assistance with FBR registration, Board of Investment approvals, industry licensing, and provincial regulatory requirements.', slug: 'licensing' },
  { icon: 'local_shipping', model: 'International Trade', title: 'Import & Export', description: 'Trade documentation, customs clearance, global supplier connections, and export management through our international trade network.', slug: 'import-export' },
  { icon: 'shield', model: 'Risk & Protection', title: 'Investor Protection', description: 'Legal contracts, project verification, investment due diligence, insurance facilitation, and transparent financial reporting at every stage.', slug: 'investor-protection' },
  { icon: 'insights', model: 'Strategy & Analysis', title: 'Investment Advisory', description: 'Feasibility studies, market opportunity mapping, financial modelling, and strategic guidance for verified investment opportunities across all sectors.', slug: 'investment-advisory' },
  { icon: 'handshake', model: 'Local Expertise', title: 'Partnership Development', description: 'Connection with government departments, legal experts, developers, financial institutions, and industrial partners for safe, transparent investment.', slug: 'partnership-development' },
  { icon: 'flight_takeoff', model: 'Residency & Citizenship', title: 'Investment Migration', description: 'Residency and citizenship by investment programmes, visa facilitation, and immigration advisory for investors, executives, and their families across leading global jurisdictions.', slug: 'investment-migration' },
] as const

const verticals = [
  { num: '01', name: 'Minerals & Mining', model: 'Advisory · Access · Deal Structuring', description: 'Navigate Pakistan\'s complex mining regulatory landscape. We facilitate exploration licensing, joint ventures, and connect producers with international buyers.', slug: 'minerals', coreFocus: true },
  { num: '02', name: 'Real Estate', model: 'UK · UAE · Pakistan', description: 'International real estate across London commercial property, Dubai freehold investments, and Pakistan\'s CPEC Special Economic Zones — structured, transparent investment vehicles.', slug: 'realestate', coreFocus: true },
  { num: '03', name: 'Technology & IT', model: 'Market Entry · Talent · Digital', description: 'Enter Pakistan\'s booming tech sector — government IT partnerships for enterprise vendors, and access to 500,000+ skilled professionals for global firms.', slug: 'technology', coreFocus: false },
  { num: '04', name: 'Textiles & Trade', model: 'Sourcing · Compliance · Export', description: 'Source certified Pakistani textiles for EU, US, and Gulf markets. Full compliance handling — OEKO-TEX, GOTS, Better Cotton — with GSP+ zero-duty EU access.', slug: 'textiles', coreFocus: false },
  { num: '05', name: 'Agriculture', model: 'Farming · Organic · Processing', description: 'Pakistan\'s agricultural sector is 23% of GDP with massive modernisation potential. Large-scale farming, organic food production, and cold chain infrastructure.', slug: 'agriculture', coreFocus: false },
  { num: '06', name: 'Pharmaceuticals', model: 'Manufacturing · Healthcare · Export', description: 'A $4B+ market growing at 12% annually. Generic drug manufacturing, API production, and healthcare infrastructure with access to 230M+ consumers.', slug: 'pharmaceuticals', coreFocus: false },
  { num: '07', name: 'Construction & Development', model: 'Pakistan · UK · Gulf', description: 'Civil infrastructure, commercial buildings, and Special Economic Zone development across Pakistan, the UK, and the Gulf — including CPEC corridor projects, delivered through trusted construction partners.', slug: 'construction', coreFocus: true },
  { num: '08', name: 'Engineering & Energy', model: 'HVAC · Solar · Power · Civil', description: 'Comprehensive engineering services — HVAC, elevators, escalators, power generation, civil works, solar panels, and industrial air conditioning solutions.', slug: 'engineering', coreFocus: false },
  { num: '09', name: 'Aviation', model: 'Charter · Logistics · Executive', description: 'Premium private charter and executive transport across Pakistan and the Gulf. Site access flights, medical evacuation, and VIP delegation logistics.', slug: 'aviation', coreFocus: false },
  { num: '10', name: 'Human Resources', model: 'Gulf · UK · Europe', description: 'Access Pakistan\'s 70M+ workforce — deployment across the Gulf, UK, Europe, and the Balkans, plus domestic staffing, executive search, trade testing, and comprehensive HR advisory services.', slug: 'manpower', coreFocus: false },
  { num: '11', name: 'Tourism & Hospitality', model: 'Hotels · Travel · Adventure', description: 'Luxury hotel investment, destination management, and adventure expeditions across the Karakoram, Hindukush, and Pakistan\'s ancient heritage sites.', slug: 'tourism', coreFocus: false },
  { num: '12', name: 'Luxury Car Rentals', model: 'Chauffeur · Self-Drive · Prestige', description: 'Private chauffeur-driven and self-drive luxury vehicle hire — executive cars, prestige & supercars, and security & armoured vehicles across London, the UK, and selected international destinations.', slug: 'luxury-rentals', coreFocus: false },
  { num: '13', name: 'Education', model: 'Universities · EdTech · Vocational', description: 'University partnerships, campus development, vocational training, and EdTech deployment for investors entering Pakistan\'s $8B+ education market.', slug: 'education', coreFocus: false },
] as const

const statsData = [
  { flag: 'https://flagcdn.com/w80/gb.png', alt: 'United Kingdom', name: 'United Kingdom', label: 'Group headquarters — London-based international operations' },
  { flag: 'https://flagcdn.com/w80/pk.png', alt: 'Pakistan', name: 'Pakistan', label: 'On-the-ground operations across Pakistan via CZAAH Capital & Ventures' },
  { flag: 'https://flagcdn.com/w80/ae.png', alt: 'United Arab Emirates', name: 'UAE', label: 'Dubai free zone entity, Gulf capital partnerships & commodities trading' },
  { flag: 'https://flagcdn.com/w80/be.png', alt: 'Belgium', name: 'Brussels', label: 'EU regulatory hub & European institutional partnerships' },
  { flag: 'https://flagcdn.com/w80/hk.png', alt: 'Hong Kong', name: 'Hong Kong', label: 'Asia-Pacific capital markets & cross-border trade' },
  { flag: 'https://flagcdn.com/w80/cn.png', alt: 'China', name: 'Asia', label: 'CPEC partnerships & cross-border trade facilitation' },
] as const

const testimonials = [
  { quote: 'CZAAH navigated the entire SECP registration and BOI approval process for our Pakistan subsidiary in under three weeks. Their regulatory relationships saved us months of delays.', author: 'Senior Partner', role: 'Gulf-based Investment Fund' },
  { quote: 'We needed a trusted local partner to evaluate mining opportunities in Balochistan. CZAAH\'s on-the-ground expertise and government access gave us the confidence to commit capital.', author: 'Director of Operations', role: 'International Mining Company' },
  { quote: 'As overseas Pakistanis, finding transparent, structured real estate investment access was impossible — until CZAAH. Their institutional structure gave us the security we needed.', author: 'Private Investor', role: 'UK-based Diaspora HNWI' },
  { quote: 'CZAAH\'s cross-party political coverage means our investments are protected regardless of which government is in power. That level of continuity is unmatched in Pakistan.', author: 'Managing Director', role: 'Saudi Family Office' },
  { quote: 'Their team secured our textile export documentation and FBR duty rebates faster than any agent we\'ve worked with. The connections they have in customs are extraordinary.', author: 'Head of Sourcing', role: 'European Fashion House' },
  { quote: 'We were evaluating IT outsourcing in Pakistan but had no local visibility. CZAAH vetted three development firms, structured the contracts, and handled all compliance. Seamless.', author: 'CTO', role: 'US-based SaaS Company' },
  { quote: 'The aviation logistics CZAAH arranged for our site inspection across three provinces was flawless. It turned a two-week trip into four days and impressed our entire board.', author: 'VP of Development', role: 'Chinese Infrastructure Firm' },
  { quote: 'What sets CZAAH apart is their institutional discipline. Clean documentation, transparent reporting, and a compliance standard you rarely see in frontier markets.', author: 'Portfolio Manager', role: 'London-based PE Fund' },
] as const

const filterTabsData = [
  { label: 'All', query: 'Pakistan investment business economy' },
  { label: 'Mining', query: 'Pakistan mining minerals Reko Diq' },
  { label: 'CPEC', query: 'CPEC Pakistan China corridor' },
  { label: 'Real Estate', query: 'Pakistan real estate property' },
  { label: 'Technology', query: 'Pakistan technology IT exports' },
  { label: 'Textiles', query: 'Pakistan textile exports trade' },
  { label: 'Economy', query: 'Pakistan stock market PSX economy' },
] as const

const partnerNames = ['Sovereign Funds', 'Chinese SOEs', 'Gulf Family Offices', 'Mining Corporates', 'Diaspora HNWIs', 'Global Tech Firms'] as const

/* ------------------------------------------------------------------ */
/*  News Types & Helpers                                               */
/* ------------------------------------------------------------------ */

interface NewsArticle {
  title: string
  description?: string
  url: string
  urlToImage?: string
  publishedAt: string
  source?: { name: string }
}

function formatNewsDate(dateStr: string) {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
}

function truncateText(str: string, len: number) {
  const clean = str.replace(/<[^>]*>/g, '')
  return clean.length > len ? clean.substring(0, len) + '...' : clean
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  // Testimonials state
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  // News state
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState(false)
  const [activeFilter, setActiveFilter] = useState(0)
  const [slideDirection, setSlideDirection] = useState<number | null>(null)
  const [slideAnimating, setSlideAnimating] = useState(false)

  // News fetching
  const fetchNews = useCallback(async (query: string) => {
    setNewsLoading(true)
    setNewsError(false)
    setNewsArticles([])
    setCurrentSlide(0)

    const WORKER_URL = 'https://czaah-news.czaah-news.workers.dev'

    try {
      const response = await fetch(WORKER_URL + '?q=' + encodeURIComponent(query))
      const data = await response.json()
      if (data.status !== 'ok' || !data.articles || data.articles.length === 0) {
        throw new Error('No articles')
      }
      setNewsArticles(data.articles)
      setNewsLoading(false)
    } catch {
      try {
        const response = await fetch('/api/public/news?q=' + encodeURIComponent(query) + '&pageSize=8')
        const data = await response.json()
        if (data.status === 'ok' && data.articles && data.articles.length > 0) {
          setNewsArticles(data.articles)
          setNewsLoading(false)
          return
        }
      } catch {
        // ignore
      }
      setNewsError(true)
      setNewsLoading(false)
    }
  }, [])

  const changeSlide = (direction: number) => {
    const newIndex = currentSlide + direction
    if (newIndex < 0 || newIndex >= newsArticles.length || slideAnimating) return
    setSlideAnimating(true)
    setSlideDirection(direction)
    setTimeout(() => {
      setCurrentSlide(newIndex)
      setSlideDirection(null)
      setSlideAnimating(false)
    }, 300)
  }

  useEffect(() => {
    fetchNews('Pakistan investment business economy')
  }, [fetchNews])

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') changeSlide(-1)
      if (e.key === 'ArrowRight') changeSlide(1)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  })

  const currentArticle = newsArticles[currentSlide]

  return (
    <>
      <Navbar />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  HERO                                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[80vh] min-h-[80dvh] md:min-h-screen md:min-h-[100dvh] w-full overflow-hidden flex items-end pb-12 md:pb-24 pt-24">
        <div className="absolute inset-0 z-0">
          {/* @ts-ignore */}
          <video
            autoPlay
            muted
            loop
            playsInline
            webkit-playsinline=""
            preload="auto"
            className="w-full h-full object-cover object-bottom"
          >
            <source src="/Images/Hero-Video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 obsidian-overlay" />
        </div>

        <div className="relative z-10 px-5 md:px-24 w-full max-w-[1600px] mx-auto">
          <div>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Based in London. Connected Globally.</div>
            <h1 className="cinzel-text text-3xl sm:text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">
              International <span className="text-primary">Investment</span><br />
              Facilitation Group.
            </h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">
              CZAAH Group is a <span className="text-on-surface font-semibold">London-based</span> International Investment Facilitation Group connecting investors, businesses and strategic partners with opportunities across the <span className="text-on-surface font-semibold">United Kingdom</span>, <span className="text-on-surface font-semibold">Pakistan</span> and international markets.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/contact" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm transition-transform hover:-translate-y-1 raleway-text text-center">
                Schedule a Consultation
              </Link>
              <Link href="/investments" className="border border-outline-variant/40 hover:border-primary px-10 py-5 text-on-surface font-bold tracking-[0.2em] uppercase text-sm transition-all bg-white/5 backdrop-blur-sm raleway-text text-center">
                Explore Opportunities
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  STRATEGIC SECTORS (4 featured cards)                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-surface px-5 md:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl cinzel-text mb-6 text-on-surface">Strategic Sectors</h2>
              <p className="text-on-surface-variant raleway-text leading-relaxed">With London at the centre of our international operations, we facilitate opportunities across International Real Estate, Construction &amp; Development, International Manpower, Mines &amp; Minerals, and other strategic sectors.</p>
            </div>
            <Link href="/sectors" className="text-primary flex items-center gap-2 hover:gap-4 transition-all group">
              <span className="text-sm tracking-widest uppercase font-bold raleway-text">View All Sectors</span>
              <span className="material-symbols-outlined">trending_flat</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
            {sectorCards.slice(0, 4).map((sector, i) => (
              <Link
                key={sector.slug}
                href={`/sectors/${sector.slug}`}
                className={`group relative ${i % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container'} aspect-[3/4] overflow-hidden transition-all duration-700 hover:bg-surface-container-high`}
              >
                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                  <img
                    alt={sector.name}
                    className="w-full h-full object-cover grayscale"
                    src={`/Images/${sector.slug === 'minerals' ? 'Mines' : sector.slug === 'realestate' ? 'Real-Estate' : sector.slug === 'manpower' ? 'Manpower' : sector.slug === 'technology' ? 'IT' : 'Construction'}.jpg`}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div className="absolute inset-0 p-12 flex flex-col justify-between">
                  <span className="material-symbols-outlined text-primary text-5xl">{sector.icon}</span>
                  <div>
                    <h3 className="text-3xl cinzel-text text-on-surface mb-4">{sector.name}</h3>
                    <p className="text-on-surface-variant raleway-text opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 text-sm leading-relaxed">
                      {sector.description}
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ALL SECTORS GRID                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-surface-container-lowest px-5 md:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-20">
            <span className="text-primary tracking-[0.4em] uppercase text-xs font-semibold raleway-text block mb-4">Full Coverage</span>
            <h2 className="text-4xl md:text-6xl cinzel-text text-on-surface">Thirteen sectors. One partner.</h2>
            <p className="text-on-surface-variant raleway-text leading-relaxed max-w-xl mx-auto mt-6">
              Capital deployment, resource sourcing, government markets, and infrastructure — a single counterparty across every vertical.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-outline-variant/10">
            {verticals.map((v) => (
              <Link
                key={v.slug}
                href={`/sectors/${v.slug}`}
                className={`group p-10 transition-all duration-300 hover:bg-surface-container-high ${v.coreFocus ? 'bg-surface-container-low border-l-2 border-l-primary' : 'bg-surface/60'}`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-primary/40 cinzel-text text-sm font-bold">{v.num}</span>
                  {v.coreFocus && (
                    <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-black bg-primary px-2 py-0.5 raleway-text">Core Focus</span>
                  )}
                </div>
                <div className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text mb-3">{v.model}</div>
                <h3 className="text-xl cinzel-text text-on-surface mb-3 group-hover:text-primary transition-colors">{v.name}</h3>
                <p className="text-on-surface-variant text-sm raleway-text leading-relaxed">{v.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  SERVICES                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-surface px-5 md:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-24">
            <span className="text-primary tracking-[0.4em] uppercase text-xs font-semibold raleway-text block mb-4">The Sovereign Standard</span>
            <h2 className="text-4xl md:text-6xl cinzel-text text-on-surface">How we support investors</h2>
            <p className="text-on-surface-variant raleway-text leading-relaxed max-w-xl mx-auto mt-6">
              From entity formation through deal execution and ongoing portfolio oversight — a single counterparty for the entire investment lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {serviceCards.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group p-10 border border-outline-variant/10 hover:border-primary/30 transition-all bg-surface/40"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-8 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined">{service.icon}</span>
                </div>
                <div className="text-on-surface-variant text-xs tracking-widest uppercase raleway-text mb-3">{service.model}</div>
                <h4 className="text-xl cinzel-text text-on-surface mb-4 group-hover:text-primary transition-colors">{service.title}</h4>
                <p className="text-on-surface-variant text-sm raleway-text leading-relaxed">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  GLOBAL PRESENCE                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-surface-container-lowest px-5 md:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-20">
            <span className="text-primary tracking-[0.4em] uppercase text-xs font-semibold raleway-text block mb-4">Global Reach</span>
            <h2 className="text-4xl md:text-6xl cinzel-text text-on-surface">Global presence, local depth.</h2>
            <p className="text-on-surface-variant raleway-text leading-relaxed max-w-xl mx-auto mt-6">
              Headquartered in London, with operations and investor relationships spanning six regions and international-standard transaction structures.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {statsData.map((stat) => (
              <div key={stat.name} className="group text-center p-8 bg-surface/40 border border-outline-variant/10 hover:border-primary/30 transition-all">
                <div className="w-12 h-8 mx-auto mb-4 overflow-hidden rounded-sm opacity-60 group-hover:opacity-100 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stat.flag} alt={stat.alt} className="w-full h-full object-cover" />
                </div>
                <div className="cinzel-text text-on-surface text-sm font-bold mb-2">{stat.name}</div>
                <p className="text-on-surface-variant text-xs raleway-text leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  MARKET INSIGHTS (Live News)                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-surface px-5 md:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-3xl cinzel-text uppercase tracking-widest text-on-surface">Market Insights</h2>
            <div className="flex gap-4">
              <button
                onClick={() => changeSlide(-1)}
                disabled={currentSlide === 0}
                className="w-12 h-12 border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30"
              >
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
              </button>
              <button
                onClick={() => changeSlide(1)}
                disabled={!newsArticles.length || currentSlide === newsArticles.length - 1}
                className="w-12 h-12 border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30"
              >
                <span className="material-symbols-outlined">arrow_forward_ios</span>
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-3 mb-12 flex-wrap">
            {filterTabsData.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => { setActiveFilter(i); fetchNews(tab.query) }}
                className={`px-5 py-2 text-xs tracking-widest uppercase font-bold raleway-text transition-all ${activeFilter === i ? 'liquid-gold-bg text-on-primary' : 'border border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-1">
            {/* Featured article */}
            <div className="lg:col-span-7 bg-surface-container-low p-12 border-l-4 border-primary min-h-[320px]">
              {newsLoading && (
                <div className="flex items-center gap-4 text-on-surface-variant raleway-text">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading latest news…
                </div>
              )}
              {newsError && (
                <div>
                  <h3 className="text-xl cinzel-text text-on-surface mb-2">Unable to load news</h3>
                  <p className="text-on-surface-variant raleway-text text-sm">Please check your connection and try again.</p>
                </div>
              )}
              {!newsLoading && !newsError && currentArticle && (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    {currentArticle.source?.name && (
                      <span className="text-primary text-xs font-bold tracking-widest raleway-text uppercase">{currentArticle.source.name}</span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-on-surface-variant text-xs raleway-text">{formatNewsDate(currentArticle.publishedAt)}</span>
                  </div>
                  <h3 className="text-3xl lg:text-4xl cinzel-text mb-8 leading-tight text-on-surface">{currentArticle.title}</h3>
                  {currentArticle.description && (
                    <p className="text-on-surface-variant raleway-text leading-loose mb-10 text-lg">
                      {truncateText(currentArticle.description, 250)}
                    </p>
                  )}
                  <a
                    href={currentArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-bold tracking-widest uppercase flex items-center gap-4 group raleway-text"
                  >
                    Full Analysis <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">east</span>
                  </a>
                </>
              )}
            </div>

            {/* Secondary articles */}
            <div className="lg:col-span-5 grid grid-rows-3">
              {newsArticles.slice(1, 4).map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-8 border-b border-white/5 bg-surface-container/30 hover:bg-surface-container-high transition-colors cursor-pointer group"
                >
                  <span className="text-xs text-on-surface-variant raleway-text mb-4 block uppercase">
                    {article.source?.name} · {formatNewsDate(article.publishedAt)}
                  </span>
                  <h4 className="text-lg cinzel-text group-hover:text-primary transition-colors text-on-surface leading-snug">{article.title}</h4>
                </a>
              ))}
            </div>
          </div>

          {/* Slide counter */}
          {!newsLoading && !newsError && newsArticles.length > 0 && (
            <div className="mt-8 text-center">
              <span className="text-on-surface-variant text-xs raleway-text tracking-widest">
                <span className="text-primary font-bold">{currentSlide + 1}</span> / {newsArticles.length}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TESTIMONIALS                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-surface-container-lowest px-5 md:px-24 overflow-hidden">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-20">
            <span className="text-primary tracking-[0.4em] uppercase text-xs font-semibold raleway-text block mb-4">Trusted Partners</span>
            <h2 className="text-4xl md:text-5xl cinzel-text text-on-surface">What our clients say.</h2>
            <p className="text-on-surface-variant raleway-text leading-relaxed max-w-xl mx-auto mt-6">
              From Gulf sovereign wealth to London private equity — how our partners describe the experience.
            </p>
          </div>

          {/* Click-through testimonial */}
          <div className="max-w-3xl mx-auto text-center">
            <div className="p-8 md:p-12 bg-surface-container-low border border-outline-variant/15 min-h-[280px] flex flex-col justify-center">
              <div className="cinzel-text text-5xl text-primary mb-6">&ldquo;</div>
              <p className="raleway-text text-on-surface text-lg md:text-xl leading-relaxed mb-8 italic">
                {testimonials[currentTestimonial].quote}
              </p>
              <div className="cinzel-text text-sm text-on-surface font-semibold">{testimonials[currentTestimonial].author}</div>
              <div className="raleway-text text-xs text-on-surface-variant mt-1 tracking-wider uppercase">{testimonials[currentTestimonial].role}</div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <button
                onClick={() => setCurrentTestimonial(prev => prev === 0 ? testimonials.length - 1 : prev - 1)}
                className="w-12 h-12 border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all"
              >
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
              </button>
              <span className="raleway-text text-on-surface-variant text-xs tracking-widest">
                <span className="text-primary font-bold">{currentTestimonial + 1}</span> / {testimonials.length}
              </span>
              <button
                onClick={() => setCurrentTestimonial(prev => prev === testimonials.length - 1 ? 0 : prev + 1)}
                className="w-12 h-12 border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all"
              >
                <span className="material-symbols-outlined">arrow_forward_ios</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  PARTNERS                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-surface px-5 md:px-24">
        <div className="max-w-[1600px] mx-auto text-center">
          <span className="text-primary tracking-[0.4em] uppercase text-xs font-semibold raleway-text block mb-4">Who We Serve</span>
          <h2 className="text-4xl md:text-5xl cinzel-text text-on-surface mb-16">Built for serious partners.</h2>

          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {partnerNames.map((name) => (
              <span key={name} className="text-on-surface-variant/50 hover:text-primary transition-colors cinzel-text text-lg tracking-wide cursor-default">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  CTA                                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-32 px-5 md:px-24 bg-surface-container-lowest overflow-hidden">
        {/* Ambient gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(230,195,100,0.05)_0%,transparent_65%)] pointer-events-none" />

        <div className="relative text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl cinzel-text text-on-surface mb-6">Begin the <span className="text-primary">conversation.</span></h2>
          <p className="text-on-surface-variant raleway-text text-lg leading-relaxed mb-12 italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Structured access to the UK, Pakistan, and our most compelling international sectors — with a single, institutional-grade counterparty.
          </p>
          <Link href="/contact" className="liquid-gold-bg text-on-primary px-12 py-5 font-bold tracking-[0.2em] uppercase text-sm transition-transform hover:-translate-y-1 raleway-text inline-block">
            Request a Consultation
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
