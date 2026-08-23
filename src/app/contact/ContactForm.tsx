'use client'

import { useState, type FormEvent } from 'react'

const interestAreas = [
  'Minerals & Mining',
  'Real Estate & Construction',
  'Technology & IT',
  'Textiles & Agriculture',
  'Aviation & Logistics',
  'Pharmaceuticals & Energy',
  'Government Contracts',
  'Licensing & Compliance',
  'Investor Relations',
  'General Enquiry',
]

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('fullName'),
          email: formData.get('email'),
          phone: formData.get('phone') || '',
          interest: formData.get('interest'),
          message: formData.get('message'),
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setSubmitted(true)
      } else {
        setError(result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    }

    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="bg-czaah-card border border-czaah-border rounded-lg p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-czaah-gold flex items-center justify-center">
          <svg
            className="w-8 h-8 text-czaah-gold"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-heading)] text-2xl text-czaah-gold mb-4">
          Message Received
        </h3>
        <p className="font-[family-name:var(--font-body)] text-czaah-muted leading-relaxed">
          Thank you for reaching out. A member of our team will respond within 24
          hours. A confirmation email has been sent to your inbox.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="fullName"
          className="block font-[family-name:var(--font-body)] text-sm text-czaah-muted mb-2"
        >
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full bg-czaah-card border border-czaah-border rounded px-4 py-3 text-czaah-white font-[family-name:var(--font-body)] text-sm placeholder:text-czaah-muted-dim focus:border-czaah-gold focus:outline-none transition-colors"
          placeholder="Your full name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="email"
            className="block font-[family-name:var(--font-body)] text-sm text-czaah-muted mb-2"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full bg-czaah-card border border-czaah-border rounded px-4 py-3 text-czaah-white font-[family-name:var(--font-body)] text-sm placeholder:text-czaah-muted-dim focus:border-czaah-gold focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block font-[family-name:var(--font-body)] text-sm text-czaah-muted mb-2"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full bg-czaah-card border border-czaah-border rounded px-4 py-3 text-czaah-white font-[family-name:var(--font-body)] text-sm placeholder:text-czaah-muted-dim focus:border-czaah-gold focus:outline-none transition-colors"
            placeholder="+92 300 000 0000"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="interest"
          className="block font-[family-name:var(--font-body)] text-sm text-czaah-muted mb-2"
        >
          Interest Area
        </label>
        <select
          id="interest"
          name="interest"
          required
          className="w-full bg-czaah-card border border-czaah-border rounded px-4 py-3 text-czaah-white font-[family-name:var(--font-body)] text-sm focus:border-czaah-gold focus:outline-none transition-colors appearance-none"
        >
          <option value="" className="bg-czaah-black">
            Select an area of interest
          </option>
          {interestAreas.map((area) => (
            <option key={area} value={area} className="bg-czaah-black">
              {area}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block font-[family-name:var(--font-body)] text-sm text-czaah-muted mb-2"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full bg-czaah-card border border-czaah-border rounded px-4 py-3 text-czaah-white font-[family-name:var(--font-body)] text-sm placeholder:text-czaah-muted-dim focus:border-czaah-gold focus:outline-none transition-colors resize-none"
          placeholder="Tell us about your interest..."
        />
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-czaah-gold text-czaah-black font-[family-name:var(--font-body)] font-semibold px-8 py-4 rounded hover:bg-czaah-gold-light transition-colors text-sm tracking-wide uppercase disabled:opacity-50"
      >
        {submitting ? 'Sending...' : 'Submit Enquiry'}
      </button>
    </form>
  )
}
