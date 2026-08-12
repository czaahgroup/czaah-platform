'use client'
// @ts-nocheck

import { useState, useEffect, type FormEvent } from 'react'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interest, setInterest] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const interestParam = params.get('interest')
    if (interestParam) {
      setInterest(interestParam)
    }
    if (window.location.hash === '#contact-form') {
      setTimeout(() => {
        const form = document.getElementById('contact-form')
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [])

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
          name: formData.get('name'),
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

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">

        {/* HERO */}
        <section className="relative min-h-[60dvh] md:min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Contact.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <div className="h-px w-16 bg-primary mb-8"></div>
            <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">Get in Touch</p>
            <h1 className="cinzel-text text-2xl sm:text-4xl md:text-6xl font-bold text-on-surface mb-8">Contact <span className="text-primary">us.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Institutional investors, family offices, sovereign entities, and corporate leadership evaluating Pakistan &mdash; we welcome a confidential conversation.</p>
            <a href="#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Send a Message &rarr;</a>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CONTACT FORM + INFO */}
        <section className="py-32 px-8 md:px-24 bg-surface" id="contact-form">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-4">Send us a <span className="text-primary">message.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base max-w-2xl mb-12">Tell us about your investment interests and we&apos;ll arrange a confidential consultation.</p>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mt-12 items-start">
              <div>
                {submitted ? (
                  <div className="p-12 bg-surface-container border border-outline-variant/10 text-center">
                    <h3 className="cinzel-text text-2xl text-primary mb-4">Message Received</h3>
                    <p className="raleway-text text-on-surface-variant text-[15px] leading-relaxed">Thank you for reaching out. A member of our team will respond within 24 hours. A confirmation email has been sent to your inbox.</p>
                  </div>
                ) : (
                  <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                      <label className="raleway-text text-xs tracking-[0.1em] uppercase text-primary font-medium">Full Name</label>
                      <input type="text" name="name" placeholder="Your name" required className="bg-surface-container-lowest border border-outline-variant/20 px-4 py-4 text-on-surface raleway-text text-sm focus:border-primary outline-none transition-colors placeholder:text-on-surface-variant/30" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="raleway-text text-xs tracking-[0.1em] uppercase text-primary font-medium">Email</label>
                      <input type="email" name="email" placeholder="your@email.com" required className="bg-surface-container-lowest border border-outline-variant/20 px-4 py-4 text-on-surface raleway-text text-sm focus:border-primary outline-none transition-colors placeholder:text-on-surface-variant/30" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="raleway-text text-xs tracking-[0.1em] uppercase text-primary font-medium">Phone</label>
                      <input type="tel" name="phone" placeholder="+971 XX XXX XXXX" className="bg-surface-container-lowest border border-outline-variant/20 px-4 py-4 text-on-surface raleway-text text-sm focus:border-primary outline-none transition-colors placeholder:text-on-surface-variant/30" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="raleway-text text-xs tracking-[0.1em] uppercase text-primary font-medium">Interest Area</label>
                      <select name="interest" id="interestSelect" value={interest} onChange={(e) => setInterest(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/20 px-4 py-4 text-on-surface raleway-text text-sm focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
                        <option value="">Select an area...</option>
                        <optgroup label="Sectors">
                          <option value="Minerals & Mining">Minerals &amp; Mining</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Construction & Development">Construction &amp; Development</option>
                          <option value="Technology & IT">Technology &amp; IT</option>
                          <option value="Textiles & Trade">Textiles &amp; Trade</option>
                          <option value="Agriculture">Agriculture</option>
                          <option value="Pharmaceuticals">Pharmaceuticals</option>
                          <option value="Engineering & Energy">Engineering &amp; Energy</option>
                          <option value="Aviation">Aviation</option>
                          <option value="Human Resources">Human Resources</option>
                          <option value="Tourism & Hospitality">Tourism &amp; Hospitality</option>
                          <option value="Luxury Car Rentals">Luxury Car Rentals</option>
                          <option value="Education">Education</option>
                        </optgroup>
                        <optgroup label="Services">
                          <option value="Business Setup">Business Setup</option>
                          <option value="Licensing & Compliance">Licensing &amp; Compliance</option>
                          <option value="Import & Export">Import &amp; Export</option>
                          <option value="Investor Protection">Investor Protection</option>
                          <option value="Investment Advisory">Investment Advisory</option>
                          <option value="Partnership Development">Partnership Development</option>
                          <option value="Government Contracts">Government Contracts</option>
                          <option value="Security Services">Security Services</option>
                          <option value="Payment Solutions">Payment Solutions</option>
                          <option value="Investment Migration">Investment Migration</option>
                        </optgroup>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="raleway-text text-xs tracking-[0.1em] uppercase text-primary font-medium">Message</label>
                      <textarea name="message" rows={5} placeholder="Tell us about your investment interests..." className="bg-surface-container-lowest border border-outline-variant/20 px-4 py-4 text-on-surface raleway-text text-sm focus:border-primary outline-none transition-colors resize-y min-h-[120px] placeholder:text-on-surface-variant/30"></textarea>
                    </div>
                    {error && <div className="raleway-text text-sm p-4 bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>}
                    <button type="submit" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm w-full" disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send Message \u2192'}
                    </button>
                  </form>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { icon: 'apartment', title: 'Islamabad Office', desc: 'CZAAH Capital & Ventures\nEmirates Tower, F-7 Markaz\nIslamabad, Pakistan' },
                  { icon: 'location_city', title: 'London Office', desc: 'CZAAH International\nBerkeley Square, Mayfair\nLondon, W1J 6BD' },
                  { icon: 'euro', title: 'Brussels Office', desc: 'Rue de la Tour Japonaise, 14\n1120 Bruxelles\nBelgium' },
                  { icon: 'domain', title: 'Hong Kong Office', desc: 'RM 1805-06, 18/F\nHollywood Plaza, 610 Nathan Road\nKowloon, Hong Kong' },
                  { icon: 'mail', title: 'Email', desc: 'info@czaah.com', isEmail: true },
                  { icon: 'chat', title: 'WhatsApp', desc: 'Available on request' },
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-surface-container border border-outline-variant/10 hover:border-primary/30 transition-all duration-500">
                    <div className="flex gap-4 items-start">
                      <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">{item.icon}</span>
                      <div>
                        <h4 className="cinzel-text text-sm font-semibold text-on-surface mb-1">{item.title}</h4>
                        {item.isEmail ? (
                          <p className="raleway-text text-sm text-on-surface-variant"><a href="mailto:info@czaah.com" className="text-primary hover:underline">info@czaah.com</a></p>
                        ) : (
                          <p className="raleway-text text-sm text-on-surface-variant whitespace-pre-line">{item.desc}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CONSULTATION CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Prefer a direct <span className="text-primary">conversation?</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">Our investment team is available for confidential discussions tailored to your objectives, timeline, and sector interests.</p>
            <a href="mailto:info@czaah.com" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Consultation &rarr;</a>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
