import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/destinations',
  title: "Property Locations",
  description: "Explore property by city across the United Kingdom, Dubai and Pakistan.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
