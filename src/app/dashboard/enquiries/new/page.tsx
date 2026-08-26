'use client'
// @ts-nocheck

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EnquiryForm } from '@/components/forms/EnquiryForm'

export default function NewEnquiryPage() {
  const router = useRouter()

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
          onSuccess={() => {
            setTimeout(() => router.push('/dashboard/enquiries'), 2000)
          }}
        />
      </div>
    </>
  )
}
