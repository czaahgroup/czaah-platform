'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

const fleetData = [
  { category: 'sedan', classLabel: 'Executive Sedan', name: 'Mercedes-Benz S-Class', specs: ['4 passengers', 'Chauffeur driven', 'Wi-Fi & privacy glass'], desc: "The global standard for executive travel. Latest S-Class with premium interior, rear entertainment, and complete discretion. Available across Islamabad, Lahore, and Karachi.", img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Mercedes+S-Class' },
  { category: 'sedan', classLabel: 'Executive Sedan', name: 'BMW 7 Series', specs: ['4 passengers', 'Executive lounge rear', 'Night vision'], desc: 'Ultimate driving comfort meets executive presence. Extended wheelbase with rear executive lounge seating, Bowers & Wilkins surround, and gesture control.', img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=BMW+7+Series' },
  { category: 'suv', classLabel: 'Luxury SUV', name: 'Toyota Land Cruiser 300', specs: ['6 passengers', 'All-terrain', 'Inter-city capable'], desc: "Pakistan's most trusted luxury SUV. Engineered for every road condition — from Islamabad's diplomatic enclave to Balochistan's mine sites. The vehicle of choice for corporate inter-city travel.", img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Land+Cruiser+300' },
  { category: 'suv', classLabel: 'Luxury SUV', name: 'Range Rover Autobiography', specs: ['4 passengers', 'Meridian audio', 'Executive 4-seat config'], desc: "British luxury meets all-terrain capability. The Autobiography's executive 4-seat configuration transforms inter-city journeys into first-class experiences.", img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Range+Rover' },
  { category: 'suv', classLabel: 'Prestige SUV', name: 'Mercedes GLS 600 Maybach', specs: ['4 passengers', 'Maybach luxury', 'Champagne cooler'], desc: 'The pinnacle of SUV luxury. Maybach-grade interior with individual rear seats, champagne cooler, and noise-cancelling cabin. For when presence must be absolute.', img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Mercedes+Maybach+GLS' },
  { category: 'armoured', classLabel: 'Armoured Vehicle', name: 'Armoured Land Cruiser (B6+)', specs: ['4 passengers', 'B6+ protection', 'Run-flat tyres'], desc: 'Certified ballistic protection to B6+ standard. Armoured body panels, ballistic glass, run-flat tyres, and emergency communications. Maintained and re-certified annually. Security driver included.', img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Armoured+LC300' },
  { category: 'armoured', classLabel: 'Armoured Sedan', name: 'Armoured Mercedes S-Guard', specs: ['3 passengers', 'B6+ protection', 'Discreet profile'], desc: 'Executive protection without the convoy look. Factory-armoured Mercedes S-Guard maintains a civilian profile while delivering military-grade ballistic protection. Ideal for diplomatic and corporate principals.', img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Mercedes+S-Guard' },
  { category: 'prestige', classLabel: 'Prestige', name: 'Rolls-Royce Phantom', specs: ['3 passengers', 'Event & occasion', 'Advance booking only'], desc: 'Reserved for moments that demand the extraordinary. Weddings, state-level hospitality, and occasions where the vehicle IS the statement. Limited availability — advance booking essential.', img: 'https://placehold.co/700x320/0a0a0a/C9A84C?text=Rolls-Royce+Phantom' },
];

export default function LuxuryRentalsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach((el) => { observerRef.current?.observe(el); });
    return () => observerRef.current?.disconnect();
  }, []);

  function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const selects = form.querySelectorAll('.lx-form-select') as NodeListOf<HTMLSelectElement>;
    const dateInput = form.querySelector('#lxDate') as HTMLInputElement;
    let valid = true;
    selects.forEach(sel => {
      if (!sel.value) { sel.style.borderColor = '#c0392b'; valid = false; } else { sel.style.borderColor = ''; }
    });
    if (dateInput && !dateInput.value) { dateInput.style.borderColor = '#c0392b'; valid = false; } else if (dateInput) { dateInput.style.borderColor = ''; }
    if (!valid) return;
    setQuoteSubmitted(true);
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Luxury-Rentals.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Executive Ground Transport</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Luxury Car<br /><span className="text-primary">Rental Fleets.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Premium and armoured vehicle fleets for executives, delegations, and high-profile clients across Pakistan, the Gulf, and the United Kingdom &mdash; from daily executive transport to long-term corporate fleet programmes.</p>
            <a href="/contact?interest=Luxury%20Car%20Rentals#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Reserve a Vehicle &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* FLEET GALLERY */}
        <style>{`
          .lx-vehicle-card { display: flex; border: 1px solid var(--black-border); overflow: hidden; background: var(--black-card); height: 320px; transition: border-color 0.3s var(--ease-smooth), box-shadow 0.3s var(--ease-smooth); }
          .lx-vehicle-card.lx-hidden { display: none; }
          .lx-vehicle-card:hover { border-color: var(--gold-dim); box-shadow: 0 0 30px rgba(201, 168, 76, 0.08); }
          .lx-vehicle-img { width: 55%; position: relative; overflow: hidden; }
          .lx-vehicle-img img { width: 100%; height: 100%; object-fit: cover; transition: filter 0.4s var(--ease-smooth), transform 0.4s var(--ease-smooth); }
          .lx-vehicle-card:hover .lx-vehicle-img img { filter: brightness(1.1); transform: scale(1.02); }
          .lx-vehicle-img::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 80px; background: linear-gradient(to right, transparent, var(--black-card)); }
          .lx-vehicle-info { width: 45%; padding: 40px 36px; display: flex; flex-direction: column; justify-content: center; }
          .lx-vehicle-class { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 12px; }
          .lx-vehicle-name { font-family: 'Cinzel', serif; font-size: 30px; color: var(--white); margin-bottom: 16px; line-height: 1.2; }
          .lx-vehicle-specs { display: flex; gap: 20px; margin-bottom: 18px; flex-wrap: wrap; }
          .lx-vehicle-specs span { font-size: 12px; color: var(--white-dim); letter-spacing: 0.03em; padding: 5px 12px; background: var(--black-elevated); white-space: nowrap; }
          .lx-vehicle-desc { font-size: 14px; color: var(--white-muted); line-height: 1.7; margin-bottom: 24px; }
          .lx-reserve-link { font-size: 13px; color: var(--gold); text-decoration: none; font-weight: 500; letter-spacing: 0.05em; transition: color 0.3s; }
          .lx-reserve-link:hover { color: var(--gold-light); }
          .lx-quote-card { background: var(--black-card); border: 1px solid var(--black-border); padding: 40px; border-top: 2px solid var(--gold); }
          .lx-quote-form { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          .lx-form-group { display: flex; flex-direction: column; }
          .lx-form-group.lx-full-width { grid-column: 1 / -1; }
          .lx-form-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; font-weight: 500; }
          .lx-form-input, .lx-form-select { background: var(--black-elevated); border: 1px solid var(--black-border); color: var(--white); padding: 14px 16px; font-family: 'Raleway', sans-serif; font-size: 14px; transition: border-color 0.3s var(--ease-smooth); outline: none; width: 100%; box-sizing: border-box; }
          .lx-form-input:focus, .lx-form-select:focus { border-color: var(--gold); }
          .lx-quote-success { display: none; text-align: center; padding: 48px 24px; }
          .lx-quote-success.lx-visible { display: block; }
          .lx-quote-success-icon { font-size: 48px; margin-bottom: 16px; color: var(--gold); }
          .lx-quote-success h3 { font-family: 'Cinzel', serif; font-size: 28px; color: var(--white); margin-bottom: 12px; }
          .lx-quote-success p { color: var(--white-muted); font-size: 15px; }
          @media (max-width: 1024px) { .lx-vehicle-card { height: auto; } .lx-vehicle-img { width: 45%; min-height: 280px; } .lx-vehicle-info { width: 55%; padding: 32px 28px; } .lx-vehicle-name { font-size: 26px; } }
          @media (max-width: 768px) { .lx-vehicle-card { flex-direction: column; height: auto; } .lx-vehicle-img { width: 100%; height: 200px; min-height: auto; } .lx-vehicle-img::after { display: none; } .lx-vehicle-info { width: 100%; padding: 24px 20px; } .lx-vehicle-name { font-size: 24px; } .lx-vehicle-specs { gap: 8px; } .lx-quote-form { grid-template-columns: 1fr; } .lx-quote-card { padding: 28px 20px; } }
        `}</style>

        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">The <span className="text-primary">Fleet.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Eight classes of vehicle. One standard of excellence.</p>

            <div className="flex gap-3 mb-12 flex-wrap">
              {[{ label: 'All', val: 'all' }, { label: 'Executive Sedans', val: 'sedan' }, { label: 'Luxury SUVs', val: 'suv' }, { label: 'Armoured', val: 'armoured' }, { label: 'Prestige', val: 'prestige' }].map(f => (
                <button key={f.val} className={`raleway-text text-xs tracking-[0.1em] uppercase px-6 py-3 border transition-all ${activeFilter === f.val ? 'liquid-gold-bg text-on-primary border-transparent font-bold' : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-on-surface'}`} onClick={() => setActiveFilter(f.val)}>{f.label}</button>
              ))}
            </div>

            <div className="flex flex-col gap-7">
              {fleetData.map((v, i) => (
                <div key={i} className={`lx-vehicle-card${activeFilter !== 'all' && v.category !== activeFilter ? ' lx-hidden' : ''}`}>
                  <div className="lx-vehicle-img">
                    <img src={v.img} alt={v.name} loading="lazy" />
                  </div>
                  <div className="lx-vehicle-info">
                    <div className="lx-vehicle-class">{v.classLabel}</div>
                    <div className="lx-vehicle-name">{v.name}</div>
                    <div className="lx-vehicle-specs">
                      {v.specs.map((s, j) => (<span key={j}>{s}</span>))}
                    </div>
                    <p className="lx-vehicle-desc">{v.desc}</p>
                    <a href="/contact" className="lx-reserve-link">Reserve &rarr;</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* QUICK QUOTE */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Quick <span className="text-primary">Quote.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Tell us what you need. We will respond with availability and pricing.</p>

            <div className="lx-quote-card">
              {!quoteSubmitted ? (
                <form className="lx-quote-form" onSubmit={handleQuoteSubmit}>
                  <div className="lx-form-group">
                    <label className="lx-form-label" htmlFor="lxVehicleClass">Vehicle Class</label>
                    <select className="lx-form-select" id="lxVehicleClass" required defaultValue="">
                      <option value="" disabled>Select vehicle class</option>
                      <option value="Executive Sedan">Executive Sedan</option>
                      <option value="Luxury SUV">Luxury SUV</option>
                      <option value="Armoured Vehicle">Armoured Vehicle</option>
                      <option value="Prestige / Occasion">Prestige / Occasion</option>
                      <option value="Full Fleet (Multiple Vehicles)">Full Fleet (Multiple Vehicles)</option>
                    </select>
                  </div>
                  <div className="lx-form-group">
                    <label className="lx-form-label" htmlFor="lxServiceType">Service Type</label>
                    <select className="lx-form-select" id="lxServiceType" required defaultValue="">
                      <option value="" disabled>Select service type</option>
                      <option value="Airport Transfer">Airport Transfer</option>
                      <option value="Daily Chauffeur">Daily Chauffeur</option>
                      <option value="Multi-Day Hire">Multi-Day Hire</option>
                      <option value="Corporate Contract">Corporate Contract</option>
                      <option value="Event / Wedding">Event / Wedding</option>
                      <option value="Self-Drive">Self-Drive</option>
                    </select>
                  </div>
                  <div className="lx-form-group">
                    <label className="lx-form-label" htmlFor="lxCity">City</label>
                    <select className="lx-form-select" id="lxCity" required defaultValue="">
                      <option value="" disabled>Select city</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Peshawar">Peshawar</option>
                      <option value="Inter-City">Inter-City</option>
                      <option value="Gulf (Dubai/Abu Dhabi)">Gulf (Dubai/Abu Dhabi)</option>
                      <option value="London / UK">London / UK</option>
                    </select>
                  </div>
                  <div className="lx-form-group">
                    <label className="lx-form-label" htmlFor="lxDuration">Duration</label>
                    <select className="lx-form-select" id="lxDuration" required defaultValue="">
                      <option value="" disabled>Select duration</option>
                      <option value="Single Trip">Single Trip</option>
                      <option value="Full Day (8hrs)">Full Day (8hrs)</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div className="lx-form-group">
                    <label className="lx-form-label" htmlFor="lxDate">Date Required</label>
                    <input type="date" className="lx-form-input" id="lxDate" required />
                  </div>
                  <div className="lx-form-group">
                    <label className="lx-form-label" htmlFor="lxRequirements">Special Requirements</label>
                    <input type="text" className="lx-form-input" id="lxRequirements" placeholder="e.g. security driver, child seat, multiple vehicles..." />
                  </div>
                  <div className="lx-form-group lx-full-width" style={{ alignItems: 'flex-start' }}>
                    <button type="submit" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">Request Quote &rarr;</button>
                    <p className="raleway-text text-on-surface-variant text-xs mt-5">Quotes typically returned within 2 hours during business hours.</p>
                  </div>
                </form>
              ) : (
                <div className="lx-quote-success lx-visible">
                  <div className="lx-quote-success-icon">&#10003;</div>
                  <h3>Quote Request <span className="text-primary">Received.</span></h3>
                  <p>Our fleet team will review your requirements and respond with availability and pricing shortly.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* TWO PILLARS */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in-left">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Executive Fleet</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Arrive like you <span className="text-primary">mean business.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Our executive fleet includes the latest models from Mercedes-Benz, BMW, Audi, Land Rover, and Toyota Land Cruiser — maintained to international standards and available with professional chauffeurs across Islamabad, Lahore, Karachi, London, and Gulf cities.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Whether it&apos;s airport transfers, multi-day business trips, or full corporate fleet contracts, every vehicle is presented immaculately with real-time tracking, backup vehicle guarantee, and 24/7 dispatch capability.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">For visiting executives, investor delegations, and diplomatic parties, our fleet ensures your ground transport matches the professionalism of your operations.</p>
            </div>
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Armoured &amp; Security</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Protection on <span className="text-primary">every route.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">For clients requiring enhanced security — mining executives in Balochistan, diplomatic personnel, or high-profile corporate visitors — CZAAH provides armoured vehicle services with trained security drivers and route planning.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Our armoured fleet includes B6 and B6+ certified vehicles from leading manufacturers, maintained to ballistic protection standards with regular certification. Integrated with our security services division for comprehensive protection packages.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Route reconnaissance, convoy coordination, and secure parking arrangements are standard. We operate where others can&apos;t — safely and discreetly.</p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SERVICES */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">fleet services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Comprehensive luxury ground transport for every requirement.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
              {[
                { icon: 'star', title: 'Executive Chauffeur', desc: 'Professional chauffeur-driven luxury vehicles for daily executive transport, airport transfers, and business travel. Vetted drivers with security clearance, city knowledge, and discretion as standard.' },
                { icon: 'business', title: 'Corporate Fleet Contracts', desc: 'Long-term vehicle leasing and fleet management for corporations operating in Pakistan, the Gulf, and the UK. Dedicated vehicles, assigned drivers, maintenance, insurance, and fleet administration handled end-to-end.' },
                { icon: 'shield', title: 'Armoured Transport', desc: 'B6/B6+ armoured SUVs and sedans with trained protection drivers. Route planning, convoy operations, and integration with close protection teams for high-risk environments.' },
                { icon: 'flight', title: 'VIP Delegation Fleets', desc: 'Multi-vehicle coordination for visiting delegations, investor tours, and corporate events. Matching vehicles, uniformed drivers, and real-time fleet tracking across multiple cities simultaneously.' },
                { icon: 'directions_car', title: 'Self-Drive Luxury', desc: 'Self-drive rental of premium vehicles for clients who prefer independence. Late-model luxury SUVs and sedans with comprehensive insurance, roadside assistance, and GPS navigation.' },
                { icon: 'celebration', title: 'Wedding & Event Fleets', desc: 'Prestige vehicle fleets for weddings, corporate galas, and high-profile events. Rolls-Royce, Bentley, and Mercedes S-Class available for special occasions with decorated presentation.' },
              ].map((svc, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4">{svc.icon}</span>
                  <h3 className="cinzel-text text-xl text-on-surface mb-3">{svc.title}</h3>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* FLEET CATEGORIES */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">The <span className="text-primary">fleet.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Premium vehicles maintained to international standards.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
              {[
                { icon: 'star', title: 'Executive Sedans', desc: 'Mercedes S-Class, BMW 7 Series, Audi A8 — the standard for executive business travel. Latest models with premium interiors, Wi-Fi, and privacy glass.' },
                { icon: 'terrain', title: 'Luxury SUVs', desc: 'Toyota Land Cruiser 300, Range Rover, Mercedes GLS, BMW X7 — capable on any terrain, comfortable on every road. Essential for site visits and inter-city travel across Pakistan.' },
                { icon: 'shield', title: 'Armoured Vehicles', desc: 'B6/B6+ certified Toyota Land Cruiser and Mercedes S-Guard. Ballistic glass, run-flat tyres, reinforced body panels, and communications equipment. Regularly re-certified to protection standards.' },
                { icon: 'diamond', title: 'Prestige & Occasion', desc: 'Rolls-Royce, Bentley, Mercedes-Maybach — available for weddings, diplomatic events, and occasions where presence matters. Limited availability, advance booking required.' },
              ].map((item, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 hover:border-primary/30 transition-all flex gap-6">
                  <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">{item.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-lg text-on-surface mb-2">{item.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* STATS */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-scale">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center stagger">
              {[
                { number: '24/7', label: 'Dispatch availability' },
                { number: '3', label: 'Pakistani cities covered' },
                { number: 'B6+', label: 'Armoured protection level' },
                { number: 'VIP', label: 'Delegation capability' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="cinzel-text text-primary text-4xl font-bold mb-2">{stat.number}</div>
                  <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto text-center">
            <h2 className="cinzel-text text-4xl text-on-surface mb-4">Ground transport, <span className="text-primary">elevated.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 max-w-2xl mx-auto">Premium vehicles, professional chauffeurs, and security logistics &mdash; across Pakistan, the Gulf, and the UK.</p>
            <a href="/contact?interest=Luxury%20Car%20Rentals#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Reserve a Vehicle &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
