import Link from 'next/link'
import type { Metadata } from 'next'
import { RfqForm } from '../_components/RfqForm'

export const metadata: Metadata = {
  title: 'Request a mineral',
  description: 'Tell CZAAH which mineral, grade and quantity you need, and we will come back to you with what can be sourced.',
  alternates: { canonical: '/request' },
}

export default async function RequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).mineral
  // Shown in a form field, so only a plain short name is accepted.
  const mineral = typeof raw === 'string' && /^[\p{L}\p{N} &,.()'-]{2,80}$/u.test(raw.trim()) ? raw.trim() : ''
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-10">
      <p className="text-xs text-on-surface-variant mb-3"><Link href="/minerals-portal" className="hover:text-primary">Home</Link> / Request a mineral</p>
      <h1 className="cinzel-text text-3xl sm:text-4xl font-semibold mb-3">Request a <span className="text-primary">mineral</span></h1>
      <p className="text-on-surface-variant leading-relaxed mb-8 max-w-2xl">
        Not seeing what you need among the <Link href="/minerals-portal/offers" className="text-primary underline">current offers</Link>?
        Tell us the mineral, the grade and the quantity, and where it needs to go.
      </p>
      <RfqForm mineral={mineral} />
    </div>
  )
}
