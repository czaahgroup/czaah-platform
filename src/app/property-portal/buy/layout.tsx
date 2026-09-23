import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/buy',
  title: "Property for Sale — UK, Dubai & Pakistan",
  description: "Homes, commercial property, plots and new developments for sale in the United Kingdom, Dubai and Pakistan.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
