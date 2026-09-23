import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/listings',
  title: "All Properties",
  description: "Every property currently listed with CZAAH Properties — search by location, type, bedrooms and price.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
