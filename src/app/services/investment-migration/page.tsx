'use client';
// @ts-nocheck

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface Programme {
  country: string;
  type: string;
  desc: string;
  benefits: string[];
  routes: string[];
  investment: string;
  timeline: string;
  programme: string;
  family: string;
  presence: string;
  citizenship: string;
}

const programmes: Programme[] = [
  {
    country: 'Latvia', type: 'Temporary Residence Permit \u2014 Investment Route',
    desc: "Latvia's residence permit by investment is one of Europe's most efficient pathways to EU residency. Through a qualifying real estate purchase, subordinated capital deposit, or company investment, applicants receive a five-year temporary residence permit (TRP) with full Schengen travel rights. Latvia is an EU and NATO member, offers a high quality of life, competitive living costs, and a clear pathway from temporary residency through permanent residency to full Latvian \u2014 and therefore EU \u2014 citizenship. The process is straightforward: invest, submit biometrics and documentation to the Office of Citizenship and Migration Affairs (OCMA), and receive your residence permit within 30\u201390 days.",
    benefits: ['Full EU residency & Schengen access', 'Five-year TRP, renewable indefinitely', 'Path to permanent residency (after 5 years)', 'Path to EU citizenship (after 10 years)', 'Family inclusion \u2014 spouse, children, parents', 'No language requirement for TRP', 'EU healthcare & education access', 'NATO member state security', 'Low cost of living vs Western Europe'],
    routes: ['Real Estate in Riga (\u20AC250,000+)', 'Real Estate outside Riga (\u20AC50,000+ in designated areas)', 'Subordinated Capital in Latvian bank (\u20AC280,000+)', 'Company Investment (\u20AC50,000+ equity + tax obligations)', 'Government Bonds (\u20AC250,000+)'],
    investment: '\u20AC50K \u2013 \u20AC280K', timeline: '30 \u2013 90 days', programme: 'Temporary Residency (5-year TRP)', family: 'Spouse, children, dependent parents', presence: 'Visit once per calendar year', citizenship: 'Permanent residency after 5 years, citizenship after 10 years'
  },
  {
    country: 'Portugal', type: 'Golden Visa \u2014 Residency by Investment',
    desc: "Portugal's Golden Visa is one of Europe's most established residency by investment programmes. It offers a clear path to EU residency and Portuguese citizenship with minimal physical presence requirements. Ideal for investors seeking Schengen area access and a gateway to the European Union.",
    benefits: ['Schengen area access', 'Path to EU citizenship (5 years)', 'Minimal residency requirement (7 days/year)', 'Family inclusion', 'Access to Portuguese healthcare & education'],
    routes: ['Fund Investment (\u20AC500K+)', 'Scientific Research (\u20AC500K+)', 'Cultural Heritage (\u20AC250K+)', 'Business Creation (10+ jobs)'],
    investment: '\u20AC250K \u2013 \u20AC500K', timeline: '6 \u2013 12 months', programme: 'Residency', family: 'Spouse, children, dependants', presence: '7 days/year average', citizenship: 'After 5 years'
  },
  {
    country: 'Greece', type: 'Golden Visa \u2014 Residency by Investment',
    desc: "Greece offers one of Europe's most accessible golden visa programmes through real estate investment. With a relatively low entry threshold and no minimum stay requirement, it provides an efficient route to EU residency for investors and their families.",
    benefits: ['EU residency permit', 'No minimum stay requirement', 'Schengen travel access', 'Family inclusion', 'Real estate capital appreciation'],
    routes: ['Real Estate (\u20AC250K\u2013\u20AC800K by region)', 'Capital Investment (\u20AC400K+)', 'Government Bonds (\u20AC400K+)'],
    investment: '\u20AC250K \u2013 \u20AC800K', timeline: '3 \u2013 6 months', programme: 'Residency', family: 'Spouse, children, parents', presence: 'No minimum stay', citizenship: 'After 7 years (with residency)'
  },
  {
    country: 'Spain', type: 'Golden Visa \u2014 Residency by Investment',
    desc: "Spain's Golden Visa programme grants residency to non-EU investors who make a qualifying investment in Spanish real estate, financial assets, or business ventures. Spain offers a high quality of life, excellent infrastructure, and access to the EU's fourth-largest economy.",
    benefits: ['EU residency & Schengen access', 'Work authorisation included', 'Excellent healthcare & education', 'Family inclusion', 'Path to permanent residency'],
    routes: ['Real Estate (\u20AC500K+)', 'Financial Assets (\u20AC1M+)', 'Bank Deposit (\u20AC1M+)', 'Business Project (significant interest)'],
    investment: '\u20AC500K \u2013 \u20AC1M+', timeline: '2 \u2013 4 months', programme: 'Residency', family: 'Spouse, children, dependants', presence: 'Visit once per year to renew', citizenship: 'After 10 years'
  },
  {
    country: 'Malta', type: 'Citizenship & Residency by Investment',
    desc: "Malta offers both residency and a direct citizenship by naturalisation programme \u2014 one of the few in Europe. Maltese citizenship grants an EU passport with visa-free access to 180+ countries.",
    benefits: ['EU citizenship & passport', 'Visa-free access to 180+ countries', 'Favourable tax regime', 'English-speaking jurisdiction'],
    routes: ['Citizenship: Contribution (\u20AC600K\u2013\u20AC750K) + Property + Donation', 'Residency: Property (\u20AC300K+) + Contribution (\u20AC28K+)'],
    investment: '\u20AC150K \u2013 \u20AC1M+', timeline: '12 \u2013 36 months (citizenship)', programme: 'Citizenship & Residency', family: 'Spouse, children, dependants, parents', presence: 'Residency: some presence', citizenship: 'Direct (12\u201336 months)'
  },
  {
    country: 'Turkey', type: 'Citizenship by Investment',
    desc: "A direct route to citizenship through real estate or capital investment. Turkey straddles Europe and Asia, offering strategic positioning and visa-free access to 110+ countries.",
    benefits: ['Turkish passport & citizenship', 'Visa-free to 110+ countries', 'No language or residency test', 'Growing real estate market'],
    routes: ['Real Estate ($400K+)', 'Bank Deposit ($500K+)', 'Capital Investment ($500K+)'],
    investment: '$400K \u2013 $500K', timeline: '3 \u2013 6 months', programme: 'Citizenship', family: 'Spouse, children under 18', presence: 'No minimum requirement', citizenship: 'Direct \u2014 3 to 6 months'
  },
  {
    country: 'UAE', type: 'Golden Visa \u2014 Long-Term Residency',
    desc: "The UAE Golden Visa grants 10-year renewable residency to investors and entrepreneurs. Zero income tax, world-class infrastructure, and a strategic hub between continents.",
    benefits: ['10-year renewable residency', 'Zero income tax', '100% business ownership', 'Family sponsorship'],
    routes: ['Real Estate (AED 2M+ / $545K+)', 'Business Investment', 'Public Investment (AED 2M+)'],
    investment: 'AED 2M+ ($545K+)', timeline: '2 \u2013 4 weeks', programme: 'Long-term Residency', family: 'Spouse, children, domestic staff', presence: 'Visit every 6 months', citizenship: 'By nomination only'
  },
  {
    country: 'Caribbean', type: 'Citizenship by Investment \u2014 Multiple Nations',
    desc: "Fast-track second passport programmes across St Kitts & Nevis, Dominica, Grenada, Antigua & Barbuda, and St Lucia. No residency requirement, competitive pricing, and Schengen visa-free travel.",
    benefits: ['Second passport in 3\u20136 months', 'No residency required', 'Visa-free to 140+ countries', 'Tax-neutral jurisdictions'],
    routes: ['National Development Fund ($100K\u2013$200K)', 'Real Estate ($200K\u2013$400K)'],
    investment: '$100K \u2013 $400K', timeline: '3 \u2013 6 months', programme: 'Citizenship', family: 'Spouse, children, siblings, parents', presence: 'No requirement', citizenship: 'Direct \u2014 no residency phase'
  }
];

export default function InvestmentMigrationPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [meetingForm, setMeetingForm] = useState({ name: '', email: '', phone: '', date: '', time: '', notes: '' });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSuccess, setMeetingSuccess] = useState(false);
  const [meetingError, setMeetingError] = useState('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session?.user);
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('full_name, email, phone').eq('id', session.user.id).single();
          if (profile) {
            setMeetingForm(f => ({ ...f, name: profile.full_name || '', email: profile.email || '', phone: profile.phone || '' }));
          }
        }
      } catch { /* not logged in */ }
    }
    checkAuth();
  }, []);

  async function handleMeetingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingForm.name || !meetingForm.email || !meetingForm.date || !meetingForm.time) {
      setMeetingError('Please fill in all required fields');
      return;
    }
    setMeetingSubmitting(true);
    setMeetingError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: meetingForm.name, email: meetingForm.email, phone: meetingForm.phone || '',
          interest: `Investment Migration - ${selectedCountry}`,
          message: `Meeting Request for Investment Migration (${selectedCountry})\n\nPreferred Date: ${meetingForm.date}\nPreferred Time: ${meetingForm.time}\n\n${meetingForm.notes ? 'Additional Notes: ' + meetingForm.notes : ''}`,
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to submit'); }
      setMeetingSuccess(true);
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setMeetingSubmitting(false);
    }
  }

  const selectProgramme = (idx: number) => {
    if (idx === currentIndex) return;
    setFading(true);
    setTimeout(() => { setCurrentIndex(idx); setFading(false); }, 300);
  };

  const p = programmes[currentIndex];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Investment-Migration.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Residency &amp; Citizenship</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Investment<br /><span className="text-primary">Migration.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Secure European residency through qualifying investment &mdash; with Latvia as our primary pathway. Full advisory from programme selection and application through to approval, relocation, and settlement across the EU and beyond.
            </p>
            <Link href="/contact?interest=Investment%20Migration#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Explore Programmes &rarr;
            </Link>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Programme Selector */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Programme <span className="text-primary">directory.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-10">European residency and citizenship programmes assessed for credibility, processing time, and strategic value &mdash; with Latvia as our flagship route into the EU.</p>

            <div className="flex flex-wrap gap-3 mb-10">
              {programmes.map((prog, i) => (
                <button key={prog.country} onClick={() => selectProgramme(i)} className={`raleway-text text-sm font-medium px-5 py-2.5 border transition-all duration-300 ${i === currentIndex ? 'liquid-gold-bg text-on-primary border-primary font-semibold' : 'bg-transparent border-primary/25 text-on-surface-variant/60 hover:border-primary hover:text-on-surface'}`}>
                  {prog.country}
                </button>
              ))}
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 border border-primary/15 bg-surface-container-lowest p-8 md:p-10 transition-opacity duration-400 ${fading ? 'opacity-0' : 'opacity-100'}`}>
              <div>
                <div className="cinzel-text text-3xl text-primary mb-2">{p.country}</div>
                <div className="raleway-text text-sm text-on-surface-variant/50 mb-4">{p.type}</div>
                <p className="raleway-text text-sm text-on-surface-variant leading-relaxed mb-6">{p.desc}</p>
                <div className="mb-5">
                  <div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant/35 mb-2">Key Benefits</div>
                  <div className="flex flex-wrap gap-2">
                    {p.benefits.map(b => <span key={b} className="raleway-text text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20">{b}</span>)}
                  </div>
                </div>
                <div>
                  <div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant/35 mb-2">Investment Routes</div>
                  <div className="flex flex-wrap gap-2">
                    {p.routes.map(r => <span key={r} className="raleway-text text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20">{r}</span>)}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  [{ label: 'Minimum Investment', value: p.investment }, { label: 'Processing Time', value: p.timeline }],
                  [{ label: 'Programme Type', value: p.programme }, { label: 'Family Inclusion', value: p.family }],
                  [{ label: 'Physical Presence', value: p.presence }, { label: 'Path to Citizenship', value: p.citizenship }],
                ].map((row, ri) => (
                  <div key={ri} className="grid grid-cols-2 gap-4">
                    {row.map((item, ci) => (
                      <div key={ci} className="bg-surface-container-low border border-outline-variant/10 p-4">
                        <div className="raleway-text text-[0.65rem] uppercase tracking-[0.08em] text-on-surface-variant/40 mb-1">{item.label}</div>
                        <div className="raleway-text text-sm text-on-surface font-medium">{item.value}</div>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="pt-4 border-t border-outline-variant/10">
                  {isLoggedIn ? (
                    <button
                      onClick={() => { setSelectedCountry(p.country); setShowMeetingModal(true); setMeetingSuccess(false); setMeetingError(''); }}
                      className="w-full liquid-gold-bg text-on-primary px-6 py-4 font-bold tracking-[0.15em] uppercase text-sm hover:opacity-90 transition-opacity"
                    >
                      Begin Your Application &rarr;
                    </button>
                  ) : (
                    <Link href="/register" className="block w-full text-center border border-primary/30 text-primary px-6 py-4 raleway-text font-semibold text-sm tracking-[0.05em] hover:border-primary/60 transition-colors">
                      Become a Member to Begin Your Application
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Comprehensive investment migration advisory &mdash; from initial assessment through to approval, relocation, and settlement.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'travel_explore', title: 'Programme Selection', desc: 'Personalised assessment of your objectives, risk appetite, budget, and family requirements to identify the optimal residency or citizenship programme across our global network.' },
                { icon: 'task_alt', title: 'Application Management', desc: 'End-to-end management of the application process — document preparation, form completion, government liaison, and status tracking from submission through to approval.' },
                { icon: 'search', title: 'Due Diligence Support', desc: 'Pre-application due diligence review to identify and resolve potential issues before submission. We ensure your profile meets programme requirements and passes government screening.' },
                { icon: 'account_balance', title: 'Investment Structuring', desc: 'Guidance on qualifying investments — real estate selection, fund allocation, donation routing, and capital deployment — structured to meet programme thresholds while maximising returns.' },
                { icon: 'gavel', title: 'Legal & Tax Advisory', desc: 'Coordination with immigration lawyers, tax advisors, and compliance specialists in both origin and destination countries to ensure clean, compliant migration with optimal tax positioning.' },
                { icon: 'home', title: 'Relocation & Settlement', desc: 'Post-approval relocation support including property sourcing, school placement, bank account opening, healthcare registration, and integration assistance for you and your family.' },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-12">Migration capability <span className="text-primary">at a glance.</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ number: '20+', label: 'Programmes covered' }, { number: 'Europe', label: 'Primary focus' }, { number: 'End-to-End', label: 'Advisory scope' }, { number: 'Family', label: 'Inclusive applications' }].map((stat, i) => (
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
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Investment migration advisory built on real cross-border operational experience &mdash; not a referral desk.</p>
            <div className="space-y-4">
              {[
                { icon: 'public', title: 'Multi-Jurisdictional Expertise', desc: 'We operate across Pakistan, the UAE, and Europe with established legal and financial networks in every major destination country. Our advice reflects real operational knowledge, not brochure summaries.' },
                { icon: 'handshake', title: 'Programme-Specific Relationships', desc: 'Direct relationships with immigration authorities, approved agents, and government-endorsed developers in Portugal, Greece, Malta, the Caribbean, Turkey, and the UAE.' },
                { icon: 'savings', title: 'Integrated Wealth Planning', desc: 'Investment migration is rarely standalone. We coordinate with your existing investment strategy, tax planning, and business structure to ensure migration complements your broader financial picture.' },
                { icon: 'lock', title: 'Confidential & Discreet', desc: 'We understand the sensitivity of migration decisions for high-net-worth families. Every engagement is handled with institutional-grade confidentiality and discretion from initial enquiry through to completion.' },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Your next chapter starts with <span className="text-primary">the right programme.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Residency, citizenship, and global mobility &mdash; structured around your investment goals, family needs, and long-term vision.</p>
            <Link href="/contact?interest=Investment%20Migration#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Book a Confidential Consultation &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />

      {/* Meeting Scheduling Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5" onClick={(e) => { if (e.target === e.currentTarget) setShowMeetingModal(false); }}>
          <div className="bg-surface-container-lowest border border-outline-variant/10 w-full max-w-[480px] max-h-[90vh] overflow-y-auto p-9 relative">
            <button onClick={() => setShowMeetingModal(false)} className="absolute top-4 right-4 text-on-surface-variant/30 text-xl hover:text-on-surface-variant transition-colors">&times;</button>

            {meetingSuccess ? (
              <div className="text-center py-5">
                <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center bg-green-500/15 text-green-500 text-3xl">&#10003;</div>
                <h3 className="cinzel-text text-xl text-on-surface mb-3">Meeting Request Submitted</h3>
                <p className="raleway-text text-sm text-on-surface-variant/45 leading-relaxed mb-2">
                  Your meeting request for <strong className="text-primary">{selectedCountry}</strong> investment migration has been submitted.
                </p>
                <p className="raleway-text text-xs text-on-surface-variant/30 leading-relaxed">Our investment migration team will confirm your appointment shortly via email.</p>
                <button onClick={() => setShowMeetingModal(false)} className="mt-6 liquid-gold-bg text-on-primary px-7 py-2.5 font-semibold text-sm">Close</button>
              </div>
            ) : (
              <>
                <h3 className="cinzel-text text-xl text-on-surface mb-1">Schedule a Consultation</h3>
                <p className="raleway-text text-sm text-on-surface-variant/40 mb-6 leading-relaxed">
                  Book a meeting to discuss your <strong className="text-primary">{selectedCountry}</strong> investment migration application.
                </p>

                {meetingError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 mb-4">
                    <p className="raleway-text text-sm text-red-400 m-0">{meetingError}</p>
                  </div>
                )}

                <form onSubmit={handleMeetingSubmit} className="flex flex-col gap-4">
                  {[
                    { label: 'Full Name *', type: 'text', key: 'name', required: true },
                    { label: 'Email *', type: 'email', key: 'email', required: true },
                    { label: 'Phone', type: 'tel', key: 'phone', required: false, placeholder: '+44 000 000 0000' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block raleway-text text-[0.68rem] tracking-[0.05em] text-on-surface-variant/40 uppercase mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        value={meetingForm[field.key as keyof typeof meetingForm]}
                        onChange={e => setMeetingForm(f => ({ ...f, [field.key]: e.target.value }))}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3.5 py-2.5 text-on-surface raleway-text text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block raleway-text text-[0.68rem] tracking-[0.05em] text-on-surface-variant/40 uppercase mb-1.5">Preferred Date *</label>
                      <input type="date" value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} required min={new Date().toISOString().split('T')[0]} className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3.5 py-2.5 text-on-surface raleway-text text-sm outline-none focus:border-primary transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block raleway-text text-[0.68rem] tracking-[0.05em] text-on-surface-variant/40 uppercase mb-1.5">Preferred Time *</label>
                      <select value={meetingForm.time} onChange={e => setMeetingForm(f => ({ ...f, time: e.target.value }))} required className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3.5 py-2.5 text-on-surface raleway-text text-sm outline-none focus:border-primary transition-colors">
                        <option value="">Select time</option>
                        {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                          <option key={t} value={t}>{parseInt(t) > 12 ? `${String(parseInt(t) - 12).padStart(2, '0')}:00 PM` : `${t} AM`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block raleway-text text-[0.68rem] tracking-[0.05em] text-on-surface-variant/40 uppercase mb-1.5">Additional Notes</label>
                    <textarea value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any specific questions or requirements..." className="w-full bg-surface-container-lowest border border-outline-variant/10 px-3.5 py-2.5 text-on-surface raleway-text text-sm outline-none focus:border-primary transition-colors resize-none" />
                  </div>
                  <button type="submit" disabled={meetingSubmitting} className={`w-full liquid-gold-bg text-on-primary px-6 py-3.5 font-bold tracking-[0.15em] uppercase text-sm ${meetingSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'} transition-opacity`}>
                    {meetingSubmitting ? 'Submitting...' : 'Schedule Meeting'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
