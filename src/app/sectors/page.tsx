'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

interface Sector {
  id: string
  name: string
  slug: string
  description: string
  icon_url: string | null
  image_url: string | null
}

const SECTOR_ICONS: Record<string, string> = {
  minerals: 'diamond',
  realestate: 'location_city',
  technology: 'memory',
  textiles: 'storefront',
  agriculture: 'grass',
  pharmaceuticals: 'medication',
  construction: 'architecture',
  engineering: 'bolt',
  aviation: 'flight',
  manpower: 'groups',
  tourism: 'travel_explore',
  'luxury-rentals': 'directions_car',
  education: 'school',
}

const SECTOR_TAGS: Record<string, string> = {
  minerals: '$1T+ Reserves',
  realestate: 'CPEC Corridor',
  technology: '$3.2B+ Sector',
  textiles: '4th Global Exporter',
  agriculture: '23% of GDP',
  pharmaceuticals: '$4B+ Market',
  construction: 'Infrastructure',
  engineering: '8 Disciplines',
  aviation: 'Private Charter',
  manpower: '70M+ Workforce',
  tourism: 'Destination Mgmt',
  'luxury-rentals': 'Executive Fleet',
  education: '230M Population',
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSectors() {
      try {
        const res = await fetch('/api/public/sectors')
        if (res.ok) {
          const data = await res.json()
          setSectors(data)
        }
      } catch (err) {
        console.error('Failed to fetch sectors:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSectors()
  }, [])

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-5 md:px-24 bg-surface overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(230,195,100,0.05)_0%,transparent_50%)] pointer-events-none" />
        <div className="max-w-[1600px] mx-auto relative">
          <div className="mb-6 flex items-center gap-4">
            <span className="w-12 h-[1px] bg-primary" />
            <span className="text-primary tracking-[0.3em] uppercase text-xs font-semibold raleway-text">Institutional Portfolio</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black leading-[1.05] mb-8 cinzel-text text-on-surface">
            Strategic <br />
            <span className="text-primary italic">Sovereignty.</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl leading-relaxed raleway-text">
            We deploy capital across critical infrastructure and high-yield industrial sectors, backed by bilateral sovereign agreements and multi-billion dollar domestic mandates.
          </p>
        </div>
      </section>

      {/* Sectors Grid */}
      <section className="py-24 px-5 md:px-24 bg-surface-container-lowest">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-outline-variant/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface p-10 animate-pulse">
                  <div className="h-12 w-12 bg-surface-container mb-8 rounded" />
                  <div className="h-6 bg-surface-container rounded w-2/3 mb-4" />
                  <div className="h-4 bg-surface-container rounded w-full mb-2" />
                  <div className="h-4 bg-surface-container rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : sectors.length === 0 ? (
            <div className="text-center py-20">
              <p className="raleway-text text-on-surface-variant text-lg">No sectors available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-outline-variant/10">
              {sectors.map((sector) => (
                <Link
                  key={sector.id}
                  href={`/sectors/${sector.slug}`}
                  className="group p-10 bg-surface/60 hover:bg-surface-container-high transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-2xl">{SECTOR_ICONS[sector.slug] || 'category'}</span>
                    </div>
                    {SECTOR_TAGS[sector.slug] && (
                      <span className="text-[9px] tracking-[0.15em] uppercase font-bold text-primary bg-primary/10 px-3 py-1 raleway-text">
                        {SECTOR_TAGS[sector.slug]}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl cinzel-text text-on-surface mb-4 group-hover:text-primary transition-colors">
                    {sector.name}
                  </h3>
                  <p className="text-on-surface-variant text-sm raleway-text leading-relaxed mb-6">
                    {sector.description}
                  </p>
                  <span className="text-primary text-sm font-bold tracking-widest uppercase flex items-center gap-2 raleway-text group-hover:gap-4 transition-all">
                    Explore <span className="material-symbols-outlined text-base">east</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-5 md:px-24 bg-surface overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(230,195,100,0.05)_0%,transparent_65%)] pointer-events-none" />
        <div className="relative text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl cinzel-text text-on-surface mb-6">
            Secure Your Place in the <span className="text-primary italic">Global Order.</span>
          </h2>
          <p className="text-on-surface-variant raleway-text text-lg leading-relaxed mb-12">
            Access to these mandates is strictly limited to institutional partners and ultra-high-net-worth individuals. Inquire privately for a strategic consultation.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/contact" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm transition-transform hover:-translate-y-1 raleway-text">
              Request Private Briefing
            </Link>
            <Link href="/process" className="border border-outline-variant/40 hover:border-primary px-10 py-5 text-on-surface font-bold tracking-[0.2em] uppercase text-sm transition-all raleway-text">
              Review Compliance Standards
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
