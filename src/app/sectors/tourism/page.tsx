'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layouts/Navbar';
import { Footer } from '@/components/layouts/Footer';

const destinations = [
  { name: 'Hunza Valley & Karakoram', interests: ['Mountains', 'Photography', 'Adventure', 'Heritage'], img: '/Tourism/Hunza-Valley.jpg' },
  { name: 'Skardu & Deosai Plateau', interests: ['Mountains', 'Adventure', 'Trekking', 'Wildlife', 'Photography'], img: '/Tourism/Skardu.jpg' },
  { name: 'Swat Valley', interests: ['Heritage', 'Adventure', 'Trekking'], img: '/Tourism/Swat-Valley.jpg' },
  { name: 'Lahore', interests: ['Heritage', 'Food & Culture', 'Photography', 'Luxury', 'Spiritual'], img: '/Tourism/Lahore.jpg' },
  { name: 'Makran Coast & Gwadar', interests: ['Beach', 'Adventure', 'Photography', 'Luxury'], img: '/Tourism/Gawadar.jpg' },
  { name: 'Fairy Meadows & Nanga Parbat', interests: ['Mountains', 'Trekking', 'Photography', 'Adventure'], img: '/Tourism/Fairy-Meadows.jpg' },
  { name: 'Islamabad', interests: ['Heritage', 'Luxury', 'Food & Culture'], img: 'https://placehold.co/160x120/1a1a1a/C9A84C?text=Islamabad' },
  { name: 'Taxila', interests: ['Heritage', 'Spiritual', 'Photography'], img: 'https://placehold.co/160x120/1a1a1a/C9A84C?text=Taxila' }
];

const interestOptions = ['Mountains', 'Adventure', 'Heritage', 'Wildlife', 'Food & Culture', 'Beach', 'Trekking', 'Photography', 'Luxury', 'Spiritual'];

const destShowcaseData = [
  { img: '/Tourism/Hunza-Valley.jpg', alt: 'Hunza Valley & Karakoram', category: 'Mountain & Adventure', title: 'Hunza Valley & Karakoram', desc: "Where the Silk Road meets the sky. Pakistan's crown jewel — terraced villages at 8,000ft, views of Rakaposhi (7,788m), the ancient Baltit Fort, and the turquoise Attabad Lake. Adventure tourism growing 50%+ annually.", stats: ['7,788m Rakaposhi', '300+ days sunshine', '50%+ tourism growth'], align: 'left' },
  { img: '/Tourism/Skardu.jpg', alt: 'Skardu & Deosai Plateau', category: 'Wilderness & Expedition', title: 'Skardu & Deosai Plateau', desc: "The roof of the world — untouched. Gateway to K2 and the Karakoram's five 8,000m+ peaks. Deosai is the world's second-highest plateau — home to brown bears and an ecosystem found nowhere else.", stats: ['5 peaks over 8,000m', '4,114m Deosai altitude', 'Expedition gateway'], align: 'right' },
  { img: '/Tourism/Swat-Valley.jpg', alt: 'Swat Valley', category: 'Heritage & Nature', title: 'Swat Valley', desc: 'The Switzerland of Pakistan. Buddhist heritage sites, emerald rivers, the Malam Jabba ski resort, and lush valley landscapes. Government-backed tourism investment zone with tax incentives.', stats: ['2 UNESCO sites nearby', 'Ski resort operational', '4hr from Islamabad'], align: 'left' },
  { img: '/Tourism/Lahore.jpg', alt: 'Lahore — The Cultural Capital', category: 'Heritage & Gastronomy', title: 'Lahore — The Cultural Capital', desc: "2,000 years of living history. Mughal architecture (Badshahi Mosque, Lahore Fort, Shalimar Gardens), the walled city, and Pakistan's undisputed food capital.", stats: ['3 UNESCO sites', '$2B+ food economy', '12M+ population'], align: 'right' },
  { img: '/Tourism/Gawadar.jpg', alt: 'Makran Coast & Gwadar', category: 'Coastal & Resort', title: 'Makran Coast & Gwadar', desc: "600km of untouched Arabian Sea. Pakistan's coastal frontier — pristine beaches, marine biodiversity, and the CPEC port city of Gwadar.", stats: ['600km coastline', 'CPEC connectivity', 'Marina potential'], align: 'left' },
  { img: '/Tourism/Fairy-Meadows.jpg', alt: 'Fairy Meadows & Nanga Parbat', category: 'Adventure & Trekking', title: 'Fairy Meadows & Nanga Parbat', desc: "The killer mountain's gentle meadow. The base camp meadow of Nanga Parbat (8,126m) — Pakistan's most photographed landscape.", stats: ['8,126m Nanga Parbat', 'Alpine meadow', 'Glamping potential'], align: 'right' },
];

export default function TourismPage() {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach((el) => { observerRef.current?.observe(el); });
    return () => observerRef.current?.disconnect();
  }, []);

  function toggleInterest(interest: string) {
    setSelectedInterests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(interest)) newSet.delete(interest); else newSet.add(interest);
      return newSet;
    });
  }

  const scored = selectedInterests.size > 0
    ? destinations.map(d => {
        const matching = d.interests.filter(i => selectedInterests.has(i));
        return { ...d, matchCount: matching.length, matchingInterests: matching };
      }).filter(d => d.matchCount > 0).sort((a, b) => b.matchCount - a.matchCount)
    : [];

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HERO */}
        <div className="relative w-full min-h-[90dvh] flex items-center bg-cover bg-center" style={{ backgroundImage: "url('/Images/Tourism.jpg')" }}>
          <div className="absolute inset-0 obsidian-overlay-strong" />
          <section className="relative z-10 py-32 px-5 md:px-24 max-w-[1600px] mx-auto w-full">
            <a href="/" className="inline-flex items-center gap-2 text-on-surface-variant text-sm mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Overview
            </a>
            <div className="w-12 h-[2px] bg-primary mb-6" />
            <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Destination &amp; Hospitality Investment</div>
            <h1 className="cinzel-text text-5xl md:text-7xl font-semibold text-on-surface leading-[1.1] mb-6">Tourism &amp;<br /><span className="text-primary">Hospitality.</span></h1>
            <p className="raleway-text text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-10">From the 8,000-metre peaks of the Karakoram to the ancient heritage of Gandhara &mdash; CZAAH facilitates hospitality investment, destination development, and luxury travel operations across Pakistan.</p>
            <a href="/contact?interest=Tourism%20%26%20Hospitality#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore Opportunities &rarr;</a>
          </section>
        </div>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* DESTINATION SHOWCASE */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Discover <span className="text-primary">Pakistan.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Six extraordinary destinations — each a world unto itself.</p>

            <div className="flex flex-col gap-4">
              {destShowcaseData.map((dest, i) => (
                <div key={i} className="relative w-full h-[400px] md:h-[400px] overflow-hidden cursor-pointer group fade-in">
                  <img src={dest.img} alt={dest.alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15 z-[1]" />
                  <div className={`absolute bottom-0 z-[2] p-10 max-w-[650px] transition-transform duration-500 group-hover:-translate-y-1.5 ${dest.align === 'right' ? 'right-0 text-right ml-auto' : 'left-0 text-left'}`}>
                    <span className="raleway-text text-xs font-semibold tracking-[0.15em] uppercase text-primary mb-2.5 inline-block">{dest.category}</span>
                    <h3 className="cinzel-text text-3xl font-semibold text-on-surface mb-3 leading-tight">{dest.title}</h3>
                    <p className="raleway-text text-on-surface text-sm leading-relaxed mb-4">{dest.desc}</p>
                    <div className={`flex gap-6 mb-4 flex-wrap ${dest.align === 'right' ? 'justify-end' : ''}`}>
                      {dest.stats.map((s, j) => (
                        <span key={j} className="raleway-text text-xs font-medium text-primary tracking-wide whitespace-nowrap">{s}</span>
                      ))}
                    </div>
                    <a href="/contact" className="raleway-text text-sm font-medium text-primary hover:text-primary/70 tracking-wide transition-colors">Explore &rarr;</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* TRIP INTEREST SELECTOR */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Find your <span className="text-primary">Pakistan.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Select your interests to discover your perfect itinerary.</p>

            <div className="flex flex-wrap gap-2.5 mb-8 justify-center">
              {interestOptions.map(interest => (
                <button key={interest} className={`raleway-text text-sm font-medium px-6 py-2.5 border transition-all duration-300 ${selectedInterests.has(interest) ? 'border-primary text-primary bg-primary/[0.08]' : 'border-outline-variant/30 text-on-surface-variant bg-surface-container-low hover:border-primary hover:text-on-surface'}`} onClick={() => toggleInterest(interest)}>{interest}</button>
              ))}
            </div>

            <div style={{ minHeight: '80px' }}>
              {selectedInterests.size === 0 ? (
                <div className="text-center raleway-text text-sm text-on-surface-variant py-10 italic">Select your interests to discover your perfect Pakistan itinerary</div>
              ) : scored.length === 0 ? (
                <div className="text-center raleway-text text-sm text-on-surface-variant py-10 italic">No destinations match your selection. Try different interests.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scored.map((d, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-outline-variant/20 bg-surface-container-low transition-all duration-300 hover:border-primary hover:bg-surface-container">
                      <img src={d.img} alt={d.name} className="w-20 h-[60px] object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="cinzel-text text-base font-semibold text-on-surface mb-1">{d.name}</div>
                        <div className="raleway-text text-xs text-on-surface-variant">{d.matchingInterests.join(' \u00B7 ')}</div>
                      </div>
                      <span className="raleway-text text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 whitespace-nowrap flex-shrink-0">{d.matchCount} match{d.matchCount > 1 ? 'es' : ''}</span>
                    </div>
                  ))}
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
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Hospitality Investment</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">The hotel gap is a <span className="text-primary">golden opportunity.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Pakistan has fewer than 5,000 internationally branded hotel rooms for a country of 240 million people. Compare this to the UAE&apos;s 200,000+. The hospitality deficit is enormous — and so is the opportunity.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">CZAAH facilitates hotel development, resort investment, and hospitality management partnerships across Pakistan&apos;s most promising destinations: Islamabad, Lahore, Hunza, Swat, Skardu, and the Makran coast.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">We connect international hotel brands and hospitality investors with prime land, development partners, and the regulatory approvals needed to build world-class properties in an underserved market.</p>
            </div>
            <div>
              <div className="raleway-text text-xs tracking-[0.2em] uppercase text-primary mb-4 font-medium">Luxury Travel</div>
              <h3 className="cinzel-text text-3xl text-on-surface mb-6">Curated experiences in an <span className="text-primary">undiscovered land.</span></h3>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">Pakistan was named the world&apos;s #1 travel destination by Cond&eacute; Nast Traveller and has seen tourism numbers grow over 300% in recent years. Yet the luxury travel infrastructure remains nascent — creating a premium positioning opportunity.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed mb-4">CZAAH operates curated travel experiences for high-net-worth individuals, corporate retreats, and diplomatic delegations — combining private aviation, security logistics, and exclusive access to Pakistan&apos;s most spectacular destinations.</p>
              <p className="raleway-text text-on-surface-variant text-base leading-relaxed">From helicopter tours over Fairy Meadows to private camping on Deosai Plateau and heritage walks through Mughal Lahore — we deliver travel experiences unavailable through any conventional operator.</p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-outline-variant/20" />

        {/* SERVICES */}
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Our <span className="text-primary">services.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Investment facilitation, destination development, and premium travel operations.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: 'hotel', title: 'Hotel & Resort Development', desc: 'Site identification, feasibility studies, and development facilitation for hotels, resorts, and eco-lodges. From prime urban locations to remote mountain destinations with tourism authority coordination.' },
                { icon: 'handshake', title: 'Brand Partnerships', desc: "Facilitate management agreements and franchise partnerships between international hotel brands and Pakistani property developers. Market entry advisory for brands evaluating Pakistan's hospitality sector." },
                { icon: 'map', title: 'Destination Management', desc: 'End-to-end destination management for corporate groups, VIP delegations, and luxury travellers. Itinerary design, ground logistics, security coordination, and local guide networks across all provinces.' },
                { icon: 'star', title: 'VIP & Corporate Travel', desc: 'Bespoke travel programmes for executives, investor groups, and diplomatic visitors. Private aviation integration, armoured transport, premium accommodation, and 24/7 concierge throughout Pakistan.' },
                { icon: 'hiking', title: 'Adventure & Expedition', desc: 'K2 and Karakoram expeditions, Himalayan trekking, polo in Shandur, falconry in Balochistan, and heritage trails through Taxila, Mohenjo-daro, and Mughal-era Lahore.' },
                { icon: 'construction', title: 'Tourism Infrastructure', desc: 'Investment facilitation for tourism infrastructure: ski resorts, cable cars, camping facilities, visitor centres, and adventure sports operations in northern Pakistan and coastal Balochistan.' },
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

        {/* KEY DESTINATIONS */}
        <section className="py-32 px-5 md:px-24 bg-surface fade-in">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="cinzel-text text-4xl text-on-surface mb-2">Key <span className="text-primary">destinations.</span></h2>
            <p className="raleway-text text-on-surface-variant text-base mb-12 leading-relaxed">Pakistan&apos;s most compelling tourism and hospitality investment corridors.</p>
            <div className="flex flex-col gap-4">
              {[
                { icon: 'landscape', title: 'Gilgit-Baltistan & Hunza', desc: 'Home to five 8,000m+ peaks, the ancient Silk Road, and some of the most dramatic mountain scenery on Earth. Skardu, Hunza Valley, and Fairy Meadows are seeing explosive tourism growth with minimal hospitality infrastructure.' },
                { icon: 'forest', title: 'Swat & KPK', desc: 'The "Switzerland of the East" — lush valleys, Buddhist heritage sites, and ski potential at Malam Jabba. Government is actively promoting tourism investment with incentives and improved road access.' },
                { icon: 'beach_access', title: 'Makran Coast', desc: '600km of undeveloped Arabian Sea coastline in Balochistan. Gwadar and Ormara present unique opportunities for beach resorts, marina development, and coastal tourism linked to CPEC infrastructure.' },
                { icon: 'museum', title: 'Heritage Cities', desc: 'Lahore (Mughal architecture, food culture), Islamabad (modern capital, Margalla Hills), and Taxila (Gandhara civilisation) — urban tourism destinations demanding international-standard hotel capacity.' },
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
        <section className="py-32 px-5 md:px-24 bg-surface-container-lowest text-center fade-in-scale">
          <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '300%+', label: 'Tourism growth (recent years)' },
              { number: '5', label: 'Peaks above 8,000m' },
              { number: '6', label: 'UNESCO World Heritage Sites' },
              { number: '#1', label: 'Conde Nast destination ranking' },
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
        <section className="py-32 px-5 md:px-24 bg-surface text-center fade-in">
          <div className="max-w-3xl mx-auto">
            <h2 className="cinzel-text text-4xl md:text-5xl text-on-surface mb-4">Pakistan&apos;s next frontier in <span className="text-primary">hospitality.</span></h2>
            <p className="raleway-text text-on-surface-variant text-lg mb-10">Hotel investment, destination development, and luxury travel operations across an extraordinary landscape.</p>
            <a href="/contact?interest=Tourism%20%26%20Hospitality#contact-form" className="liquid-gold-bg text-on-primary px-10 py-5 font-bold tracking-[0.2em] uppercase text-sm inline-block">Explore Opportunities &rarr;</a>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
