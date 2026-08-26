'use client'
// @ts-nocheck

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { EnquiryForm } from '@/components/forms/EnquiryForm'

export default function NewEnquiryPage() {
  const router = useRouter()
  const pathname = usePathname()
  // This page also renders at /admin/my-enquiries/new via a re-export —
  // keep the "back"/redirect links scoped to whichever portal shell it's
  // viewed under.
  const basePath = pathname?.startsWith('/admin') ? '/admin/my-enquiries' : '/dashboard/enquiries'

  return (
    <>
      <Link
        href={basePath}
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
            setTimeout(() => router.push(basePath), 2000)
          }}
        />
      </div>
    </>
  )
}
