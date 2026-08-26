'use client'
// @ts-nocheck

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { EnquiryForm } from '@/components/forms/EnquiryForm'

export default function NewEnquiryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sectorId = searchParams.get('sectorId') || undefined
  const sectorName = searchParams.get('sectorName') || undefined
  const serviceId = searchParams.get('serviceId') || undefined
  const productId = searchParams.get('productId') || undefined
  const productName = searchParams.get('productName') || undefined

  return (
    <>
      <Link
        href="/dashboard/enquiries"
        className="text-sm text-on-surface-variant/50 hover:text-primary transition-colors mb-6 inline-block raleway-text no-underline"
      >
        &larr; Back to Enquiries
      </Link>

      <div className="max-w-2xl">
        <h1 className="cinzel-text text-2xl text-on-surface mb-8">
          New Enquiry
        </h1>
        <EnquiryForm
          sectorId={sectorId}
          sectorName={sectorName}
          serviceId={serviceId}
          productId={productId}
          productName={productName}
          onSuccess={() => {
            setTimeout(() => router.push('/dashboard/enquiries'), 2000)
          }}
        />
      </div>
    </>
  )
}
