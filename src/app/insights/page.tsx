'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function InsightsPage() {
  const [filter, setFilter] = useState('all')
  const [activePost, setActivePost] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActivePost(entry.target.id)
          }
        })
      },
      { threshold: 0.2, rootMargin: '-80px 0px -60% 0px' }
    )

    document.querySelectorAll('.blog-post').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [filter])

  const handleFilter = (value: string) => {
    setFilter(value)
  }

  const isVisible = (category: string) => filter === 'all' || category === filter

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'mining', label: 'Mining' },
    { key: 'realestate', label: 'Real Estate' },
    { key: 'construction', label: 'Construction' },
    { key: 'technology', label: 'Technology' },
    { key: 'textiles', label: 'Textiles' },
    { key: 'agriculture', label: 'Agriculture' },
  ]

  const sidebarPosts = [
    { id: 'post-15', title: 'Reko Diq Is Now Operational', date: '7 Mar 2026', cat: 'mining' },
    { id: 'post-14', title: 'Islamabad Blue Area Expansion', date: '28 Feb 2026', cat: 'realestate' },
    { id: 'post-13', title: 'Construction Sector Posts 12% Growth', date: '21 Feb 2026', cat: 'construction' },
    { id: 'post-12', title: 'Marble & Granite Exports Surge', date: '14 Feb 2026', cat: 'mining' },
    { id: 'post-11', title: 'Gwadar Free Zone Phase 1', date: '7 Feb 2026', cat: 'realestate' },
    { id: 'post-10', title: 'Rare Earth Elements in Pakistan', date: '31 Jan 2026', cat: 'mining' },
    { id: 'post-9', title: 'ML-1 Railway Upgrade', date: '24 Jan 2026', cat: 'construction' },
    { id: 'post-8', title: 'Diaspora Real Estate Investment', date: '17 Jan 2026', cat: 'realestate' },
    { id: 'post-7', title: 'Thar Coal Energy Backbone', date: '10 Jan 2026', cat: 'mining' },
    { id: 'post-6', title: "Pakistan's Housing Shortage", date: '3 Jan 2026', cat: 'construction' },
    { id: 'post-5', title: 'Special Economic Zones', date: '27 Dec 2025', cat: 'realestate' },
    { id: 'post-4', title: 'IT Exports Hit $3.2 Billion', date: '19 Dec 2025', cat: 'technology' },
    { id: 'post-3', title: 'Chromite Mining in Balochistan', date: '12 Dec 2025', cat: 'mining' },
    { id: 'post-2', title: 'Textile Exports & Gulf Opportunity', date: '5 Dec 2025', cat: 'textiles' },
    { id: 'post-1', title: 'Agriculture \u2014 23% of GDP', date: '28 Nov 2025', cat: 'agriculture' },
  ]

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">

        {/* HERO */}
        <section className="relative min-h-[60dvh] md:min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Insights.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-xs tracking-[0.15em] uppercase text-on-surface-variant hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="h-px w-16 bg-primary mb-8"></div>
            <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">Global Market Intelligence</p>
            <h1 className="cinzel-text text-2xl sm:text-4xl md:text-6xl font-bold text-on-surface mb-8">Insights &amp; <span className="text-primary">Analysis.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl">Strategic intelligence on global investment landscapes &mdash; mining, real estate, construction, and beyond. Published every Friday.</p>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* BLOG SECTION */}
        <section className="py-32 px-8 md:px-24 bg-surface">
          <div className="max-w-[1100px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">

              {/* MAIN CONTENT */}
              <div className="min-w-0">

                {/* Post 15 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 first:pt-0 last:border-b-0" id="post-15" data-category="mining" style={{ display: isVisible('mining') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Mining</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 7 March 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Reko Diq Is Now Operational &mdash; What It Means for <span className="text-primary">Pakistan&rsquo;s Mining Future</span></h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>The Reko Diq copper-gold project in Balochistan has officially entered its operational phase, marking the single largest mining development in Pakistan&rsquo;s history. With estimated reserves of 12.3 million tonnes of copper and 20.9 million ounces of gold, the project is valued at over $100 billion across its lifecycle.</p>
                    <p>The restructured deal &mdash; a joint venture between Barrick Gold and the Pakistani government &mdash; has resolved the legal disputes that stalled progress for over a decade. Balochistan now holds a 25% free-carry stake, with royalties flowing directly to the provincial government.</p>
                    <p><strong className="text-on-surface">Why this matters for investors:</strong> Reko Diq is a proof of concept. It demonstrates that large-scale, international-grade mining operations can be structured and executed in Pakistan. The project has already attracted downstream interest from smelting companies, logistics providers, and equipment manufacturers looking for a foothold in what is now an active mining corridor.</p>
                    <p>Provincial governments in KPK and Gilgit-Baltistan are now accelerating their own licensing frameworks, using Reko Diq as the benchmark for investor protections and revenue-sharing structures. The window for early positioning in Pakistan&rsquo;s mining sector has never been more clearly defined.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss mining opportunities &rarr;</Link></div>
                </article>

                {/* Post 14 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-14" data-category="realestate" style={{ display: isVisible('realestate') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Real Estate</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 28 February 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Islamabad&rsquo;s Blue Area Expansion &mdash; <span className="text-primary">Commercial Real Estate</span> at an Inflection Point</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Islamabad&rsquo;s Blue Area &mdash; the capital&rsquo;s primary commercial district &mdash; is undergoing its most significant expansion in two decades. New high-rise approvals, relaxed height restrictions, and a surge in Grade A office demand are reshaping the city&rsquo;s commercial landscape.</p>
                    <p>CDA&rsquo;s revised master plan has opened up adjacent sectors for mixed-use commercial development, with plots along Jinnah Avenue commanding premium valuations. Occupancy rates in existing Grade A buildings remain above 92%, and pre-lease agreements for buildings still under construction signal sustained demand.</p>
                    <p><strong className="text-on-surface">Key drivers:</strong></p>
                    <ul className="ml-5 space-y-2 list-none">
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Growing presence of multinational companies establishing Pakistan headquarters in Islamabad</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Government digitisation initiatives creating demand for modern IT-ready office space</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Diplomatic enclave proximity driving premium for corporate offices near embassies</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Limited supply of Class A inventory relative to Karachi and Lahore</li>
                    </ul>
                    <p>For international investors, Islamabad commercial real estate offers USD-denominated rental yields of 7&ndash;9% with capital appreciation that has consistently outpaced inflation over the past five years.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Explore real estate opportunities &rarr;</Link></div>
                </article>

                {/* Post 13 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-13" data-category="construction" style={{ display: isVisible('construction') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Construction</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 21 February 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Pakistan&rsquo;s Construction Sector Posts <span className="text-primary">12% Growth</span> &mdash; Infrastructure Leads the Way</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan&rsquo;s construction sector grew 12% year-on-year in FY2025, driven primarily by public infrastructure spending under the National Highway Authority and provincial development programmes. The sector now accounts for approximately 2.5% of GDP and employs over 7 million workers.</p>
                    <p>The Sukkur&ndash;Hyderabad motorway, ML-1 railway upgrades, and Karachi&ndash;Quetta highway expansion are the three largest active projects, collectively valued at over $12 billion. These projects have created significant opportunities for both international construction firms seeking joint venture partnerships and suppliers of construction materials, equipment, and engineering services.</p>
                    <p><strong className="text-on-surface">The cement story is instructive:</strong> Pakistan&rsquo;s cement production capacity has reached 75 million tonnes per annum, with domestic consumption at an all-time high. Lucky Cement, Bestway, and DG Khan are all expanding capacity, signalling industry confidence in sustained construction activity through 2028.</p>
                    <p>For investors, the construction supply chain &mdash; steel, cement, heavy equipment, and specialised engineering &mdash; represents a lower-risk entry point into Pakistan&rsquo;s infrastructure boom compared to direct project participation.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss construction sector entry &rarr;</Link></div>
                </article>

                {/* Post 12 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-12" data-category="mining" style={{ display: isVisible('mining') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Mining</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 14 February 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Pakistan&rsquo;s Marble &amp; Granite Exports Surge &mdash; <span className="text-primary">$500M Target</span> Now in Sight</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan holds the world&rsquo;s fourth-largest marble reserves, with an estimated 300 billion cubic feet of extractable stone across Balochistan, KPK, and the tribal areas. Yet the country currently captures less than 1% of the global marble trade. That is changing rapidly.</p>
                    <p>New processing facilities in Risalpur and Buner are producing export-grade polished marble that competes directly with Italian and Turkish product at 40&ndash;60% lower cost. Chinese demand alone grew 35% in 2025, with buyers increasingly sourcing from Pakistan as Turkish prices rise.</p>
                    <p><strong className="text-on-surface">The investment case is compelling:</strong> a modern marble processing plant with 50,000 sq ft capacity requires approximately $2&ndash;3 million in capital expenditure and generates payback within 18&ndash;24 months at current export pricing. The margins are structurally protected by low labour costs and abundant raw material supply.</p>
                    <p>Pakistan&rsquo;s marble sector is where the country&rsquo;s textile sector was 20 years ago &mdash; fragmented, underleveraged, and ripe for consolidation by operators who can bring modern processing, quality control, and direct export relationships.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Explore marble investment &rarr;</Link></div>
                </article>

                {/* Post 11 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-11" data-category="realestate" style={{ display: isVisible('realestate') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Real Estate</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 7 February 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Gwadar Free Zone Phase 1 &mdash; <span className="text-primary">Why Investors</span> Are Moving Now</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Gwadar Free Zone Phase 1 is now 90% allocated, with over 40 enterprises registered and operational. The zone offers 23-year tax exemptions, duty-free imports, and full profit repatriation &mdash; terms unmatched anywhere else in Pakistan.</p>
                    <p>The completion of the Gwadar East Bay Expressway and the new international airport (expected operational by late 2026) are the catalysts that have shifted Gwadar from speculative to actionable. Land values within the free zone have appreciated 300% since 2020, and Phase 2 allocations are already oversubscribed.</p>
                    <p><strong className="text-on-surface">The strategic picture:</strong> Gwadar sits at the mouth of the Persian Gulf, 400km from the Strait of Hormuz. It offers the shortest trade route from Central Asia and western China to the Arabian Sea. As CPEC matures from a construction project into a functioning trade corridor, Gwadar becomes the logistics and warehousing hub for goods moving between China, Central Asia, and the Middle East.</p>
                    <p>Current opportunities centre on warehousing, fish processing, logistics yards, and hospitality &mdash; sectors where demand is already outstripping supply as port operations scale up.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss Gwadar opportunities &rarr;</Link></div>
                </article>

                {/* Post 10 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-10" data-category="mining" style={{ display: isVisible('mining') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Mining</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 31 January 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Rare Earth Elements in Pakistan &mdash; <span className="text-primary">The Next Strategic Frontier</span></h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan&rsquo;s geological surveys have confirmed significant rare earth element (REE) deposits across KPK, Balochistan, and Gilgit-Baltistan. With global demand for REEs driven by electric vehicles, wind turbines, and defence technology, these deposits are attracting serious international attention.</p>
                    <p>China currently controls 60% of global REE production. Western governments and manufacturers are actively seeking alternative supply chains, and Pakistan&rsquo;s deposits &mdash; particularly in the Chitral and Warsak regions &mdash; contain concentrations of neodymium, dysprosium, and cerium that are commercially viable at current market prices.</p>
                    <p><strong className="text-on-surface">The opportunity:</strong> early-stage exploration licenses in REE-prospective zones are available at minimal cost relative to comparable licenses in Africa or South America. The geological data is promising, the regulatory framework is established, and the strategic demand from Western and Japanese buyers provides a clear exit pathway for successful discoveries.</p>
                    <p>Pakistan&rsquo;s Ministry of Mines is actively promoting REE exploration through streamlined licensing and tax incentives for companies that commit to local processing &mdash; a deliberate strategy to move up the value chain rather than export raw ore.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Enquire about mineral licenses &rarr;</Link></div>
                </article>

                {/* Post 9 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-9" data-category="construction" style={{ display: isVisible('construction') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Construction</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 24 January 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">ML-1 Railway Upgrade &mdash; Pakistan&rsquo;s <span className="text-primary">$6.8 Billion</span> Infrastructure Bet</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>The ML-1 railway mainline upgrade &mdash; running 1,872km from Karachi to Peshawar &mdash; is the single largest infrastructure project in Pakistan&rsquo;s history outside of CPEC road construction. The project will increase track speed from 65km/h to 160km/h and expand freight capacity by 300%.</p>
                    <p>Phase 1 (Karachi to Multan) is now under active construction, with Chinese and Pakistani contractors working in consortium. The project&rsquo;s total estimated cost is $6.8 billion, financed through a mix of Chinese soft loans and Pakistani government allocation.</p>
                    <p><strong className="text-on-surface">Supply chain opportunities are significant:</strong></p>
                    <ul className="ml-5 space-y-2 list-none">
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Railway sleeper and track manufacturing &mdash; local production mandates create JV opportunities</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Signalling and communications systems &mdash; European and Chinese suppliers competing for contracts</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Station construction and urban redevelopment around 24 upgraded stations</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Rolling stock maintenance facilities &mdash; long-term service contracts</li>
                    </ul>
                    <p>The knock-on effects for real estate are already visible. Land prices around planned station upgrades in secondary cities like Sukkur, Multan, and Rawalpindi have appreciated 40&ndash;80% in the past 18 months as developers anticipate transit-oriented development.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss infrastructure opportunities &rarr;</Link></div>
                </article>

                {/* Post 8 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-8" data-category="realestate" style={{ display: isVisible('realestate') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Real Estate</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 17 January 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Diaspora Investment in Pakistani Real Estate &mdash; <span className="text-primary">Record Inflows</span> in 2025</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Overseas Pakistanis invested a record $3.8 billion in domestic real estate in 2025, up 28% from the previous year. The UK, UAE, and Saudi Arabia remain the top three source markets, with the Roshan Digital Account serving as the primary channel for compliant property transactions.</p>
                    <p>The growth is driven by three factors: favourable exchange rates making PKR-denominated assets attractive for dollar earners; government incentives including tax amnesty provisions for documented property purchases; and a new generation of diaspora investors who grew up abroad but see Pakistan as a high-yield frontier market.</p>
                    <p><strong className="text-on-surface">Where the money is going:</strong> Islamabad and Lahore account for 65% of diaspora real estate investment, with DHA (Defence Housing Authority) phases and Bahria Town developments dominating. However, a notable shift is emerging toward commercial property and purpose-built rental apartments as diaspora investors seek yield rather than speculative land banking.</p>
                    <p>For diaspora investors, the key challenge remains trust and transparency. Investors need reliable local partners who can manage due diligence, legal compliance, and ongoing property management &mdash; particularly when purchasing from abroad.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss diaspora investment &rarr;</Link></div>
                </article>

                {/* Post 7 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-7" data-category="mining" style={{ display: isVisible('mining') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Mining</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 10 January 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Thar Coal &mdash; From Desert to <span className="text-primary">Pakistan&rsquo;s Energy Backbone</span></h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Thar&rsquo;s coal reserves &mdash; estimated at 175 billion tonnes, making it one of the largest coal deposits on earth &mdash; are now producing over 10 million tonnes per annum. The Thar Block II mine-mouth power complex has added 1,320MW to Pakistan&rsquo;s grid, with Blocks III through VI in various stages of development.</p>
                    <p>The significance extends beyond electricity generation. Thar coal is now being used for coal gasification and coal-to-liquid fuel pilot projects, with Sindh Engro Coal Mining Company leading the commercialisation effort. These downstream applications could transform Thar from a power generation story into a chemicals and fuels story.</p>
                    <p><strong className="text-on-surface">Investment angles:</strong> the Thar ecosystem now supports mining services, logistics, housing for workers, and water management &mdash; all sectors where private capital is being actively sought. The Sindh government has designated a special economic zone around the Thar coal fields, offering tax holidays and simplified regulatory approvals for supporting industries.</p>
                    <p>Pakistan&rsquo;s indigenous coal is displacing imported LNG at approximately one-third the cost per BTU. As energy security climbs the government&rsquo;s priority list, Thar&rsquo;s expansion is accelerating.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Explore energy sector opportunities &rarr;</Link></div>
                </article>

                {/* Post 6 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-6" data-category="construction" style={{ display: isVisible('construction') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Construction</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 3 January 2026</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Pakistan&rsquo;s Housing Shortage &mdash; <span className="text-primary">10 Million Units</span> and Counting</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan faces a housing deficit of approximately 10 million units, growing by 300,000 units annually. This is not a problem &mdash; it is one of the largest single-sector investment opportunities in South Asia. The government&rsquo;s Naya Pakistan Housing Programme has built 150,000 units since inception, barely scratching the surface of demand.</p>
                    <p>The private sector is now stepping in. Low-cost housing developers using pre-fabricated construction, compressed earth blocks, and modular building systems are achieving unit costs of $8,000&ndash;$15,000 per home &mdash; affordable at Pakistani income levels with mortgage financing now available through Meezan Bank and HBL&rsquo;s Islamic housing products.</p>
                    <p><strong className="text-on-surface">The numbers are straightforward:</strong> at an average construction cost of $12,000 per unit, addressing even 10% of the housing deficit represents a $12 billion market. Developers who can deliver quality at scale &mdash; with proper title documentation and mortgage-ready compliance &mdash; are finding essentially unlimited demand.</p>
                    <p>International construction technology companies, modular housing manufacturers, and affordable housing funds are all finding Pakistan&rsquo;s housing deficit to be a compelling entry point into the market.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss housing development &rarr;</Link></div>
                </article>

                {/* Post 5 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-5" data-category="realestate" style={{ display: isVisible('realestate') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Real Estate</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 27 December 2025</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Special Economic Zones &mdash; <span className="text-primary">Pakistan&rsquo;s Industrial</span> Real Estate Opportunity</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan has designated nine Special Economic Zones under CPEC, with four now operational: Rashakai (KPK), Allama Iqbal (Punjab), Dhabeji (Sindh), and Bostan (Balochistan). Tenants in these zones receive 10-year income tax exemptions, duty-free machinery imports, and one-window regulatory clearance.</p>
                    <p>Rashakai SEZ alone has attracted over $2 billion in committed investment, with Chinese, Turkish, and local manufacturers establishing facilities for textiles, auto parts, pharmaceuticals, and food processing. Occupancy in Phase 1 has reached 85%, and Phase 2 expansion is underway.</p>
                    <p><strong className="text-on-surface">The real estate play is twofold:</strong> direct industrial plots within SEZs are appreciating at 15&ndash;20% annually as allocation fills up. Surrounding commercial and residential development &mdash; worker housing, retail, logistics parks &mdash; is following the same pattern seen around successful SEZs in China, Vietnam, and Bangladesh.</p>
                    <p>For investors who understand industrial real estate, Pakistan&rsquo;s SEZ programme offers the rare combination of government-backed incentives, genuine manufacturing demand, and early-stage pricing that has largely been arbitraged away in competing markets.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Explore SEZ opportunities &rarr;</Link></div>
                </article>

                {/* Post 4 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-4" data-category="technology" style={{ display: isVisible('technology') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Technology</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 19 December 2025</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Pakistan&rsquo;s IT Exports Hit $3.2 Billion &mdash; <span className="text-primary">The Quiet Boom</span></h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>While mining and real estate capture headlines, Pakistan&rsquo;s IT sector has been quietly building one of the fastest-growing export industries in the country. IT exports reached $3.2 billion in FY2025, up from $2.6 billion the previous year, with the government targeting $10 billion by 2030.</p>
                    <p>Pakistan now has over 400,000 registered IT freelancers and 5,000+ IT companies. Cities like Lahore, Islamabad, and Karachi have developed mature tech ecosystems with co-working spaces, incubators, and a deep talent pool of English-speaking developers working at 60&ndash;70% lower cost than comparable markets.</p>
                    <p><strong className="text-on-surface">The growth drivers are structural:</strong> a young population (64% under 30), widespread English proficiency, competitive engineering education, and time zones that overlap with both European and Asian business hours. Companies like Systems Limited, NetSol Technologies, and 10Pearls have already demonstrated that Pakistani tech firms can compete at a global level.</p>
                    <p>For international companies, Pakistan offers a compelling alternative to India and Eastern Europe for software development, QA testing, and managed IT services &mdash; with the added advantage of being a less saturated market where top talent is still accessible and affordable.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss IT sector opportunities &rarr;</Link></div>
                </article>

                {/* Post 3 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-3" data-category="mining" style={{ display: isVisible('mining') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Mining</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 12 December 2025</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Chromite Mining in Balochistan &mdash; <span className="text-primary">Pakistan&rsquo;s Hidden Export</span> Champion</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan is the world&rsquo;s third-largest producer of chromite ore, with the Muslim Bagh and Khanozai deposits in Balochistan producing approximately 200,000 tonnes annually. Chromite &mdash; essential for stainless steel production, refractory materials, and chrome plating &mdash; is one of Pakistan&rsquo;s most consistent mineral exports, with over 90% of production shipped to China.</p>
                    <p>The sector has historically been dominated by small-scale, artisanal miners operating with minimal mechanisation. This is changing. New mining leases issued in 2024&ndash;2025 include mechanisation requirements and environmental compliance standards that favour larger, capitalised operators.</p>
                    <p><strong className="text-on-surface">The value-add opportunity:</strong> Pakistan currently exports almost all chromite as raw ore at $150&ndash;200 per tonne. Processed ferrochrome sells for $1,200&ndash;1,500 per tonne. A single ferrochrome smelter in Balochistan could capture 8&ndash;10x the value currently being exported, while creating hundreds of local jobs and qualifying for CPEC industrial zone incentives.</p>
                    <p>This pattern &mdash; raw material export at low margins versus domestic processing at high margins &mdash; repeats across Pakistan&rsquo;s mineral sector. The first investors to build processing infrastructure will capture outsized returns.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Explore chromite opportunities &rarr;</Link></div>
                </article>

                {/* Post 2 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-2" data-category="textiles" style={{ display: isVisible('textiles') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Textiles</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 5 December 2025</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Pakistan Textile Exports &mdash; <span className="text-primary">$20 Billion Target</span> and the Gulf Opportunity</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Pakistan is the world&rsquo;s fourth-largest textile exporter, with exports reaching $16.5 billion in FY2025. The government&rsquo;s target of $20 billion by 2027 is ambitious but achievable, driven by shifting global supply chains, EU GSP+ preferential access, and rising production costs in competing markets like Bangladesh and Turkey.</p>
                    <p>The Gulf market represents a particularly underdeveloped opportunity. UAE and Saudi Arabia import over $8 billion in textiles annually, yet Pakistan&rsquo;s share remains below 5%. Geographic proximity, cultural alignment, and existing trade corridors via Dubai make the Gulf the natural expansion market for Pakistani textile exporters.</p>
                    <p><strong className="text-on-surface">Where international partners add value:</strong> Pakistan&rsquo;s textile sector is fragmented across thousands of small to medium mills. These mills produce excellent fabric but lack the compliance infrastructure, brand relationships, and export documentation capability to serve international buyers directly. Aggregation and compliance &mdash; bringing mills up to OEKO-TEX, GOTS, and Better Cotton standards &mdash; is where the margin opportunity lies.</p>
                    <p>Home textiles (bedding, towels, curtains) remain Pakistan&rsquo;s strongest category, but value-added garments and technical textiles are the fastest-growing segments as mills invest in higher-margin production.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Discuss textile trade &rarr;</Link></div>
                </article>

                {/* Post 1 */}
                <article className="blog-post py-12 border-b border-outline-variant/10 last:border-b-0" id="post-1" data-category="agriculture" style={{ display: isVisible('agriculture') ? '' : 'none' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="raleway-text text-[10px] font-medium tracking-[0.08em] uppercase px-2.5 py-1 border border-primary/30 text-primary">Agriculture</span>
                    <span className="raleway-text text-xs text-on-surface-variant">Friday, 28 November 2025</span>
                  </div>
                  <h2 className="cinzel-text text-2xl font-semibold text-on-surface mb-4 leading-tight">Agriculture in Pakistan &mdash; <span className="text-primary">23% of GDP</span> and Massively Underinvested</h2>
                  <div className="raleway-text text-sm leading-[1.85] text-on-surface-variant space-y-4">
                    <p>Agriculture accounts for 23% of Pakistan&rsquo;s GDP and employs 37% of the labour force, yet it receives less than 5% of total investment. This mismatch between economic importance and capital allocation is one of the most compelling investment themes in the country.</p>
                    <p>Pakistan is the world&rsquo;s 5th-largest milk producer, 8th-largest wheat producer, and 5th-largest cotton producer. Yet post-harvest losses run at 30&ndash;40% due to inadequate cold chain infrastructure, storage, and processing facilities. The gap between what is produced and what reaches markets as finished product represents a massive value capture opportunity.</p>
                    <p><strong className="text-on-surface">The modernisation wave is beginning:</strong></p>
                    <ul className="ml-5 space-y-2 list-none">
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Cold chain and warehousing &mdash; Pakistan needs 10x its current cold storage capacity</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Dairy processing &mdash; only 5% of milk production is formally processed</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Seed technology and precision agriculture &mdash; adoption still below 10%</li>
                      <li className="relative pl-5 before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">Halal meat processing for Gulf export &mdash; demand far exceeds certified supply</li>
                    </ul>
                    <p>Companies like Engro Foods and FrieslandCampina have demonstrated that corporate agriculture in Pakistan generates excellent returns. The sector is now ready for a broader wave of investment, particularly in processing, logistics, and export-oriented production.</p>
                  </div>
                  <div className="mt-5"><Link href="/contact" className="raleway-text text-sm font-medium text-primary hover:underline inline-flex items-center gap-2">Explore agriculture investment &rarr;</Link></div>
                </article>

              </div>

              {/* SIDEBAR */}
              <aside className="lg:sticky lg:top-[100px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto order-first lg:order-last">

                <div className="mb-8">
                  <h4 className="cinzel-text text-[11px] tracking-[0.12em] uppercase text-primary mb-4 pb-2 border-b border-primary/15">Filter by Sector</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {filterButtons.map(f => (
                      <button
                        key={f.key}
                        className={`raleway-text text-[10.5px] tracking-[0.03em] px-2.5 py-1 border transition-all duration-300 ${filter === f.key ? 'border-primary text-primary bg-primary/5' : 'border-outline-variant/20 text-on-surface-variant hover:border-primary hover:text-primary'}`}
                        onClick={() => handleFilter(f.key)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:block">
                  <h4 className="cinzel-text text-[11px] tracking-[0.12em] uppercase text-primary mb-4 pb-2 border-b border-primary/15">All Posts</h4>
                  <div className="space-y-0">
                    {sidebarPosts.map(post => (
                      <a
                        key={post.id}
                        href={`#${post.id}`}
                        className={`block py-2 px-3 raleway-text text-[12.5px] text-on-surface-variant border-l-2 transition-all duration-300 ${activePost === post.id ? 'border-l-primary text-primary bg-primary/5' : 'border-l-transparent hover:text-primary hover:border-l-primary'}`}
                        style={{ display: isVisible(post.cat) ? '' : 'none' }}
                      >
                        {post.title}
                        <span className="block text-[10px] text-on-surface-variant/40 mt-0.5">{post.date}</span>
                      </a>
                    ))}
                  </div>
                </div>

              </aside>

            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Receive our <span className="text-primary">briefings.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">Curated market intelligence and investment analysis, delivered directly from Islamabad.</p>
            <Link href="/contact" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Subscribe &rarr;</Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
