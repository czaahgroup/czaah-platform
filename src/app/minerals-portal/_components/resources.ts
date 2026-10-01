/**
 * A guide to Pakistan's minerals: what occurs where, and what it is used for.
 *
 * This is general information, not a list of things for sale — nothing here
 * says CZAAH holds a licence, a deposit or a stake. Offers are a separate
 * thing (the catalogue), each approved by an admin.
 *
 * Wording rules for this file:
 *  - no quality ratings ("world-class", "premium", "Tier 1") and no promises
 *    of demand, returns or upside;
 *  - a figure appears only with a named public source beside it (`source`).
 * tests/minerals.spec.ts enforces both.
 */

export interface MineralResource {
  slug: string
  name: string
  /** Chemical formula or mineral group, as a geologist would label it. */
  formula: string
  /** One of the catalogue's categories (src/lib/minerals.ts). */
  category: 'precious_metal' | 'base_metal' | 'energy' | 'industrial' | 'gemstone' | 'dimension_stone' | 'rare_earth'
  province: 'Balochistan' | 'Khyber Pakhtunkhwa' | 'Punjab' | 'Sindh' | 'Gilgit-Baltistan'
  /** Districts or sites where it is known to occur. */
  places: string
  description: string
  uses: string
  image: string
  /** What a buyer would search the offers for. */
  search: string
  source?: { label: string; url: string }
}

export const PROVINCES = ['Balochistan', 'Khyber Pakhtunkhwa', 'Punjab', 'Sindh', 'Gilgit-Baltistan'] as const

export const MINERAL_RESOURCES: MineralResource[] = [
  {
    slug: 'copper', name: 'Copper', formula: 'Cu', category: 'base_metal', province: 'Balochistan',
    places: 'Chagai district — Reko Diq, Saindak',
    description: 'Copper occurs with gold in the porphyry deposits of the Chagai district. Saindak has been mined for copper and gold; Reko Diq is being developed by Barrick with the federal and Balochistan governments. Barrick reported its share of Reko Diq’s reserves at the end of 2024 as 7.3 million tonnes of copper.',
    uses: 'Electrical wiring, motors, power networks, construction.',
    image: '/Minerals/Copper.jpg', search: 'copper',
    source: { label: 'Barrick 2024 reserves, reported by Mining Weekly', url: 'https://www.miningweekly.com/article/barrick-reports-higher-reserves-with-reqo-diq-making-a-substantial-contribution-2025-02-07' },
  },
  {
    slug: 'gold', name: 'Gold', formula: 'Au', category: 'precious_metal', province: 'Balochistan',
    places: 'Chagai district — Reko Diq, Saindak',
    description: 'Gold is found alongside copper in the Chagai porphyry deposits. Barrick reported its share of Reko Diq’s reserves at the end of 2024 as 13 million ounces of gold.',
    uses: 'Bullion, jewellery, electronics.',
    image: '/Minerals/Gold.jpg', search: 'gold',
    source: { label: 'Barrick 2024 reserves, reported by Mining Weekly', url: 'https://www.miningweekly.com/article/barrick-reports-higher-reserves-with-reqo-diq-making-a-substantial-contribution-2025-02-07' },
  },
  {
    slug: 'silver', name: 'Silver', formula: 'Ag', category: 'precious_metal', province: 'Khyber Pakhtunkhwa',
    places: 'Chitral and Dir districts',
    description: 'Silver occurs mainly as a by-product of lead, zinc and copper mineralisation rather than in deposits of its own.',
    uses: 'Electronics, solar panels, jewellery, silverware.',
    image: '/Minerals/Silver.jpg', search: 'silver',
  },
  {
    slug: 'chromite', name: 'Chromite', formula: 'FeCr₂O₄', category: 'base_metal', province: 'Balochistan',
    places: 'Muslim Bagh, Zhob district; also Khyber Pakhtunkhwa',
    description: 'Chromite is mined around Muslim Bagh and in Zhob district, much of it by small-scale operations, and is exported as lump ore and concentrate.',
    uses: 'Stainless steel, ferrochrome, refractories.',
    image: '/Minerals/Chromite.jpg', search: 'chromite',
  },
  {
    slug: 'iron-ore', name: 'Iron ore', formula: 'Fe₂O₃', category: 'base_metal', province: 'Punjab',
    places: 'Chiniot, Kalabagh',
    description: 'Iron ore occurs at Chiniot and Kalabagh in Punjab, and at other sites in Balochistan and Khyber Pakhtunkhwa.',
    uses: 'Steel making.',
    image: '/Minerals/Iron-Ore.jpg', search: 'iron',
  },
  {
    slug: 'lead-zinc', name: 'Lead & zinc', formula: 'Pb / Zn', category: 'base_metal', province: 'Balochistan',
    places: 'Duddar, Lasbela district; Khuzdar',
    description: 'Lead and zinc occur together as galena and sphalerite in the Lasbela–Khuzdar belt, where the Duddar deposit has been mined. Silver can be recovered as a by-product.',
    uses: 'Batteries, galvanising steel, alloys.',
    image: '/Minerals/Lead-Zinc.jpg', search: 'zinc',
  },
  {
    slug: 'manganese', name: 'Manganese', formula: 'Mn', category: 'base_metal', province: 'Khyber Pakhtunkhwa',
    places: 'Buner and the Malakand division; also Lasbela, Balochistan',
    description: 'Manganese ore occurs in Buner and the Malakand division. The deposits have seen limited systematic exploration.',
    uses: 'Steel alloys, batteries.',
    image: '/Minerals/Manganese.jpg', search: 'manganese',
  },
  {
    slug: 'antimony', name: 'Antimony', formula: 'Sb', category: 'base_metal', province: 'Balochistan',
    places: 'Qilla Abdullah district; also Chitral',
    description: 'Antimony occurs as stibnite ore in Qilla Abdullah district and in Chitral.',
    uses: 'Flame retardants, lead-acid batteries, alloys, semiconductors.',
    image: '/Minerals/Antimony.jpg', search: 'antimony',
  },
  {
    slug: 'coal-thar', name: 'Coal — Thar', formula: 'Lignite', category: 'energy', province: 'Sindh',
    places: 'Tharparkar district',
    description: 'The Thar coalfield is a lignite field in the Thar Desert, found in 1991. The Geological Survey of Pakistan estimates it at about 175 billion tonnes over more than 9,000 km². Several blocks are mined and feed power stations at the field.',
    uses: 'Power generation.',
    image: '/Minerals/Coal.jpg', search: 'coal',
    source: { label: 'Geological Survey of Pakistan estimate, cited in JICA’s Thar coal field survey', url: 'https://openjicareport.jica.go.jp/pdf/12113221_01.pdf' },
  },
  {
    slug: 'coal-balochistan', name: 'Coal — Balochistan', formula: 'Sub-bituminous', category: 'energy', province: 'Balochistan',
    places: 'Harnai, Duki, Mach, Sor Range',
    description: 'Sub-bituminous coal is mined across Harnai, Duki, Mach and the Sor Range, largely by small-scale underground operations.',
    uses: 'Brick kilns, cement, thermal power.',
    image: '/Minerals/Coal.jpg', search: 'coal',
  },
  {
    slug: 'rock-salt', name: 'Rock salt', formula: 'NaCl', category: 'industrial', province: 'Punjab',
    places: 'Salt Range — Khewra, Warcha, Kalabagh',
    description: 'Rock salt is mined in the Salt Range, where Khewra is the best-known mine. Its pink variety is exported as “Himalayan salt”.',
    uses: 'Food, chemicals, de-icing, decorative and wellness products.',
    image: '/Minerals/Rocksalt.jpg', search: 'salt',
  },
  {
    slug: 'gypsum', name: 'Gypsum', formula: 'CaSO₄·2H₂O', category: 'industrial', province: 'Balochistan',
    places: 'Loralai, Quetta region; also Khyber Pakhtunkhwa and Punjab',
    description: 'Gypsum occurs widely in Balochistan, Khyber Pakhtunkhwa and the Salt Range of Punjab.',
    uses: 'Cement, plasterboard, plaster, soil conditioning.',
    image: '/Minerals/Gypsum.jpg', search: 'gypsum',
  },
  {
    slug: 'barite', name: 'Barite', formula: 'BaSO₄', category: 'industrial', province: 'Khyber Pakhtunkhwa',
    places: 'Hazara region; also Khuzdar and Lasbela, Balochistan',
    description: 'Barite is mined in the Hazara region and in the Khuzdar–Lasbela belt of Balochistan.',
    uses: 'Weighting agent in oil and gas drilling fluids; paints, fillers.',
    image: '/Minerals/Barite.jpg', search: 'barite',
  },
  {
    slug: 'talc', name: 'Talc & soapstone', formula: 'Mg₃Si₄O₁₀(OH)₂', category: 'industrial', province: 'Khyber Pakhtunkhwa',
    places: 'Swat, Abbottabad, Kurram',
    description: 'Talc and soapstone are mined in Khyber Pakhtunkhwa and exported, mostly as lump.',
    uses: 'Ceramics, paint, paper, plastics, cosmetics.',
    image: '/Minerals/Talc.jpg', search: 'talc',
  },
  {
    slug: 'emerald', name: 'Emerald', formula: 'Be₃Al₂Si₆O₁₈', category: 'gemstone', province: 'Khyber Pakhtunkhwa',
    places: 'Swat Valley — Mingora',
    description: 'Emerald is mined around Mingora in the Swat Valley. Swat stones are typically small and strongly coloured.',
    uses: 'Jewellery.',
    image: '/Minerals/Emerald.jpg', search: 'emerald',
  },
  {
    slug: 'ruby', name: 'Ruby', formula: 'Al₂O₃ (corundum)', category: 'gemstone', province: 'Gilgit-Baltistan',
    places: 'Hunza Valley, Nagar district',
    description: 'Ruby occurs in the marbles of the Hunza Valley and Nagar, and is recovered mainly by artisanal mining.',
    uses: 'Jewellery.',
    image: '/Minerals/Ruby.jpg', search: 'ruby',
  },
  {
    slug: 'aquamarine-topaz', name: 'Aquamarine & topaz', formula: 'Beryl / silicate', category: 'gemstone', province: 'Gilgit-Baltistan',
    places: 'Skardu, Shigar Valley',
    description: 'Aquamarine, topaz and tourmaline come from the pegmatites of Skardu and the Shigar Valley, and are sold both as cut stones and as mineral specimens.',
    uses: 'Jewellery, collectors’ specimens.',
    image: '/Minerals/Aquamarine.jpg', search: 'aquamarine',
  },
  {
    slug: 'peridot', name: 'Peridot', formula: '(Mg,Fe)₂SiO₄', category: 'gemstone', province: 'Khyber Pakhtunkhwa',
    places: 'Kohistan — Suppat',
    description: 'Gem-quality peridot is mined at high altitude in the Suppat area of Kohistan, by artisanal miners during the summer months.',
    uses: 'Jewellery.',
    image: '/Minerals/Peridot.jpg', search: 'peridot',
  },
  {
    slug: 'marble', name: 'Marble', formula: 'CaCO₃ (metamorphic)', category: 'dimension_stone', province: 'Khyber Pakhtunkhwa',
    places: 'Buner, Mohmand, Swat; also Balochistan',
    description: 'Marble is quarried across Khyber Pakhtunkhwa and Balochistan in white, cream, black and veined varieties. Much of it is exported as blocks rather than as finished slabs.',
    uses: 'Flooring, cladding, worktops, decorative stone.',
    image: '/Minerals/Marble.jpg', search: 'marble',
  },
  {
    slug: 'onyx', name: 'Onyx', formula: 'Banded calcite', category: 'dimension_stone', province: 'Balochistan',
    places: 'Chagai district',
    description: 'Onyx marble — a banded, translucent stone in green, honey and mixed colours — is quarried in the Chagai district.',
    uses: 'Decorative stone, interiors, handicrafts.',
    image: '/Minerals/Onyx.jpg', search: 'onyx',
  },
  {
    slug: 'rare-earths', name: 'Rare earth elements', formula: 'REE (lanthanides)', category: 'rare_earth', province: 'Gilgit-Baltistan',
    places: 'Gilgit-Baltistan; also Khyber Pakhtunkhwa',
    description: 'Rare earth elements have been reported in Gilgit-Baltistan and Khyber Pakhtunkhwa. Exploration is at an early stage and no reserve has been established.',
    uses: 'Magnets, electronics, batteries, wind turbines.',
    image: '/Minerals/Rare-Earth.jpg', search: 'rare earth',
  },
]
