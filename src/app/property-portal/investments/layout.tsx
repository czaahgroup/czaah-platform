import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/investments',
  title: 'Property Investments',
  description: 'Residential, commercial, off-plan and income-producing property in the United Kingdom, Dubai and Pakistan. Make an investment enquiry with CZAAH Properties.',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
