import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/sell',
  title: "Sell or Let Your Property",
  description: "List your property with CZAAH Properties. Tell us about it and our team will be in touch.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
