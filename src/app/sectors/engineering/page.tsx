'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

const serviceData = [
  {
    desc: 'Comprehensive engineering consultancy for commercial, industrial, and infrastructure projects. Our engineering teams deliver structural analysis, mechanical design, electrical systems planning, and project management from concept through commissioning.',
    deliverables: ['Structural engineering & analysis', 'MEP system design', 'Engineering project management', 'Technical specifications & BOQs', 'Compliance with Pakistan Building Code'],
    stat: 'Full-spectrum engineering \u2014 structural, mechanical, electrical, environmental'
  },
  {
    desc: 'Design, supply, installation, and maintenance of heating, ventilation, and air conditioning systems. From high-rise commercial towers to industrial facilities and hospitals \u2014 we deliver climate control solutions engineered for Pakistan\u2019s demanding environment.',
    deliverables: ['HVAC system design & load calculation', 'Ductwork design & installation', 'Chiller plant engineering', 'Building Management System (BMS) integration', 'Preventive maintenance contracts'],
    stat: 'Commercial, industrial & healthcare \u2014 systems designed for 45\u00B0C+ climates'
  },
  {
    desc: 'Supply, installation, and maintenance of passenger and freight elevator systems for commercial buildings, residential towers, hospitals, and industrial facilities. We partner with leading global manufacturers to deliver reliable vertical transportation.',
    deliverables: ['Elevator system design & specification', 'Supply from global OEMs (Otis, Schindler, KONE)', 'Installation & commissioning', 'Annual maintenance contracts (AMC)', 'Modernisation of existing systems'],
    stat: 'From 4-stop residential to 50+ floor high-rise \u2014 all capacities covered'
  },
  {
    desc: 'Escalator and moving walkway systems for shopping malls, airports, metro stations, and commercial complexes. Engineered for Pakistan\u2019s high-traffic environments with robust safety systems and energy-efficient operation.',
    deliverables: ['Traffic flow analysis & system sizing', 'Escalator supply & installation', 'Moving walkway solutions', 'Safety compliance & inspection', 'Service & maintenance contracts'],
    stat: 'Malls, airports, metro \u2014 designed for 10,000+ daily passengers'
  },
  {
    desc: 'Design, supply, and commissioning of power generation systems for commercial, industrial, and infrastructure projects. From backup generators to captive power plants \u2014 we deliver reliable electricity where the grid cannot.',
    deliverables: ['Power plant design & feasibility', 'Generator supply (Caterpillar, Cummins, Perkins)', 'HT/LT switchgear & distribution', 'Synchronisation & load management', 'Operations & maintenance support'],
    stat: '100 kVA to 50 MW \u2014 backup, captive & independent power solutions'
  },
  {
    desc: 'Ground-up civil engineering and construction services \u2014 earthworks, foundations, structural concrete, drainage systems, and site development. We execute civil works for commercial, residential, and infrastructure projects with quality assurance at every stage.',
    deliverables: ['Site preparation & earthworks', 'Foundation engineering (piling, raft, strip)', 'Structural concrete & reinforcement', 'Drainage & water management', 'Road works & external development'],
    stat: 'From site clearing to structural handover \u2014 complete civil execution'
  },
  {
    desc: 'End-to-end solar photovoltaic solutions \u2014 from rooftop installations for commercial buildings to utility-scale solar farms. Pakistan receives 300+ sunny days per year, making solar the most compelling renewable energy investment in the country.',
    deliverables: ['Solar feasibility & energy yield analysis', 'PV system design & engineering', 'Panel supply (Tier-1 manufacturers)', 'Installation & grid interconnection', 'Net metering application & approval'],
    stat: '300+ sunny days \u2014 Pakistan\u2019s solar potential: 2.9 million MW'
  },
  {
    desc: 'Complete air conditioning solutions for offices, retail spaces, hotels, hospitals, and industrial facilities. We design and install central AC plants, VRF/VRV systems, split units, and chiller-based cooling systems optimised for energy efficiency.',
    deliverables: ['Cooling load assessment', 'Central plant design (chilled water systems)', 'VRF/VRV multi-zone systems', 'Split & ductless solutions', 'Energy optimisation & controls'],
    stat: 'Energy-efficient cooling \u2014 20\u201340% savings with modern inverter technology'
  },
  {
    desc: 'End-to-end oil and gas engineering services spanning upstream exploration support, midstream pipeline infrastructure, and downstream refinery and processing operations. Pakistan\u2019s growing energy demands and strategic pipeline corridors \u2014 including TAPI and Pakistan Stream \u2014 create significant opportunities across the hydrocarbon value chain.',
    deliverables: ['Upstream exploration & production support', 'Pipeline design, construction & integrity management', 'Refinery & processing plant engineering', 'LPG & LNG terminal infrastructure', 'HSE compliance & environmental management', 'Gas compression & metering stations'],
    stat: 'Upstream to downstream \u2014 full hydrocarbon value chain engineering'
  }
];

export default function EngineeringPage() {
  const [activeIdx, setActiveIdx] = useState<number>(-1);
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

  function handleCardClick(idx: number) {
    if (idx === activeIdx) {
      setActiveIdx(-1);
    } else {
      setActiveIdx(idx);
    }
  }

  function renderExpanded(rowStart: number, rowEnd: number) {
    if (activeIdx < rowStart || activeIdx >= rowEnd) return null;
    const d = serviceData[activeIdx];
    return (
      <div className={`overflow-hidden transition-all duration-500 border border-outline-variant/20 bg-surface-container-lowest mt-2 ${activeIdx >= rowStart && activeIdx < rowEnd ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ gridColumn: '1 / -1' }}>
        <div className="p-10">
          <p className="raleway-text text-on-surface-variant text-[0.95rem] leading-[1.7] mb-7">{d.desc}</p>
          <div className="flex gap-12 mb-7">
            <div className="flex-1">
              <h4 className="cinzel-text text-on-surface text-base mb-3.5">Key Deliverables</h4>
              <ul className="list-none p-0 m-0">
                {d.deliverables.map((item, i) => (
                  <li key={i} className="relative pl-[18px] text-on-surface-variant text-sm leading-[1.6] mb-2 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant/20 pt-5">
            <span className="cinzel-text text-primary text-base tracking-wide">{d.stat}</span>
            <a href="/contact" className="text-primary text-sm font-medium hover:opacity-75 transition-opacity">Enquire &rarr;</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Engineering.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">MEP &amp; Energy Solutions</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Engineering &amp;<br /><span className="text-primary">Energy.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">Integrated engineering and energy solutions across Pakistan &mdash; HVAC systems, elevator installations, solar power, civil engineering, industrial air conditioning, and oil &amp; gas infrastructure, delivered through global OEM partnerships.</p>
            <a href="/contact?interest=Engineering%20%26%20Energy#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss a Project &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SERVICE SHOWCASE */}
        <style>{`
          .eg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          @media (max-width: 900px) { .eg-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 540px) { .eg-grid { grid-template-columns: 1fr; } }
        `}</style>

        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Nine integrated engineering and energy service lines — select a service to explore our capabilities.</p>

            <div className="eg-grid" id="egGrid">
              {[
                { icon: 'engineering', name: 'Engineering', tagline: 'Structural, mechanical & electrical' },
                { icon: 'thermostat', name: 'HVAC', tagline: 'Climate control for any scale' },
                { icon: 'elevator', name: 'Elevators', tagline: 'Passenger & freight solutions' },
                { icon: 'escalator', name: 'Escalators', tagline: 'High-traffic movement systems' },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`bg-surface-container-low border border-outline-variant/10 p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 ${activeIdx === i ? 'border-primary shadow-[0_0_24px_rgba(230,195,100,0.15)] -translate-y-1' : ''}`}
                  onClick={() => handleCardClick(i)}
                >
                  <div className={`material-symbols-outlined text-[2.5rem] mb-3 transition-colors ${activeIdx === i ? 'text-primary' : 'text-on-surface-variant'}`}>{card.icon}</div>
                  <div className="cinzel-text text-on-surface text-lg font-semibold mb-1.5">{card.name}</div>
                  <div className="raleway-text text-on-surface-variant text-xs">{card.tagline}</div>
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-300 ${activeIdx === i ? 'scale-x-100' : 'scale-x-0'}`} />
                </div>
              ))}
              {renderExpanded(0, 4)}

              {[
                { icon: 'bolt', name: 'Power Generation', tagline: 'Diesel, gas & hybrid systems' },
                { icon: 'foundation', name: 'Civil Works', tagline: 'Foundations to finishing' },
                { icon: 'solar_power', name: 'Solar Panels', tagline: 'Rooftop to utility-scale' },
                { icon: 'ac_unit', name: 'Air Conditioning', tagline: 'Central, split & VRF systems' },
              ].map((card, i) => (
                <div
                  key={i + 4}
                  className={`bg-surface-container-low border border-outline-variant/10 p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 ${activeIdx === i + 4 ? 'border-primary shadow-[0_0_24px_rgba(230,195,100,0.15)] -translate-y-1' : ''}`}
                  onClick={() => handleCardClick(i + 4)}
                >
                  <div className={`material-symbols-outlined text-[2.5rem] mb-3 transition-colors ${activeIdx === i + 4 ? 'text-primary' : 'text-on-surface-variant'}`}>{card.icon}</div>
                  <div className="cinzel-text text-on-surface text-lg font-semibold mb-1.5">{card.name}</div>
                  <div className="raleway-text text-on-surface-variant text-xs">{card.tagline}</div>
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-300 ${activeIdx === i + 4 ? 'scale-x-100' : 'scale-x-0'}`} />
                </div>
              ))}
              {renderExpanded(4, 8)}

              <div
                className={`bg-surface-container-low border border-outline-variant/10 p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 ${activeIdx === 8 ? 'border-primary shadow-[0_0_24px_rgba(230,195,100,0.15)] -translate-y-1' : ''}`}
                onClick={() => handleCardClick(8)}
              >
                <div className={`material-symbols-outlined text-[2.5rem] mb-3 transition-colors ${activeIdx === 8 ? 'text-primary' : 'text-on-surface-variant'}`}>oil_barrel</div>
                <div className="cinzel-text text-on-surface text-lg font-semibold mb-1.5">Oil &amp; Gas</div>
                <div className="raleway-text text-on-surface-variant text-xs">Upstream, downstream &amp; pipeline</div>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-transform duration-300 ${activeIdx === 8 ? 'scale-x-100' : 'scale-x-0'}`} />
              </div>
              {renderExpanded(8, 9)}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* OUR CAPABILITIES */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">capabilities.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Comprehensive engineering and energy project delivery.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: 'assignment', title: 'Project Management', desc: 'End-to-end engineering project management — from initial concept and feasibility through detailed design, procurement, installation, and commissioning. Independent oversight protecting timelines and budgets.' },
                { icon: 'architecture', title: 'Design & Engineering', desc: 'In-house design capabilities across structural, mechanical, electrical, and plumbing disciplines. Detailed engineering drawings, specifications, and BOQs prepared to international standards.' },
                { icon: 'local_shipping', title: 'Supply Chain', desc: 'Partnerships with global OEMs — Otis, Schindler, KONE, Caterpillar, Cummins, Daikin, Carrier, and Tier-1 solar panel manufacturers. Competitive procurement and import facilitation.' },
                { icon: 'build', title: 'Installation & Commissioning', desc: 'Professional installation teams for MEP systems, elevators, escalators, power plants, and solar arrays. Testing, balancing, and commissioning to ensure optimal performance from day one.' },
                { icon: 'handyman', title: 'Maintenance & AMC', desc: 'Ongoing Annual Maintenance Contracts for all installed systems. Preventive maintenance schedules, emergency response, spare parts management, and performance monitoring.' },
                { icon: 'verified', title: 'Compliance', desc: 'Full compliance with Pakistan Building Code, NEPRA regulations, PEC standards, and international safety certifications. Documentation, inspection coordination, and regulatory liaison.' },
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

        {/* STATS */}
        <section className="py-32 px-5 md:px-24 bg-surface text-center fade-in-scale">
          <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '9', label: 'Service lines' },
              { number: '3', label: 'Sectors served — commercial, industrial, infrastructure' },
              { number: 'Global', label: 'OEM partnerships' },
              { number: 'National', label: 'Pakistan-wide coverage' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="cinzel-text text-primary text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                <div className="raleway-text text-on-surface-variant text-sm uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* KEY SECTORS WE SERVE */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Key sectors <span className="text-primary">we serve.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Engineering and energy solutions tailored to each sector&apos;s demands.</p>

            <div className="flex flex-col gap-4">
              {[
                { icon: 'domain', title: 'Commercial Real Estate', desc: 'Towers, shopping malls, office complexes, and mixed-use developments. Full MEP engineering, elevator and escalator systems, central HVAC, and backup power generation for high-rise and large-format commercial projects.' },
                { icon: 'factory', title: 'Industrial & Manufacturing', desc: 'Factories, warehouses, processing plants, and Special Economic Zones. Industrial HVAC, freight elevators, captive power generation, solar installations, and heavy civil works for manufacturing environments.' },
                { icon: 'local_hospital', title: 'Healthcare', desc: 'Hospitals, clinics, and pharmaceutical facilities. Medical-grade HVAC with clean room capabilities, hospital elevator systems, emergency backup power, and specialised MEP engineering for healthcare compliance.' },
                { icon: 'account_balance', title: 'Infrastructure & Government', desc: 'Public buildings, transport terminals, metro stations, and utility infrastructure. Escalator systems for mass transit, solar farms for government facilities, power distribution, and large-scale civil engineering.' },
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

        {/* CTA */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest text-center fade-in">
          <div className="max-w-3xl mx-auto">
            <h2 className="cinzel-text text-4xl md:text-5xl text-on-surface mb-4">Integrated engineering, <span className="text-primary">delivered.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg mb-10">HVAC, power generation, solar, elevator systems, civil engineering, and oil &amp; gas &mdash; from concept through commissioning.</p>
            <a href="/contact?interest=Engineering%20%26%20Energy#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Discuss Requirements &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
