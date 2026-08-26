'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export const runtime = 'edge';

interface Product {
  id: string
  name: string
  slug: string
  description: string
  image_url: string | null
  is_enquiry_enabled: boolean
}

interface Sector {
  id: string
  name: string
  slug: string
  description: string
  icon_url: string | null
  image_url: string | null
  products: Product[]
}

export default function SectorDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [sector, setSector] = useState<Sector | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    async function fetchSector() {
      try {
        const res = await fetch(`/api/public/sectors/${slug}`)
        if (res.ok) {
          const data = await res.json()
          setSector(data)
        } else if (res.status === 404) {
          setNotFound(true)
        }
      } catch (err) {
        console.error('Failed to fetch sector:', err)
      } finally {
        setLoading(false)
      }
    }
    if (slug) fetchSector()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-czaah-black">
        <section className="pt-32 pb-24 px-6">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-10 bg-czaah-elevated rounded w-1/3 mb-6" />
            <div className="h-6 bg-czaah-elevated rounded w-2/3 mb-4" />
            <div className="h-6 bg-czaah-elevated rounded w-1/2" />
          </div>
        </section>
      </div>
    )
  }

  if (notFound || !sector) {
    return (
      <div className="min-h-screen bg-czaah-black">
        <section className="pt-32 pb-24 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="font-[family-name:var(--font-heading)] text-4xl text-czaah-gold mb-6">
              Sector Not Found
            </h1>
            <p className="font-[family-name:var(--font-body)] text-czaah-muted text-lg mb-8">
              The sector you are looking for does not exist or is no longer available.
            </p>
            <Link
              href="/sectors"
              className="inline-block bg-czaah-gold text-czaah-black font-[family-name:var(--font-body)] font-semibold px-8 py-3 rounded hover:bg-czaah-gold-light transition-colors"
            >
              Back to Sectors
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const enquireHref = isLoggedIn
    ? `/dashboard/enquiries/new?sectorId=${sector.id}&sectorName=${encodeURIComponent(sector.name)}`
    : '/register'

  return (
    <div className="min-h-screen bg-czaah-black">
      {/* Back Link */}
      <div className="pt-24 px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/sectors"
            className="font-[family-name:var(--font-body)] text-czaah-muted hover:text-czaah-gold text-sm tracking-wide uppercase transition-colors"
          >
            &larr; Back to Sectors
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-8 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl lg:text-7xl text-czaah-gold tracking-wide mb-8">
            {sector.name}.
          </h1>
          <p className="font-[family-name:var(--font-display)] italic text-xl md:text-2xl text-czaah-muted max-w-4xl leading-relaxed">
            {sector.description}
          </p>
        </div>
      </section>

      {/* Products */}
      {sector.products.length > 0 && (
        <section className="pb-24 px-6 border-t border-czaah-border">
          <div className="max-w-7xl mx-auto pt-16">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl text-czaah-white tracking-wide mb-12">
              Products &amp; Opportunities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {sector.products.map((product) => (
                <div
                  key={product.id}
                  className="bg-czaah-card border border-czaah-border rounded-lg p-8"
                >
                  <h3 className="font-[family-name:var(--font-heading)] text-lg text-czaah-gold mb-4">
                    {product.name}
                  </h3>
                  <p className="font-[family-name:var(--font-body)] text-czaah-muted text-sm leading-relaxed">
                    {product.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Enquire CTA */}
      <section className="py-24 px-6 border-t border-czaah-border">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-[family-name:var(--font-display)] italic text-3xl md:text-4xl text-czaah-white mb-4">
            Interested in {sector.name}?
          </h2>
          <p className="font-[family-name:var(--font-body)] text-czaah-muted text-lg mb-8 max-w-2xl mx-auto">
            {isLoggedIn
              ? 'Submit an enquiry and our team will be in touch with tailored information.'
              : 'Register for a CZAAH account to submit an enquiry and access exclusive opportunities.'}
          </p>
          <Link
            href={enquireHref}
            className="inline-block bg-czaah-gold text-czaah-black font-[family-name:var(--font-body)] font-semibold px-10 py-4 rounded hover:bg-czaah-gold-light transition-colors text-lg"
          >
            {isLoggedIn ? 'Enquire About This Sector' : 'Register to Enquire'}
          </Link>
        </div>
      </section>
    </div>
  )
}
