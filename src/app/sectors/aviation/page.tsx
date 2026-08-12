'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

export default function AviationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach((el) => {
      observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const dateInput = document.getElementById('chartDate') as HTMLInputElement;
    const returnInput = document.getElementById('chartReturn') as HTMLInputElement;
    if (dateInput && returnInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
      returnInput.setAttribute('min', today);
    }
  }, []);

  function highlightEmpty(step: number) {
    if (step === 1) {
      ['chartDeparture','chartDestination','chartDate','chartPax','chartTrip'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
        if (el && !el.value) {
          el.style.borderColor = '#c9544c';
          setTimeout(() => { el.style.borderColor = ''; }, 2000);
        }
      });
    }
    if (step === 2) {
      const opts = document.querySelector('.charter-options') as HTMLElement;
      if (opts) {
        opts.style.outline = '1px solid #c9544c';
        opts.style.borderRadius = '8px';
        setTimeout(() => { opts.style.outline = ''; }, 2000);
      }
    }
  }

  function charterNext(step: number) {
    if (step === 1) {
      const dep = (document.getElementById('chartDeparture') as HTMLSelectElement)?.value;
      const dest = (document.getElementById('chartDestination') as HTMLSelectElement)?.value;
      const date = (document.getElementById('chartDate') as HTMLInputElement)?.value;
      const pax = (document.getElementById('chartPax') as HTMLSelectElement)?.value;
      const trip = (document.getElementById('chartTrip') as HTMLSelectElement)?.value;
      if (!dep || !dest || !date || !pax || !trip) { highlightEmpty(step); return; }
    }
    if (step === 2) {
      const service = document.querySelector('input[name="serviceType"]:checked') as HTMLInputElement;
      if (!service) { highlightEmpty(step); return; }
      buildSummary();
    }
    setCurrentStep(step + 1);
  }

  function charterBack(step: number) {
    setCurrentStep(step - 1);
  }

  function buildSummary() {
    const dep = document.getElementById('chartDeparture') as HTMLSelectElement;
    const dest = document.getElementById('chartDestination') as HTMLSelectElement;
    const date = (document.getElementById('chartDate') as HTMLInputElement)?.value;
    const ret = (document.getElementById('chartReturn') as HTMLInputElement)?.value;
    const pax = (document.getElementById('chartPax') as HTMLSelectElement)?.value;
    const trip = document.getElementById('chartTrip') as HTMLSelectElement;
    const service = document.querySelector('input[name="serviceType"]:checked') as HTMLInputElement;
    const extras = Array.from(document.querySelectorAll('.charter-check input:checked')).map((c) => (c as HTMLInputElement).value);
    const notes = (document.getElementById('chartNotes') as HTMLTextAreaElement)?.value;

    let html = '<strong>Route:</strong> ' + dep?.options[dep.selectedIndex]?.text + ' &rarr; ' + dest?.options[dest.selectedIndex]?.text;
    html += ' &nbsp;|&nbsp; <strong>Date:</strong> ' + date;
    if (ret) html += ' &rarr; ' + ret;
    html += '<br><strong>Passengers:</strong> ' + pax;
    html += ' &nbsp;|&nbsp; <strong>Trip:</strong> ' + trip?.options[trip.selectedIndex]?.text;
    html += ' &nbsp;|&nbsp; <strong>Service:</strong> ' + (service?.value || '').replace(/-/g, ' ');
    if (extras.length) html += '<br><strong>Extras:</strong> ' + extras.map(e => e.replace(/-/g, ' ')).join(', ');
    if (notes) html += '<br><strong>Notes:</strong> ' + notes;

    const summaryEl = document.getElementById('charterSummary');
    if (summaryEl) summaryEl.innerHTML = html;
  }

  function submitCharter() {
    const name = (document.getElementById('chartName') as HTMLInputElement)?.value;
    const email = (document.getElementById('chartEmail') as HTMLInputElement)?.value;
    const phone = (document.getElementById('chartPhone') as HTMLInputElement)?.value;
    if (!name || !email || !phone) {
      ['chartName','chartEmail','chartPhone'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el && !el.value) {
          el.style.borderColor = '#c9544c';
          setTimeout(() => { el.style.borderColor = ''; }, 2000);
        }
      });
      return;
    }
    setShowSuccess(true);
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Aviation.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Private Aviation Services</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6"><span className="text-primary">Aviation.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Premium private charter, executive transport, and aviation logistics across Pakistan and the Gulf. Flexible scheduling, discreet service, and access to locations beyond commercial airline reach.</p>
            <a href="/contact?interest=Aviation#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Charter &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CHARTER SEARCH ENGINE */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in" id="charter-search">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Find your <span className="text-primary">flight.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-10 leading-relaxed">Search available routes and request a personalised charter quote. Our team responds within 24 hours.</p>

            <style>{`
              .charter-engine { background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant, #4d4637); border-opacity: 0.2; padding: 40px; margin-top: 40px; max-width: 900px; margin-left: auto; margin-right: auto; }
              .charter-steps { display: flex; gap: 4px; margin-bottom: 36px; border-bottom: 1px solid rgba(77,70,55,0.3); padding-bottom: 20px; }
              .charter-step { flex: 1; text-align: center; font-size: 13px; font-weight: 500; letter-spacing: 0.03em; color: var(--color-on-surface-variant); padding: 10px 0; position: relative; transition: color 0.3s; }
              .charter-step.active { color: var(--color-primary); }
              .charter-step.completed { color: rgba(229,226,225,0.5); }
              .charter-step::after { content: ''; position: absolute; bottom: -21px; left: 20%; right: 20%; height: 2px; background: transparent; transition: background 0.3s; }
              .charter-step.active::after { background: var(--color-primary); }
              .charter-step.completed::after { background: rgba(229,226,225,0.3); }
              .step-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--color-on-surface-variant); font-size: 11px; margin-right: 6px; transition: all 0.3s; }
              .charter-step.active .step-num { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-primary); }
              .charter-step.completed .step-num { border-color: rgba(229,226,225,0.3); background: rgba(229,226,225,0.3); color: #131313; }
              .charter-panel { display: none; }
              .charter-panel.active { display: block; animation: charterFadeIn 0.4s ease; }
              @keyframes charterFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
              .charter-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
              .charter-field.full-width { grid-column: 1 / -1; }
              .charter-field label { display: block; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-on-surface-variant); margin-bottom: 8px; }
              .charter-field select, .charter-field input, .charter-field textarea { width: 100%; padding: 12px 16px; background: var(--color-surface-container-lowest); border: 1px solid rgba(77,70,55,0.3); color: var(--color-on-surface); font-family: 'Raleway', sans-serif; font-size: 14px; transition: border-color 0.3s; outline: none; }
              .charter-field select:focus, .charter-field input:focus, .charter-field textarea:focus { border-color: var(--color-primary); }
              .charter-field select option { background: #131313; color: var(--color-on-surface); }
              .charter-field textarea { resize: vertical; min-height: 80px; }
              .charter-options { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
              .charter-option { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: var(--color-surface-container-lowest); border: 1px solid rgba(77,70,55,0.3); cursor: pointer; font-size: 13px; color: var(--color-on-surface-variant); transition: all 0.3s; }
              .charter-option:hover { border-color: var(--color-primary); color: var(--color-on-surface); }
              .charter-option input:checked + span { color: var(--color-primary); }
              .charter-option:has(input:checked) { border-color: var(--color-primary); background: rgba(230,195,100,0.06); }
              .charter-option input { display: none; }
              .charter-checks { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
              .charter-check { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--color-surface-container-lowest); border: 1px solid rgba(77,70,55,0.3); cursor: pointer; font-size: 13px; color: var(--color-on-surface-variant); transition: all 0.3s; }
              .charter-check:hover { border-color: var(--color-primary); color: var(--color-on-surface); }
              .charter-check:has(input:checked) { border-color: var(--color-primary); color: var(--color-primary); }
              .charter-check input { accent-color: var(--color-primary); }
              .charter-btns { display: flex; gap: 12px; justify-content: space-between; }
              .charter-next, .charter-submit { margin-left: auto; }
              .charter-summary { background: var(--color-surface-container-lowest); border: 1px solid rgba(77,70,55,0.3); padding: 20px 24px; margin-bottom: 28px; font-size: 13px; line-height: 1.8; color: var(--color-on-surface-variant); }
              .charter-summary strong { color: var(--color-primary); font-weight: 500; }
              .charter-success { display: none; text-align: center; padding: 40px 20px; }
              .charter-success.show { display: block; animation: charterFadeIn 0.5s ease; }
              .charter-success-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary); color: var(--color-on-primary); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin-bottom: 20px; }
              .charter-success h3 { margin-bottom: 12px; }
              .charter-success p { max-width: 480px; margin: 0 auto; color: var(--color-on-surface-variant); }
              @media (max-width: 768px) { .charter-engine { padding: 24px 20px; } .charter-form-grid { grid-template-columns: 1fr; } .charter-options { grid-template-columns: 1fr 1fr; } .charter-checks { grid-template-columns: 1fr; } .charter-steps { gap: 0; } .charter-step { font-size: 11px; } .step-num { width: 18px; height: 18px; font-size: 10px; margin-right: 4px; } .charter-btns { flex-direction: column-reverse; } .charter-next, .charter-submit { margin-left: 0; width: 100%; text-align: center; } }
            `}</style>

            <div className="charter-engine">
              <div className="charter-steps">
                <div className={`charter-step${currentStep === 1 ? ' active' : currentStep > 1 ? ' completed' : ''}`}><span className="step-num">1</span> Flight Details</div>
                <div className={`charter-step${currentStep === 2 ? ' active' : currentStep > 2 ? ' completed' : ''}`}><span className="step-num">2</span> Service Options</div>
                <div className={`charter-step${currentStep === 3 ? ' active' : ''}`}><span className="step-num">3</span> Request Quote</div>
              </div>

              {/* Step 1 */}
              <div className={`charter-panel${currentStep === 1 ? ' active' : ''}`}>
                <div className="charter-form-grid">
                  <div className="charter-field">
                    <label>Departure</label>
                    <select id="chartDeparture">
                      <option value="">Select departure city</option>
                      <option value="ISB">Islamabad (ISB)</option>
                      <option value="LHE">Lahore (LHE)</option>
                      <option value="KHI">Karachi (KHI)</option>
                      <option value="PEW">Peshawar (PEW)</option>
                      <option value="UET">Quetta (UET)</option>
                      <option value="GIL">Gilgit (GIL)</option>
                      <option value="SKT">Sialkot (SKT)</option>
                      <option value="DXB">Dubai (DXB)</option>
                      <option value="AUH">Abu Dhabi (AUH)</option>
                      <option value="JED">Jeddah (JED)</option>
                      <option value="DOH">Doha (DOH)</option>
                      <option value="OTHER">Other (specify in notes)</option>
                    </select>
                  </div>
                  <div className="charter-field">
                    <label>Destination</label>
                    <select id="chartDestination">
                      <option value="">Select destination</option>
                      <option value="ISB">Islamabad (ISB)</option>
                      <option value="LHE">Lahore (LHE)</option>
                      <option value="KHI">Karachi (KHI)</option>
                      <option value="PEW">Peshawar (PEW)</option>
                      <option value="UET">Quetta (UET)</option>
                      <option value="GIL">Gilgit (GIL)</option>
                      <option value="SKT">Sialkot (SKT)</option>
                      <option value="GWD">Gwadar (GWD)</option>
                      <option value="TUK">Turbat (TUK)</option>
                      <option value="DXB">Dubai (DXB)</option>
                      <option value="AUH">Abu Dhabi (AUH)</option>
                      <option value="JED">Jeddah (JED)</option>
                      <option value="DOH">Doha (DOH)</option>
                      <option value="REMOTE">Remote Site (specify in notes)</option>
                      <option value="OTHER">Other (specify in notes)</option>
                    </select>
                  </div>
                  <div className="charter-field">
                    <label>Departure Date</label>
                    <input type="date" id="chartDate" />
                  </div>
                  <div className="charter-field">
                    <label>Return Date <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 300 }}>(optional)</span></label>
                    <input type="date" id="chartReturn" />
                  </div>
                  <div className="charter-field">
                    <label>Passengers</label>
                    <select id="chartPax">
                      <option value="">Select</option>
                      <option value="1-2">1–2</option>
                      <option value="3-5">3–5</option>
                      <option value="6-8">6–8</option>
                      <option value="9-12">9–12</option>
                      <option value="13+">13+</option>
                    </select>
                  </div>
                  <div className="charter-field">
                    <label>Trip Type</label>
                    <select id="chartTrip">
                      <option value="">Select</option>
                      <option value="one-way">One Way</option>
                      <option value="return">Return</option>
                      <option value="multi-leg">Multi-Leg</option>
                    </select>
                  </div>
                </div>
                <button className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm charter-next" onClick={() => charterNext(1)}>Continue to Service Options &rarr;</button>
              </div>

              {/* Step 2 */}
              <div className={`charter-panel${currentStep === 2 ? ' active' : ''}`}>
                <div className="charter-form-grid">
                  <div className="charter-field full-width">
                    <label>Service Type</label>
                    <div className="charter-options">
                      <label className="charter-option"><input type="radio" name="serviceType" value="private-charter" /> <span><span className="material-symbols-outlined text-base align-middle mr-1">flight</span> Private Charter</span></label>
                      <label className="charter-option"><input type="radio" name="serviceType" value="executive-transport" /> <span><span className="material-symbols-outlined text-base align-middle mr-1">diamond</span> Executive Transport</span></label>
                      <label className="charter-option"><input type="radio" name="serviceType" value="site-access" /> <span><span className="material-symbols-outlined text-base align-middle mr-1">location_on</span> Site Access Flight</span></label>
                      <label className="charter-option"><input type="radio" name="serviceType" value="vip-delegation" /> <span><span className="material-symbols-outlined text-base align-middle mr-1">star</span> VIP Delegation</span></label>
                      <label className="charter-option"><input type="radio" name="serviceType" value="medevac" /> <span><span className="material-symbols-outlined text-base align-middle mr-1">medical_services</span> Medical Evacuation</span></label>
                      <label className="charter-option"><input type="radio" name="serviceType" value="event" /> <span><span className="material-symbols-outlined text-base align-middle mr-1">event</span> Event Transport</span></label>
                    </div>
                  </div>
                  <div className="charter-field full-width">
                    <label>Additional Requirements</label>
                    <div className="charter-checks">
                      <label className="charter-check"><input type="checkbox" value="ground-transport" /> Ground transport at destination</label>
                      <label className="charter-check"><input type="checkbox" value="armoured" /> Armoured vehicle transfer</label>
                      <label className="charter-check"><input type="checkbox" value="security" /> Security escort</label>
                      <label className="charter-check"><input type="checkbox" value="catering" /> In-flight catering</label>
                      <label className="charter-check"><input type="checkbox" value="wifi" /> In-flight Wi-Fi</label>
                      <label className="charter-check"><input type="checkbox" value="overnight" /> Overnight accommodation</label>
                    </div>
                  </div>
                  <div className="charter-field full-width">
                    <label>Notes <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 300 }}>(optional)</span></label>
                    <textarea id="chartNotes" rows={3} placeholder="Special requirements, remote site coordinates, multi-leg itinerary details..."></textarea>
                  </div>
                </div>
                <div className="charter-btns">
                  <button className="border border-outline-variant/40 hover:border-primary text-on-surface-variant hover:text-on-surface px-7 py-4 raleway-text text-sm tracking-wide transition-all charter-back" onClick={() => charterBack(2)}>&larr; Back</button>
                  <button className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm charter-next" onClick={() => charterNext(2)}>Continue to Quote Request &rarr;</button>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`charter-panel${currentStep === 3 ? ' active' : ''}`}>
                {!showSuccess && (
                  <>
                    <div className="charter-summary" id="charterSummary"></div>
                    <div className="charter-form-grid">
                      <div className="charter-field">
                        <label>Full Name *</label>
                        <input type="text" id="chartName" placeholder="Your full name" />
                      </div>
                      <div className="charter-field">
                        <label>Email *</label>
                        <input type="email" id="chartEmail" placeholder="you@company.com" />
                      </div>
                      <div className="charter-field">
                        <label>Phone *</label>
                        <input type="tel" id="chartPhone" placeholder="+92 300 0000000" />
                      </div>
                      <div className="charter-field">
                        <label>Company <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 300 }}>(optional)</span></label>
                        <input type="text" id="chartCompany" placeholder="Company name" />
                      </div>
                    </div>
                    <div className="charter-btns">
                      <button className="border border-outline-variant/40 hover:border-primary text-on-surface-variant hover:text-on-surface px-7 py-4 raleway-text text-sm tracking-wide transition-all charter-back" onClick={() => charterBack(3)}>&larr; Back</button>
                      <button className="liquid-gold-bg text-on-primary px-8 py-4 font-bold tracking-[0.15em] uppercase text-sm charter-submit" onClick={submitCharter}>Request a Quote &rarr;</button>
                    </div>
                  </>
                )}
                <div className={`charter-success${showSuccess ? ' show' : ''}`}>
                  <div className="charter-success-icon">&#10003;</div>
                  <h3 className="cinzel-text text-2xl text-on-surface">Quote request <span className="text-primary">submitted.</span></h3>
                  <p>Thank you. Our aviation team will review your requirements and get back to you within 24 hours with a personalised quote.</p>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', marginTop: '12px' }}>For urgent requests, call <span className="text-primary">+92 51 000 0000</span></p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* TWO PILLARS */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in-left">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Private Charter</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Fly on <span className="text-primary">your schedule.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Executive charter services between Pakistan&apos;s major cities — Islamabad, Lahore, Karachi — and Gulf destinations. No commercial airline constraints, no fixed timetables.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Whether it&apos;s a same-day business trip, a multi-city itinerary, or a last-minute departure, our fleet and operations team deliver seamless private air travel tailored to your requirements.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Discreet, comfortable, and efficient — designed for executives and organisations who value their time above all else.</p>
            </div>
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Remote Access</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Reach places others <span className="text-primary">can&apos;t.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Many of Pakistan&apos;s most significant mining sites, infrastructure projects, and development zones are located in areas with no commercial air service — Balochistan, Gilgit-Baltistan, and remote KPK.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">We provide reliable air access to these locations for site inspections, project oversight, investor visits, and executive travel — safely and on your timeline.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">Purpose-built for the mining, infrastructure, and energy sectors where time-critical site access directly impacts project success.</p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SERVICES */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Comprehensive private aviation solutions for corporate, industrial, and diplomatic clients.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: 'flight', title: 'Private Charter', desc: 'On-demand private flights between Pakistani cities and Gulf destinations. Flexible scheduling, premium cabins, and dedicated flight crews for your comfort and privacy.' },
                { icon: 'diamond', title: 'Executive Transport', desc: 'Scheduled executive shuttle services for corporations with regular inter-city travel needs. Membership programmes with guaranteed availability and priority booking.' },
                { icon: 'location_on', title: 'Site Access Flights', desc: 'Reliable air access to remote mining, energy, and infrastructure project sites across Balochistan, KPK, and Gilgit-Baltistan — locations beyond commercial airline reach.' },
                { icon: 'star', title: 'VIP Delegation Logistics', desc: 'End-to-end air logistics for visiting delegations — international executives, diplomatic missions, and investor groups touring multiple sites across Pakistan.' },
                { icon: 'medical_services', title: 'Medical Evacuation', desc: 'Emergency medical evacuation services for mining operations, construction sites, and remote industrial facilities. 24/7 dispatch capability with medical crew coordination.' },
                { icon: 'event', title: 'Event Transport', desc: 'Charter services for conferences, corporate retreats, and high-profile events. Multi-aircraft coordination for large groups with seamless ground-air-ground logistics.' },
              ].map((card, i) => (
                <div key={i} className="border border-outline-variant/10 bg-surface-container-low p-8 transition-all duration-300 hover:border-primary/30">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="cinzel-text text-on-surface text-lg font-semibold mb-3">{card.title}</h3>
                  <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SAFETY & COMPLIANCE */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Safety &amp; <span className="text-primary">compliance.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Every flight meets the highest safety and regulatory standards.</p>

            <div className="flex flex-col gap-4">
              {[
                { icon: 'verified_user', title: 'CAA Certified', desc: 'All operations are conducted under Pakistan Civil Aviation Authority licensing with full regulatory compliance, regular audits, and maintained safety documentation.' },
                { icon: 'workspace_premium', title: 'Air Operator Certificate', desc: 'AOC-certified commercial charter operations demonstrating adherence to international safety standards, crew qualifications, and comprehensive insurance coverage.' },
                { icon: 'build', title: 'Maintained Fleet', desc: 'Aircraft maintained to manufacturer specifications with independent third-party inspections. Full maintenance records and airworthiness certification on every flight.' },
                { icon: 'groups', title: 'Experienced Crews', desc: 'Highly experienced pilots with thousands of hours on Pakistani and Gulf routes, including mountainous terrain and remote airstrip operations.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6 border border-outline-variant/10 bg-surface-container-low p-6 transition-all duration-300 hover:border-primary/30">
                  <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0 mt-1">{item.icon}</span>
                  <div>
                    <h4 className="cinzel-text text-on-surface text-lg font-semibold mb-2">{item.title}</h4>
                    <p className="raleway-text text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* STATS */}
        <section className="py-32 px-5 md:px-24 bg-surface text-center fade-in-scale">
          <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '24/7', label: 'Charter dispatch availability' },
              { number: 'PK+Gulf', label: 'Route coverage' },
              { number: 'VIP', label: 'Delegation logistics' },
              { number: 'AOC', label: 'Certified operations' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="cinzel-text text-primary text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest text-center fade-in">
          <div className="max-w-3xl mx-auto">
            <h2 className="cinzel-text text-4xl md:text-5xl text-on-surface mb-4">Travel on <span className="text-primary">your terms.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg mb-10">Private charter, executive transport, and site access logistics across Pakistan and the Gulf.</p>
            <a href="/contact?interest=Aviation#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Request a Charter &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
