import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/insights',
  title: "Property Market Insights",
  description: "Market commentary on real estate and infrastructure in Pakistan, the UK and the Gulf.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
