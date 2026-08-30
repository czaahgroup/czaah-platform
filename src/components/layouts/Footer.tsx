import Link from 'next/link'

const SECTORS = [
  { label: 'Mines & Minerals', href: '/sectors/minerals' },
  { label: 'Real Estate', href: '/sectors/realestate' },
  { label: 'Technology & IT', href: '/sectors/technology' },
  { label: 'Textiles & Trade', href: '/sectors/textiles' },
  { label: 'Agriculture', href: '/sectors/agriculture' },
  { label: 'Pharmaceuticals', href: '/sectors/pharmaceuticals' },
  { label: 'Construction', href: '/sectors/construction' },
  { label: 'Engineering & Energy', href: '/sectors/engineering' },
  { label: 'Aviation & Charters', href: '/sectors/aviation' },
  { label: 'Human Resources', href: '/sectors/manpower' },
  { label: 'Tourism & Hospitality', href: '/sectors/tourism' },
  { label: 'Luxury Car Rentals', href: '/sectors/luxury-rentals' },
  { label: 'Education', href: '/sectors/education' },
] as const

const SERVICES = [
  { label: 'Business Setup', href: '/services/business-setup' },
  { label: 'Licensing & Compliance', href: '/services/licensing' },
  { label: 'Import & Export', href: '/services/import-export' },
  { label: 'Investor Protection', href: '/services/investor-protection' },
  { label: 'Investment Advisory', href: '/services/investment-advisory' },
  { label: 'Partnership Development', href: '/services/partnership-development' },
  { label: 'Government Contracts', href: '/services/government' },
  { label: 'Security Services', href: '/services/security' },
  { label: 'Payment Solutions', href: '/services/payment-solutions' },
  { label: 'Investment Migration', href: '/services/investment-migration' },
] as const

const COMPANY_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Our Team', href: '/team' },
  { label: 'Investments', href: '/investments' },
  { label: 'How It Works', href: '/process' },
  { label: 'Insights', href: '/insights' },
  { label: 'Contact', href: '/contact' },
  { label: 'Webmail', href: '/webmail' },
] as const

const LEGAL_LINKS = [
  { label: 'FAQs', href: '/faq' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
] as const

function FooterMarkhor() {
  return (
    <svg className="footer-markhor" viewBox="-5 -12 100 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ftHornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8a6f2e"/>
          <stop offset="40%" stopColor="#c9a84c"/>
          <stop offset="60%" stopColor="#e8c97a"/>
          <stop offset="100%" stopColor="#8a6f2e"/>
        </linearGradient>
        <linearGradient id="ftBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c9a84c"/>
          <stop offset="100%" stopColor="#8a6f2e"/>
        </linearGradient>
      </defs>
      <path d="M 38 38 C 34 30, 24 22, 20 12 C 17 4, 22 -2, 28 2 C 34 6, 36 16, 32 24 C 28 32, 22 34, 18 28 C 15 22, 18 14, 24 12" stroke="url(#ftHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 35 36 C 30 28, 22 20, 22 12 C 22 7, 26 4, 29 6" stroke="url(#ftHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M 52 36 C 56 28, 66 20, 70 10 C 73 2, 68 -4, 62 0 C 56 4, 54 14, 58 22 C 62 30, 68 32, 72 26 C 75 20, 72 12, 66 10" stroke="url(#ftHornGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 55 34 C 60 26, 68 18, 68 10 C 68 5, 64 2, 61 4" stroke="url(#ftHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M 34 38 C 32 42, 32 48, 36 52 L 38 58 C 40 64, 50 64, 52 58 L 54 52 C 58 48, 58 42, 56 38 C 54 34, 50 32, 45 32 C 40 32, 36 34, 34 38 Z" fill="url(#ftBodyGrad)" opacity="0.9"/>
      <path d="M 42 64 C 41 70, 40 76, 41 82" stroke="url(#ftHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M 45 65 C 45 72, 45 78, 45 84" stroke="url(#ftHornGrad)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55"/>
      <path d="M 48 64 C 49 70, 50 76, 49 82" stroke="url(#ftHornGrad)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
      <circle cx="41" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
      <circle cx="49" cy="44" r="1.5" fill="#e8c97a" opacity="0.9"/>
      <path d="M 38 58 C 36 66, 35 76, 38 86 C 40 90, 50 90, 52 86 C 55 76, 54 66, 52 58" fill="url(#ftBodyGrad)" opacity="0.5"/>
      <line x1="35" y1="108" x2="55" y2="108" stroke="url(#ftHornGrad)" strokeWidth="1.5" opacity="0.7"/>
    </svg>
  )
}

export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <div className="logo">
            <FooterMarkhor />
            <span className="footer-wordmark">CZAAH</span>
          </div>
          <div className="footer-tagline">Capital &middot; Ventures &middot; Infrastructure</div>
          <p>A London-based international investment facilitation group at the intersection of government, resources, and international capital.</p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Sectors</h4>
            {SECTORS.map((s) => (
              <Link key={s.href} href={s.href}>{s.label}</Link>
            ))}
          </div>
          <div className="footer-col">
            <h4>Services</h4>
            {SERVICES.map((s) => (
              <Link key={s.href} href={s.href}>{s.label}</Link>
            ))}
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            {COMPANY_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>&copy; 2026 CZAAH. All rights reserved.</span>
        <div className="entities"><span>Islamabad &middot; London &middot; Brussels &middot; Hong Kong &middot; Middle East</span></div>
      </div>
    </footer>
  )
}
