'use client';
// @ts-nocheck

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

interface SecurityAssessment {
  level: number;
  threats: string[];
  pkg: string;
  includes: string[];
  personnel: string;
  response: string;
  monitoring: string;
}

type OpType = 'mining' | 'construction' | 'corporate' | 'vip' | 'logistics' | 'energy';
type LocType = 'balochistan' | 'kpk' | 'sindh' | 'punjab' | 'islamabad' | 'gb';

const data: Record<OpType, Record<LocType, SecurityAssessment>> = {
  mining: {
    balochistan: { level: 5, threats: ["Kidnapping", "Armed Militancy", "Tribal Disputes", "IED/Explosives"], pkg: "Maximum Protection Protocol", includes: ["Armed escort teams", "Counter-surveillance operations", "Tribal liaison & negotiation", "Secure compound establishment", "Emergency extraction plan"], personnel: "12\u201320", response: "< 10 min", monitoring: "24/7 Active" },
    kpk: { level: 4, threats: ["Militant Activity", "Kidnapping", "Road Hazards", "Tribal Disputes"], pkg: "Enhanced Protection Protocol", includes: ["Armed escort convoy", "Threat intelligence briefings", "Site perimeter security", "Emergency evacuation planning", "Local liaison coordination"], personnel: "10\u201316", response: "< 12 min", monitoring: "24/7 Active" },
    sindh: { level: 3, threats: ["Dacoity", "Kidnapping for Ransom", "Civil Unrest", "Road Hazards"], pkg: "Elevated Security Package", includes: ["Armed site security", "Convoy protection", "Threat monitoring & alerts", "Community engagement support"], personnel: "8\u201314", response: "< 20 min", monitoring: "24/7 Active" },
    punjab: { level: 2, threats: ["Petty Crime", "Labour Disputes", "Road Safety", "Theft"], pkg: "Standard Protection Package", includes: ["Site access control", "Perimeter monitoring", "Security personnel deployment", "Incident reporting system"], personnel: "6\u201310", response: "< 25 min", monitoring: "24/7 Active" },
    islamabad: { level: 2, threats: ["Petty Crime", "Regulatory Disruption", "Protest Activity", "Theft"], pkg: "Standard Protection Package", includes: ["Facility security", "CCTV & access control", "Personnel screening", "Incident response protocol"], personnel: "4\u20138", response: "< 25 min", monitoring: "24/7 Active" },
    gb: { level: 4, threats: ["Terrain Hazards", "Sectarian Tensions", "Road Blockades", "Avalanche/Landslide Risk"], pkg: "Remote Operations Protocol", includes: ["Mountain security teams", "Helicopter evacuation standby", "Satellite communication systems", "Weather & terrain monitoring", "Medical emergency response"], personnel: "10\u201318", response: "< 15 min", monitoring: "24/7 Active" }
  },
  construction: {
    balochistan: { level: 5, threats: ["Armed Attacks", "Sabotage", "Kidnapping", "Tribal Opposition"], pkg: "Maximum Protection Protocol", includes: ["Armed perimeter teams", "Counter-surveillance", "Anti-sabotage patrols", "Tribal engagement & liaison", "Secure worker housing"], personnel: "14\u201322", response: "< 10 min", monitoring: "24/7 Active" },
    kpk: { level: 4, threats: ["Militant Threats", "Sabotage", "Labour Extortion", "Civil Unrest"], pkg: "Enhanced Protection Protocol", includes: ["Site perimeter security", "Convoy escort", "Threat intelligence", "Emergency extraction plan", "Worker safety briefings"], personnel: "8\u201315", response: "< 15 min", monitoring: "24/7 Active" },
    sindh: { level: 3, threats: ["Dacoity", "Equipment Theft", "Labour Disputes", "Extortion"], pkg: "Elevated Security Package", includes: ["24/7 site guards", "Equipment monitoring", "Access control systems", "Community liaison"], personnel: "6\u201312", response: "< 20 min", monitoring: "24/7 Active" },
    punjab: { level: 2, threats: ["Theft", "Labour Disputes", "Trespassing", "Vandalism"], pkg: "Standard Site Security", includes: ["Site access control", "Guard patrols", "CCTV monitoring", "Incident reporting"], personnel: "4\u20138", response: "< 30 min", monitoring: "Business hours + on-call" },
    islamabad: { level: 1, threats: ["Theft", "Trespassing", "Regulatory Compliance", "Vandalism"], pkg: "Basic Site Security", includes: ["Access control", "Guard deployment", "CCTV system", "Visitor management"], personnel: "3\u20136", response: "< 30 min", monitoring: "Business hours + on-call" },
    gb: { level: 4, threats: ["Terrain Hazards", "Road Blockades", "Landslide Risk", "Sectarian Tensions"], pkg: "Remote Construction Protocol", includes: ["Mountain-trained security", "Satellite comms", "Helicopter medevac standby", "Road monitoring teams", "Weather risk management"], personnel: "10\u201316", response: "< 15 min", monitoring: "24/7 Active" }
  },
  corporate: {
    balochistan: { level: 3, threats: ["Targeted Attacks", "Kidnapping", "Civil Unrest", "Extortion"], pkg: "Elevated Office Security", includes: ["Armed reception security", "Executive safe room", "Counter-surveillance", "Emergency protocols", "Secure transport"], personnel: "6\u201310", response: "< 15 min", monitoring: "24/7 Active" },
    kpk: { level: 3, threats: ["Militant Threats", "Targeted Crime", "Protest Activity", "Extortion"], pkg: "Elevated Office Security", includes: ["Armed guards", "CCTV & alarm systems", "Vehicle screening", "Emergency evacuation plan"], personnel: "5\u20138", response: "< 20 min", monitoring: "24/7 Active" },
    sindh: { level: 2, threats: ["Street Crime", "Protest Disruption", "Theft", "Extortion Attempts"], pkg: "Standard Office Security", includes: ["Reception security", "Access control", "CCTV monitoring", "Incident response protocol"], personnel: "4\u20136", response: "< 25 min", monitoring: "Business hours + on-call" },
    punjab: { level: 2, threats: ["Petty Crime", "Protest Activity", "Theft", "Cyber Threats"], pkg: "Standard Office Security", includes: ["Access control", "CCTV monitoring", "Reception security", "Visitor management"], personnel: "3\u20135", response: "< 30 min", monitoring: "Business hours + on-call" },
    islamabad: { level: 1, threats: ["Petty Crime", "Protest Disruption", "Regulatory Risk", "Cyber Threats"], pkg: "Basic Corporate Security", includes: ["Access control", "CCTV monitoring", "Reception security", "Incident reporting"], personnel: "2\u20134", response: "< 30 min", monitoring: "Business hours + on-call" },
    gb: { level: 3, threats: ["Sectarian Tensions", "Road Blockades", "Communication Outages", "Natural Disasters"], pkg: "Remote Office Protocol", includes: ["Armed security", "Satellite communications", "Emergency supplies", "Evacuation planning"], personnel: "4\u20137", response: "< 20 min", monitoring: "24/7 Active" }
  },
  vip: {
    balochistan: { level: 5, threats: ["Kidnapping", "Assassination Risk", "Armed Ambush", "IED/Explosives"], pkg: "Maximum Executive Protection", includes: ["Close protection team", "Armoured vehicles", "Advance route reconnaissance", "Counter-surveillance", "Emergency extraction & medevac"], personnel: "8\u201314", response: "< 5 min", monitoring: "24/7 Active" },
    kpk: { level: 4, threats: ["Kidnapping", "Targeted Attack", "Road Ambush", "Militant Activity"], pkg: "Enhanced Executive Protection", includes: ["Close protection officers", "Armoured transport", "Route planning & reconnaissance", "Safe house arrangement", "Medical support standby"], personnel: "6\u201310", response: "< 10 min", monitoring: "24/7 Active" },
    sindh: { level: 3, threats: ["Kidnapping for Ransom", "Carjacking", "Street Crime", "Civil Unrest"], pkg: "Executive Travel Security", includes: ["Close protection detail", "Secure vehicle", "Route monitoring", "Hotel security coordination"], personnel: "4\u20138", response: "< 15 min", monitoring: "24/7 Active" },
    punjab: { level: 2, threats: ["Street Crime", "Protest Disruption", "Traffic Hazards", "Opportunistic Crime"], pkg: "Standard Executive Security", includes: ["Protection officer", "Secure vehicle", "Route planning", "Hotel security liaison"], personnel: "3\u20135", response: "< 20 min", monitoring: "24/7 Active" },
    islamabad: { level: 2, threats: ["Protest Activity", "Street Crime", "Traffic Disruption", "Opportunistic Targeting"], pkg: "Standard Executive Security", includes: ["Protection officer", "Secure vehicle", "Airport transfers", "Hotel coordination"], personnel: "2\u20134", response: "< 20 min", monitoring: "24/7 Active" },
    gb: { level: 4, threats: ["Road Hazards", "Terrain Risks", "Sectarian Tensions", "Communication Gaps"], pkg: "Remote Executive Protocol", includes: ["Mountain-trained CPO team", "4x4 convoy", "Helicopter standby", "Satellite phone", "Medical kit & medevac plan"], personnel: "6\u201310", response: "< 10 min", monitoring: "24/7 Active" }
  },
  logistics: {
    balochistan: { level: 5, threats: ["Highway Robbery", "Cargo Hijacking", "IED/Explosives", "Armed Ambush"], pkg: "Maximum Convoy Protection", includes: ["Armed escort vehicles", "Route reconnaissance", "GPS cargo tracking", "Anti-ambush protocols", "Emergency response teams"], personnel: "10\u201318", response: "< 10 min", monitoring: "24/7 Active" },
    kpk: { level: 4, threats: ["Cargo Theft", "Road Ambush", "Extortion", "Militant Checkpoints"], pkg: "Enhanced Convoy Security", includes: ["Armed escort", "Route intelligence", "Real-time tracking", "Alternative route planning", "Driver security briefings"], personnel: "8\u201314", response: "< 12 min", monitoring: "24/7 Active" },
    sindh: { level: 3, threats: ["Highway Robbery", "Cargo Theft", "Dacoity", "Road Hazards"], pkg: "Convoy Escort Package", includes: ["Armed escorts", "GPS tracking", "Rest stop security", "Incident response team"], personnel: "6\u201310", response: "< 20 min", monitoring: "24/7 Active" },
    punjab: { level: 2, threats: ["Cargo Theft", "Road Accidents", "Petty Crime", "Traffic Disruption"], pkg: "Standard Transport Security", includes: ["GPS tracking", "Driver protocols", "Route monitoring", "Incident response"], personnel: "4\u20136", response: "< 25 min", monitoring: "Business hours + on-call" },
    islamabad: { level: 1, threats: ["Traffic Disruption", "Petty Theft", "Road Accidents", "Protest Blockades"], pkg: "Basic Transport Security", includes: ["GPS tracking", "Route planning", "Driver check-ins", "Incident reporting"], personnel: "2\u20134", response: "< 30 min", monitoring: "Business hours + on-call" },
    gb: { level: 4, threats: ["Road Collapse", "Landslides", "Cargo Theft", "Terrain Hazards"], pkg: "Mountain Transport Protocol", includes: ["4x4 escort vehicles", "Satellite tracking", "Weather monitoring", "Road condition intelligence", "Emergency recovery teams"], personnel: "8\u201312", response: "< 15 min", monitoring: "24/7 Active" }
  },
  energy: {
    balochistan: { level: 5, threats: ["Sabotage", "Armed Attacks", "Pipeline Bombing", "Kidnapping"], pkg: "Maximum Infrastructure Protection", includes: ["Armed perimeter teams", "Pipeline patrol units", "Counter-sabotage operations", "Tribal liaison", "Emergency shutdown protocols"], personnel: "14\u201324", response: "< 10 min", monitoring: "24/7 Active" },
    kpk: { level: 4, threats: ["Sabotage", "Militant Threats", "Power Line Attacks", "Extortion"], pkg: "Enhanced Infrastructure Security", includes: ["Armed site security", "Patrol teams", "Threat intelligence", "Sabotage detection systems", "Emergency response"], personnel: "10\u201316", response: "< 12 min", monitoring: "24/7 Active" },
    sindh: { level: 3, threats: ["Theft", "Vandalism", "Civil Unrest", "Equipment Sabotage"], pkg: "Elevated Site Security", includes: ["24/7 guard teams", "Perimeter monitoring", "Equipment protection", "Community engagement"], personnel: "6\u201312", response: "< 20 min", monitoring: "24/7 Active" },
    punjab: { level: 2, threats: ["Theft", "Vandalism", "Labour Disputes", "Trespassing"], pkg: "Standard Site Security", includes: ["Guard deployment", "CCTV systems", "Access control", "Incident reporting"], personnel: "4\u20138", response: "< 25 min", monitoring: "Business hours + on-call" },
    islamabad: { level: 1, threats: ["Vandalism", "Trespassing", "Regulatory Compliance", "Theft"], pkg: "Basic Facility Security", includes: ["Access control", "CCTV monitoring", "Guard patrols", "Visitor management"], personnel: "3\u20135", response: "< 30 min", monitoring: "Business hours + on-call" },
    gb: { level: 4, threats: ["Terrain Hazards", "Sabotage", "Road Blockades", "Natural Disasters"], pkg: "Remote Energy Protocol", includes: ["Mountain security teams", "Pipeline/facility patrols", "Satellite communications", "Weather monitoring", "Helicopter medevac standby"], personnel: "10\u201316", response: "< 15 min", monitoring: "24/7 Active" }
  }
};

const opOptions: { key: OpType; icon: string; label: string }[] = [
  { key: 'mining', icon: 'diamond', label: 'Mining & Extraction' },
  { key: 'construction', icon: 'construction', label: 'Construction & Infrastructure' },
  { key: 'corporate', icon: 'business', label: 'Corporate Office' },
  { key: 'vip', icon: 'shield_person', label: 'VIP / Executive Visit' },
  { key: 'logistics', icon: 'local_shipping', label: 'Logistics & Transport' },
  { key: 'energy', icon: 'bolt', label: 'Energy & Utilities' }
];

const locOptions: { key: LocType; label: string }[] = [
  { key: 'balochistan', label: 'Balochistan' },
  { key: 'kpk', label: 'KPK & Tribal Areas' },
  { key: 'sindh', label: 'Sindh (Rural)' },
  { key: 'punjab', label: 'Punjab' },
  { key: 'islamabad', label: 'Islamabad / Rawalpindi' },
  { key: 'gb', label: 'Gilgit-Baltistan & AJK' }
];

function ThreatLevel({ level }: { level: number }) {
  const colors = ['bg-green-400', 'bg-green-400', 'bg-primary', 'bg-orange-400', 'bg-red-400'];
  const labels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map(lvl => (
          <div key={lvl} className={`h-2 flex-1 ${lvl <= level ? colors[level - 1] : 'bg-outline-variant/20'}`} />
        ))}
      </div>
      <div className="flex justify-between">
        {labels.map((lbl, i) => (
          <span key={i} className={`raleway-text text-[0.6rem] ${i + 1 === level ? 'text-primary font-semibold' : 'text-on-surface-variant/30'}`}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [selOp, setSelOp] = useState<OpType | null>(null);
  const [selLoc, setSelLoc] = useState<LocType | null>(null);

  const assessment = selOp && selLoc ? data[selOp]?.[selLoc] : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-surface">

        {/* Hero */}
        <section className="relative min-h-[70dvh] flex items-end bg-cover bg-center" style={{ backgroundImage: "url('/Images/Security.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <div className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <Link href="/" className="raleway-text text-on-surface-variant text-sm tracking-[0.1em] uppercase hover:text-primary transition-colors mb-6 inline-block">&larr; Back to Overview</Link>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <div className="raleway-text text-xs font-semibold tracking-[0.2em] uppercase text-on-surface-variant mb-4">Corporate &amp; Project Protection</div>
            <h1 className="cinzel-text text-5xl md:text-6xl lg:text-7xl text-on-surface tracking-wide mb-6">
              Security <span className="text-primary">Services.</span>
            </h1>
            <p className="raleway-text text-lg md:text-xl text-on-surface-variant max-w-3xl leading-relaxed mb-10">
              Corporate and project protection for international operations across Pakistan &mdash; site security, executive protection, risk assessment, and monitoring through vetted, experienced security partners.
            </p>
            <Link href="/contact?interest=Security%20Services#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Discuss Requirements &rarr;
            </Link>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Security Risk Assessment */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Assess your <span className="text-primary">security needs.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-10">Select your operation type and location to receive a tailored security assessment and recommended protection package.</p>

            <div className="mb-8">
              <div className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary/60 mb-4">Operation Type</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {opOptions.map(op => (
                  <div key={op.key} onClick={() => setSelOp(op.key)} className={`cursor-pointer border p-4 text-center transition-all duration-300 ${selOp === op.key ? 'border-primary/60 bg-surface-container-low' : 'border-outline-variant/10 bg-surface-container-low hover:border-primary/30'}`}>
                    <span className={`material-symbols-outlined text-xl mb-1 block ${selOp === op.key ? 'text-primary' : 'text-on-surface-variant/50'}`}>{op.icon}</span>
                    <span className="raleway-text text-[0.7rem] text-on-surface-variant">{op.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <div className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary/60 mb-4">Location</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {locOptions.map(loc => (
                  <div key={loc.key} onClick={() => setSelLoc(loc.key)} className={`cursor-pointer border p-4 text-center transition-all duration-300 ${selLoc === loc.key ? 'border-primary/60 bg-surface-container-low' : 'border-outline-variant/10 bg-surface-container-low hover:border-primary/30'}`}>
                    <span className={`material-symbols-outlined text-xl mb-1 block ${selLoc === loc.key ? 'text-primary' : 'text-on-surface-variant/50'}`}>location_on</span>
                    <span className="raleway-text text-[0.7rem] text-on-surface-variant">{loc.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {!assessment && (
              <div className="text-center py-16 text-on-surface-variant/50 raleway-text border border-dashed border-outline-variant/20">
                Select an operation type and location above to generate your assessment.
              </div>
            )}

            {assessment && (
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 bg-surface-container-lowest border border-outline-variant/10 p-8">
                <div>
                  <div className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary/60 mb-3">Threat Level</div>
                  <ThreatLevel level={assessment.level} />
                  <div className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary/60 mb-3 mt-6">Key Threats</div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {assessment.threats.map(t => (
                      <span key={t} className="raleway-text text-xs px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20">{t}</span>
                    ))}
                  </div>
                  <div className="raleway-text text-xs font-semibold uppercase tracking-[0.1em] text-primary/60 mb-3">Recommended Package</div>
                  <div className="cinzel-text text-lg text-on-surface font-semibold mb-3">{assessment.pkg}</div>
                  <ul className="space-y-2">
                    {assessment.includes.map(item => (
                      <li key={item} className="raleway-text text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-primary text-xs mt-1">&#10003;</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="bg-surface-container-low border border-outline-variant/10 p-5 text-center">
                    <div className="cinzel-text text-2xl text-primary mb-1">{assessment.personnel}</div>
                    <div className="raleway-text text-xs text-on-surface-variant uppercase tracking-wider">Personnel Required</div>
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant/10 p-5 text-center">
                    <div className="cinzel-text text-2xl text-primary mb-1">{assessment.response}</div>
                    <div className="raleway-text text-xs text-on-surface-variant uppercase tracking-wider">Response Time</div>
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant/10 p-5 text-center">
                    <div className="cinzel-text text-lg text-primary mb-1">{assessment.monitoring}</div>
                    <div className="raleway-text text-xs text-on-surface-variant uppercase tracking-wider">Monitoring</div>
                  </div>
                  <Link href="/contact" className="block text-center liquid-gold-bg text-on-primary px-6 py-4 font-bold tracking-[0.2em] uppercase text-xs">
                    Request Detailed Assessment &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Services */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Comprehensive security solutions for corporate, industrial, and international clients operating in Pakistan.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: 'security', title: 'Site Security', desc: '24/7 security personnel for mining operations, construction sites, industrial facilities, and energy projects across Pakistan.' },
                { icon: 'shield_person', title: 'Executive Protection', desc: 'Close protection services for visiting executives, delegation security, and VIP travel coordination throughout Pakistan.' },
                { icon: 'policy', title: 'Risk Assessment', desc: 'Comprehensive security risk assessments for new market entrants, project locations, and operational environments.' },
                { icon: 'local_shipping', title: 'Transport Security', desc: 'Secure logistics and convoy management for valuable cargo, equipment transport, and personnel movement in high-risk areas.' },
                { icon: 'engineering', title: 'Security Consulting', desc: 'Security strategy development, standard operating procedures, emergency response planning, and compliance with international security standards.' },
                { icon: 'monitoring', title: 'Monitoring & Intelligence', desc: '24/7 operations centre monitoring, threat intelligence reporting, and real-time security updates for client operations.' },
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[{ number: '24/7', label: 'Operations monitoring' }, { number: 'Mining', label: 'Energy, infrastructure coverage' }, { number: 'Vetted', label: 'Experienced security personnel' }, { number: "ISI/Int'l", label: 'Standard compliance' }].map((stat, i) => (
                <div key={i}><div className="cinzel-text text-3xl md:text-4xl text-primary mb-2">{stat.number}</div><div className="raleway-text text-xs uppercase tracking-[0.1em] text-on-surface-variant">{stat.label}</div></div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-[1600px] mx-auto px-5 md:px-24"><div className="h-px bg-outline-variant/10" /></div>

        {/* Who We Serve */}
        <section className="py-32 px-5 md:px-24">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-4">Who we <span className="text-primary">serve.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mb-12">Tailored security solutions for the sectors and organisations that need them most.</p>
            <div className="space-y-4">
              {[
                { icon: 'diamond', title: 'Mining & Extraction', desc: 'Security for exploration teams, mine sites, and mineral transport across Balochistan, KPK, and Gilgit-Baltistan.' },
                { icon: 'construction', title: 'Infrastructure & CPEC', desc: 'Protection for construction projects, road building, and CPEC corridor development sites.' },
                { icon: 'business', title: 'Corporate Operations', desc: 'Office security, employee safety programmes, and business continuity planning for international firms operating in Pakistan.' },
                { icon: 'flag', title: 'Diplomatic & NGO', desc: 'Security coordination for diplomatic missions, international organisations, and NGO operations requiring local security expertise.' },
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
            <h2 className="cinzel-text text-3xl md:text-4xl text-on-surface mb-6">Protect your <span className="text-primary">operations.</span></h2>
            <p className="raleway-text text-on-surface-variant max-w-2xl mx-auto mb-10">Site security, executive protection, and risk assessment &mdash; deployed through vetted, experienced security partners.</p>
            <Link href="/contact?interest=Security%20Services#contact-form" className="inline-block liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm">
              Discuss Requirements &rarr;
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
