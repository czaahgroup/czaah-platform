// Local, rule-based knowledge base for the CZAAH AI chat widget.
// No external API calls, no billing — matches visitor messages against
// CZAAH's real site content and returns a canned, on-brand reply.

type Topic = {
  test: (msg: string) => boolean
  reply: string
}

const includesAny = (msg: string, terms: string[]) => terms.some((t) => msg.includes(t))

const SECTOR_TOPICS: Topic[] = [
  { test: (m) => includesAny(m, ['mineral', 'mining', 'copper', 'gold exploration']), reply: "Minerals & Mining: access to Pakistan's $1T+ in untapped mineral reserves — copper, gold, rare earths, coal, and gemstones across Balochistan, KPK, and Gilgit-Baltistan. We facilitate exploration licensing, joint ventures, and offtake agreements. See the Minerals & Mining sector page for more." },
  { test: (m) => includesAny(m, ['real estate', 'property', 'commercial building']), reply: "Real Estate: international opportunities across the UK, UAE, and Pakistan — London commercial property, Dubai freehold investments, and Pakistan's CPEC growth corridors, delivered through structured, transparent investment vehicles." },
  { test: (m) => includesAny(m, ['construction', 'infrastructure', 'special economic zone', 'sez']), reply: "Construction & Development: civil infrastructure, commercial buildings, and Special Economic Zone development across Pakistan, the UK, and the Gulf, including CPEC corridor projects." },
  { test: (m) => includesAny(m, ['manpower', 'human resource', 'workforce', 'staffing', 'recruitment', 'labour', 'labor']), reply: "Human Resources: access to Pakistan's 70M+ workforce, with deployment across the Gulf, UK, Europe, and the Balkans, plus domestic staffing, executive search, and HR advisory." },
  { test: (m) => includesAny(m, ['textile', 'garment', 'denim', 'knitwear']), reply: "Textiles & Trade: sourcing from the world's 4th largest textile exporter — denim, knitwear, home textiles, and sportswear, certified and competitively priced." },
  { test: (m) => includesAny(m, ['technology', ' it sector', 'software', 'tech sector']), reply: "Technology & IT: entry into Pakistan's $3.2B+ IT sector, with government digital transformation partnerships and access to 500,000+ skilled technology professionals." },
  { test: (m) => includesAny(m, ['agriculture', 'farming', 'crops']), reply: "Agriculture: Pakistan's agricultural sector accounts for 23% of GDP. We facilitate large-scale farming, organic food production, and food processing investment." },
  { test: (m) => includesAny(m, ['pharma', 'medicine', 'healthcare manufacturing']), reply: "Pharmaceuticals: a $4B+ market growing at 12% annually — medicine production, medical supply chains, and healthcare manufacturing, with access to 230M+ domestic consumers." },
  { test: (m) => includesAny(m, ['engineering', 'energy', 'hvac', 'solar', 'power generation']), reply: "Engineering & Energy: HVAC systems, elevators, escalators, power generation, civil works, and solar panel installation across Pakistan." },
  { test: (m) => includesAny(m, ['aviation', 'charter flight', 'private jet']), reply: "Aviation: premium private charter and executive transport across Pakistan, including corporate travel, medical evacuation, and VIP delegation logistics." },
  { test: (m) => includesAny(m, ['tourism', 'hospitality', 'hotel investment']), reply: "Tourism & Hospitality: luxury hotel investment, destination management, and adventure expeditions across the Karakoram, Hindukush, and Pakistan's heritage sites." },
  { test: (m) => includesAny(m, ['luxury car', 'car rental', 'chauffeur']), reply: "Luxury Car Rentals: premium executive chauffeur services, armoured transport, and corporate fleet management across Pakistan, the Gulf, and the UK." },
  { test: (m) => includesAny(m, ['education', 'university', 'campus', 'edtech']), reply: "Education: university partnerships, campus development, vocational training, and EdTech deployment across Pakistan's $8B+ education market." },
]

const GENERAL_TOPICS: Topic[] = [
  {
    test: (m) => includesAny(m, ['hello', 'hi ', 'hi!', 'hey', 'good morning', 'good afternoon', 'good evening']) || m.trim() === 'hi',
    reply: "Hello! I'm CZAAH AI. Ask me about our sectors, services, investment process, or how to get in touch.",
  },
  {
    test: (m) => includesAny(m, ['thank', 'thanks', 'cheers', 'appreciate']),
    reply: "You're welcome! Let me know if there's anything else you'd like to know about CZAAH.",
  },
  {
    test: (m) => includesAny(m, ['what is czaah', 'about czaah', 'who are you', 'who is czaah', 'tell me about czaah', 'what does czaah do']),
    reply: "CZAAH is a London-based, diversified international investment facilitation group with on-the-ground operations across key global markets. We connect international investors with high-growth opportunities across minerals, real estate, technology, textiles, agriculture, pharmaceuticals, and more.",
  },
  {
    test: (m) => includesAny(m, ['minimum investment', 'how much to invest', 'entry point', 'minimum amount']),
    reply: "Investment minimums vary by opportunity and structure. Deal-by-deal investments typically start from $100,000, while pooled vehicles may offer lower entry points. Contact our team to discuss specific opportunities.",
  },
  {
    test: (m) => includesAny(m, ['safe to invest', 'is it safe', 'risk', 'protection', 'legal structure', 'spv']),
    reply: "Pakistan's Board of Investment (BOI) actively facilitates foreign investment with repatriation guarantees and incentive schemes. CZAAH adds institutional-grade legal frameworks, comprehensive due diligence, defined exit mechanisms, and Special Purpose Vehicles (SPVs) to protect investors from cross-deal risk.",
  },
  {
    test: (m) => includesAny(m, ['cpec']),
    reply: "CPEC — the China-Pakistan Economic Corridor — is a $62 billion+ infrastructure and economic development programme creating 9 Special Economic Zones across Pakistan, driving demand for commercial property, industrial capacity, and supporting services.",
  },
  {
    test: (m) => includesAny(m, ['how does it work', 'investment process', 'how do i invest', 'get started', 'how to start', 'process work']),
    reply: "Our process: 1) A confidential initial consultation to understand your goals, 2) Investment assessment & proposal with feasibility and due diligence, 3) Legal & licensing facilitation, 4) Investment execution, and 5) Ongoing portfolio management and reporting. Reach out via our Contact page to begin.",
  },
  {
    test: (m) => includesAny(m, ['registration', 'incorporate', 'secp', 'set up a company', 'company setup']),
    reply: "SECP company incorporation can be completed in 48–72 hours with fast-track processing. Full operational setup — including FBR registration, bank accounts, and BOI approvals — typically takes 2–4 weeks with CZAAH's facilitation.",
  },
  {
    test: (m) => includesAny(m, ['who can invest', 'eligible', 'diaspora']),
    reply: "We serve institutional investors, multinational corporations, sovereign entities, Gulf-based family offices, diaspora Pakistanis (UK, US, UAE), and high-net-worth individuals, through both direct and structured investment.",
  },
  {
    test: (m) => includesAny(m, ['service', 'business setup', 'licensing', 'compliance', 'import', 'export', 'advisory', 'partnership development', 'government contract', 'security service', 'payment solution', 'investment migration', 'residency', 'citizenship']),
    reply: "Our facilitation services: Business Setup, Licensing & Compliance, Import & Export, Investor Protection, Investment Advisory, Partnership Development, Government Contracts, Security Services, Payment Solutions, and Investment Migration. Ask about any one for more detail.",
  },
  {
    test: (m) => includesAny(m, ['sector', 'industries', 'industry', 'what do you offer', 'what do you do']),
    reply: "We operate across thirteen sectors: Minerals & Mining, Real Estate, Construction & Development, Human Resources, Textiles & Trade, Technology & IT, Agriculture, Pharmaceuticals, Engineering & Energy, Aviation, Tourism & Hospitality, Luxury Car Rentals, and Education. Ask about any one for more detail.",
  },
  {
    test: (m) => includesAny(m, ['contact', 'office', 'email', 'address', 'phone', 'reach you', 'get in touch', 'location']),
    reply: "You can reach us at info@czaah.com or through the Contact page. Our offices: London (Berkeley Square, Mayfair — group headquarters), Islamabad, Brussels, and Hong Kong.",
  },
  {
    test: (m) => includesAny(m, ['team', 'leadership', 'founder', 'ceo', 'director', 'who runs', 'management']),
    reply: "CZAAH is led by a senior team spanning Pakistan, the Gulf, and the United Kingdom — founders, senior executives, and sector directors covering every vertical. See the full team on our Team page.",
  },
  {
    test: (m) => includesAny(m, ['report', 'reporting', 'exit', 'return', 'returns']),
    reply: "Investors receive quarterly performance reports, independent valuations, and regulatory compliance updates to international institutional standards. Every investment is structured with defined exit mechanisms agreed before investment.",
  },
]

const FALLBACK_REPLY =
  "I don't have a specific answer for that yet. I can help with our sectors, services, investment process, minimum investment, safety & legal structure, or how to contact our team — or reach us directly at info@czaah.com."

const HANDOFF_TERMS = [
  'agent', 'human', 'real person', 'representative', 'talk to someone',
  'speak to someone', 'speak with someone', 'connect me', 'live agent',
  'customer service', 'support team', 'someone from your team',
  'talk to a person', 'speak to a person', 'talk to your team',
  'speak to your team', 'call me', 'get in contact', 'reach a person',
]

export function isHandoffIntent(message: string): boolean {
  const normalized = ` ${message.toLowerCase().trim()} `
  return includesAny(normalized, HANDOFF_TERMS)
}

export function getAiChatReply(message: string): string {
  const normalized = ` ${message.toLowerCase().trim()} `

  for (const topic of [...SECTOR_TOPICS, ...GENERAL_TOPICS]) {
    if (topic.test(normalized)) return topic.reply
  }

  return FALLBACK_REPLY
}
