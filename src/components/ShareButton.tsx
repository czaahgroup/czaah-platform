'use client'

import { useState } from 'react'

export function ShareButton({ title, text, anchorId, className }: { title: string; text: string; anchorId: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/investments#${anchorId}`
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // user dismissed the native share sheet
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable in this context
    }
  }

  return (
    <button
      onClick={handleShare}
      className={className || 'raleway-text text-sm font-medium text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1.5'}
    >
      <span className="material-symbols-outlined text-base">{copied ? 'check' : 'share'}</span>
      {copied ? 'Link Copied' : 'Share'}
    </button>
  )
}
