'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

interface Service {
  id: string
  name: string
  slug: string
  description: string
  icon_url: string | null
  image_url: string | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/public/services')
        if (res.ok) {
          const data = await res.json()
          setServices(data)
        }
      } catch (err) {
        console.error('Failed to fetch services:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">
        {/* Hero */}
        <section className="pt-24 md:pt-40 pb-12 md:pb-24 py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <h1 className="cinzel-text text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-primary tracking-wide mb-8">
              Our Services.
            </h1>
            <p className="raleway-text text-xl md:text-2xl text-on-surface-variant max-w-4xl leading-relaxed">
              CZAAH provides a comprehensive suite of institutional services designed
              to facilitate investment, manage risk, and deliver results across
              complex markets and regulatory environments.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="pb-32 px-5 md:px-24 border-t border-outline-variant/10">
          <div className="max-w-[1600px] mx-auto pt-16">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-low border border-outline-variant/10 p-8 animate-pulse"
                  >
                    <div className="h-6 bg-surface-container-lowest w-2/3 mb-4" />
                    <div className="h-4 bg-surface-container-lowest w-full mb-2" />
                    <div className="h-4 bg-surface-container-lowest w-4/5" />
                  </div>
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-20">
                <p className="raleway-text text-on-surface-variant text-lg">
                  No services available at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.slug}`}
                    className="group bg-surface-container-low border border-outline-variant/10 p-8 hover:border-primary/40 transition-all duration-300"
                  >
                    <h3 className="cinzel-text text-lg text-primary mb-4 group-hover:text-primary/80 transition-colors">
                      {service.name}
                    </h3>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed mb-6">
                      {service.description}
                    </p>
                    <span className="raleway-text text-primary text-sm tracking-[0.1em] uppercase group-hover:translate-x-1 inline-block transition-transform">
                      Explore &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 border-t border-outline-variant/10">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-8">
              Need a tailored solution?
            </h2>
            <Link
              href="/contact"
              className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm"
            >
              Get in Touch
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
