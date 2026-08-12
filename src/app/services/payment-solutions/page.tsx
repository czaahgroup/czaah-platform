'use client';
// @ts-nocheck

import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function PaymentSolutionsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Payment-Solutions.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Financial Infrastructure</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Payment<br /><span className="text-primary">Solutions.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              CZAAH has partnered with Swiss Payments to deliver seamless cross-border payment infrastructure for businesses operating across Pakistan, the Gulf, and international markets. Multi-currency accounts, corporate cards, and real-time settlement &mdash; built on Swiss regulatory standards.
            </p>
            <Link href="/contact?interest=Payment%20Solutions#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Get Started &rarr;
            </Link>
          </div>
        </section>

        {/* Partnership Highlight */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="border border-outline-variant/10 bg-surface-container-low p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 border border-primary/20 flex items-center justify-center cinzel-text text-2xl text-primary font-bold">
                SP
              </div>
              <div>
                <h3 className="cinzel-text text-2xl text-on-surface mb-1">Powered by <span className="text-primary">Swiss Payments</span></h3>
                <div className="raleway-text text-sm text-on-surface-variant/60 mb-4">Swiss-regulated financial infrastructure for global commerce</div>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-4">
                  Our partnership with Swiss Payments brings institutional-grade payment infrastructure to CZAAH clients. Swiss regulatory oversight ensures full AML/KYC compliance, transparent pricing, and the security standards expected by international investors and corporate treasuries.
                </p>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-6">
                  Whether you are settling trade invoices across borders, managing multi-currency payroll, or issuing corporate cards for distributed teams &mdash; the platform is built for speed, transparency, and regulatory confidence.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Swiss Regulated', 'AML/KYC Compliant', 'Transparent Pricing', 'Global Reach'].map(tag => (
                    <span key={tag} className="raleway-text text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20">{tag}</span>
                  ))}
                </div>
                <a href="https://swisspayments.ch" target="_blank" rel="noopener" className="raleway-text text-sm text-primary hover:text-primary/80 transition-colors tracking-wider">
                  Visit swisspayments.ch &rarr;
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">End-to-end payment infrastructure for cross-border commerce &mdash; from account opening to global settlement.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'sync_alt', title: 'Cross-Border Payments', desc: 'Send and receive payments globally through local payment rails and international wire networks. Competitive rates, fast processing, and full transparency on fees and delivery timelines for every transaction.' },
                { icon: 'account_balance_wallet', title: 'Multi-Currency Accounts', desc: 'Hold, manage, and convert balances across 30+ currencies in a single platform. Reduce FX exposure, eliminate unnecessary conversions, and maintain operational accounts in the currencies your business needs.' },
                { icon: 'credit_card', title: 'Corporate Card Programme', desc: 'Issue virtual and physical cards for your team with granular spend controls, real-time notifications, and seamless integration into your expense management workflow. Scale card issuance as your operations grow.' },
                { icon: 'currency_exchange', title: 'FX & Treasury Management', desc: 'Access competitive foreign exchange rates with real-time conversion capabilities. Manage treasury positions across currencies, set rate alerts, and execute conversions at optimal pricing for your business needs.' },
                { icon: 'monitoring', title: 'Transaction Monitoring', desc: 'Real-time visibility into every payment — status tracking, compliance reporting, and audit-ready transaction histories. Full transparency for internal controls, regulatory requirements, and stakeholder reporting.' },
                { icon: 'speed', title: 'Settlement Infrastructure', desc: 'Fast, reliable settlement for trade payments, contract disbursements, and invoice processing. Purpose-built for the speed and documentation requirements of cross-border commerce and investment flows.' },
              ].map((card, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="cinzel-text text-base font-semibold text-on-surface mb-3">{card.title}</h3>
                  <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Stats */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Payment capabilities <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ number: '30+', label: 'Currencies supported' }, { number: 'Real-time', label: 'Settlement tracking' }, { number: 'Swiss', label: 'Regulated compliance' }, { number: 'Minutes', label: 'To open an account' }].map((stat, i) => (
                <div key={i}><div className="cinzel-text text-3xl md:text-4xl text-primary mb-2">{stat.number}</div><div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div></div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Why CZAAH */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Why <span className="text-primary">CZAAH.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Swiss financial standards combined with regional expertise, applied to every layer of your payment infrastructure.</p>
            <div className="space-y-4">
              {[
                { icon: 'verified_user', title: 'Swiss Financial Standards', desc: 'Every transaction is processed under Swiss regulatory supervision, ensuring full AML/KYC compliance, transparent fee structures, and the institutional-grade security that international investors and corporate clients require.' },
                { icon: 'public', title: 'International Integration', desc: 'We structure payment flows across borders that align with your cross-border requirements — enabling efficient settlement across jurisdictions with full regulatory compliance.' },
                { icon: 'analytics', title: 'Investor-Grade Reporting', desc: 'Complete audit trails, compliance documentation, and transaction reporting built for institutional standards. Every payment is tracked, documented, and available for review by your compliance and finance teams.' },
                { icon: 'support_agent', title: 'Dedicated Account Management', desc: 'A named account manager for your payment operations — from initial setup and onboarding through to ongoing support, issue resolution, and strategic advisory on optimising your payment infrastructure.' },
              ].map((card, i) => (
                <div key={i} className="flex items-start gap-6 border border-outline-variant/10 bg-surface-container-low p-6 hover:border-primary/30 transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0 mt-1">{card.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-base font-semibold text-on-surface mb-2">{card.title}</h4>
                    <p className="raleway-text text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 text-center">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Streamline your cross-border <span className="text-primary">payments.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Multi-currency accounts, corporate cards, and global settlement &mdash; powered by Swiss financial infrastructure.</p>
            <Link href="/contact?interest=Payment%20Solutions#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Schedule a Consultation &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
