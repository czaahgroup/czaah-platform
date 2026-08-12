'use client'
// @ts-nocheck

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layouts/Navbar'
import { Footer } from '@/components/layouts/Footer'

interface FaqItem {
  question: string
  answer: string | ReactNode
}

interface FaqCategory {
  title: string
  titleGold: string
  items: FaqItem[]
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: 'Investment',
    titleGold: 'Basics',
    items: [
      {
        question: 'What is CZAAH?',
        answer: 'CZAAH is a diversified investment facilitation group headquartered in Islamabad, Pakistan, with international reach across key global markets. We connect international investors with Pakistan\u2019s highest-growth opportunities across minerals, real estate, technology, textiles, agriculture, and pharmaceuticals.',
      },
      {
        question: 'Who can invest through CZAAH?',
        answer: 'We serve institutional investors, multinational corporations, sovereign entities, Gulf-based family offices, diaspora Pakistanis (UK, US, UAE), and high-net-worth individuals. Our institutional structure accommodates both direct and structured investment.',
      },
      {
        question: 'What is the minimum investment?',
        answer: 'Investment minimums vary by opportunity and structure. Deal-by-deal investments typically start from $100,000, while pooled vehicles may offer lower entry points. Contact us to discuss specific opportunities.',
      },
    ],
  },
  {
    title: 'Legal &',
    titleGold: 'Regulatory',
    items: [
      {
        question: 'Is it safe for foreigners to invest in Pakistan?',
        answer: 'Yes. Pakistan\u2019s Board of Investment (BOI) actively facilitates foreign investment with repatriation guarantees and incentive schemes. CZAAH provides additional protection through institutional-grade legal frameworks, comprehensive due diligence, and defined exit mechanisms.',
      },
      {
        question: 'What legal structure is used for investments?',
        answer: 'We use Special Purpose Vehicles (SPVs) for individual deals, protecting investors from cross-deal risk. Our institutional structure provides international investors with robust legal frameworks and transparent transaction structures.',
      },
      {
        question: 'How long does company registration take in Pakistan?',
        answer: 'SECP company incorporation can be completed in 48\u201372 hours with fast-track processing. Full operational setup including FBR registration, bank accounts, and BOI approvals typically takes 2\u20134 weeks with CZAAH\u2019s facilitation.',
      },
    ],
  },
  {
    title: 'Sectors &',
    titleGold: 'Opportunities',
    items: [
      {
        question: 'Which sectors offer the best returns?',
        answer: 'Minerals and mining (particularly copper and gold exploration) and CPEC corridor real estate currently offer the highest growth potential. Technology and pharmaceuticals offer strong recurring returns. We recommend a diversified approach based on your risk profile.',
      },
      {
        question: 'What is CPEC and why does it matter?',
        answer: 'The China-Pakistan Economic Corridor is a $62 billion+ infrastructure and economic development programme creating 9 Special Economic Zones across Pakistan. It\u2019s driving massive demand for commercial property, industrial capacity, and supporting services.',
      },
      {
        question: 'Can I invest from the UAE/UK/US without visiting Pakistan?',
        answer: 'Yes. Our international operations allow investors from the UAE, UK, US, and beyond to invest through familiar frameworks with transparent transactions. We handle all on-the-ground operations, due diligence, and asset management on your behalf.',
      },
    ],
  },
  {
    title: 'Process &',
    titleGold: 'Reporting',
    items: [
      {
        question: 'How does the investment process work?',
        answer: (
          <span>Five steps: Initial consultation, investment assessment and proposal, legal and licensing facilitation, investment execution, and ongoing portfolio management. See our <Link href="/process" className="text-primary hover:underline">How It Works</Link> page for details.</span>
        ),
      },
      {
        question: 'What reporting do investors receive?',
        answer: 'Quarterly performance reports, independent valuations, regulatory compliance updates, and ad-hoc reporting as needed. All reporting meets international institutional standards.',
      },
      {
        question: 'What are the exit options?',
        answer: 'Every investment is structured with defined exit mechanisms \u2014 buyback arrangements, secondary market facilitation, or agreed-upon timelines. Exit terms are established before investment.',
      },
    ],
  },
]

function FaqAccordion({ category }: { category: FaqCategory }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <div className="mb-16">
      <h3 className="cinzel-text text-2xl font-bold text-on-surface mb-8">
        {category.title} <span className="text-primary">{category.titleGold}</span>
      </h3>

      {category.items.map((item, i) => {
        const isActive = activeIndex === i
        return (
          <div key={i} className="border-b border-outline-variant/20">
            <div
              className="flex justify-between items-center py-6 cursor-pointer raleway-text text-base font-medium text-on-surface hover:text-primary transition-colors"
              onClick={() => setActiveIndex(isActive ? null : i)}
            >
              <span>{item.question}</span>
              <span className={`cinzel-text text-xl text-primary transition-transform duration-300 shrink-0 ml-4 ${isActive ? 'rotate-45' : ''}`}>+</span>
            </div>
            <div className={`overflow-hidden transition-all duration-400 ${isActive ? 'max-h-[500px] pb-6' : 'max-h-0'}`}>
              <p className="raleway-text text-[15px] leading-[1.85] text-on-surface-variant">{item.answer}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">

        {/* HERO */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest">
          <div className="max-w-[1600px] mx-auto">
            <Link href="/" className="raleway-text text-xs tracking-[0.15em] uppercase text-on-surface-variant hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="h-px w-16 bg-primary mb-8"></div>
            <p className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-6">Frequently Asked Questions</p>
            <h1 className="cinzel-text text-2xl sm:text-4xl md:text-6xl font-bold text-on-surface mb-8">Common <span className="text-primary">questions.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl">Answers to the most common questions from international investors, diaspora Pakistanis, and corporations evaluating investment in Pakistan.</p>
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* FAQ SECTION */}
        <section className="py-32 px-8 md:px-24 bg-surface">
          <div className="max-w-[900px] mx-auto">
            {FAQ_DATA.map((category, i) => (
              <FaqAccordion key={i} category={category} />
            ))}
          </div>
        </section>

        <div className="h-px bg-outline-variant/20"></div>

        {/* CTA */}
        <section className="py-32 px-8 md:px-24 bg-surface-container-lowest text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl font-bold text-on-surface mb-6">Have a question not <span className="text-primary">listed here?</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-xl mx-auto">Our team is available to discuss your specific investment questions, regulatory concerns, or partnership enquiries.</p>
            <Link href="/contact" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Contact Us &rarr;</Link>
          </div>
        </section>

        <Footer />
      </main>
    </>
  )
}
