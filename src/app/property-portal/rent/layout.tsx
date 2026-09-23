import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/rent',
  title: "Property to Rent — UK, Dubai & Pakistan",
  description: "Apartments, houses and commercial space to rent in the United Kingdom, Dubai and Pakistan.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
