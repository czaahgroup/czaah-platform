// @ts-nocheck
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-8 md:px-24">
        <div className="text-center max-w-lg">
          {/* Decorative line */}
          <div className="h-px w-16 bg-primary mx-auto mb-10"></div>

          {/* 404 */}
          <h1 className="cinzel-text text-7xl md:text-9xl font-bold text-primary tracking-wider mb-4">
            404
          </h1>

          {/* Subtitle */}
          <h2 className="cinzel-text text-2xl md:text-3xl text-on-surface tracking-wide mb-4">
            Page Not Found
          </h2>

          {/* Description */}
          <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-12">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block"
            >
              Return Home
            </Link>
            <Link
              href="/sectors"
              className="border border-outline-variant/40 hover:border-primary px-10 py-5 text-on-surface font-bold tracking-[0.2em] uppercase text-sm inline-block transition-colors"
            >
              Browse Sectors
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
