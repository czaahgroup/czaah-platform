import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/saved',
  title: "Saved Properties",
  description: "The properties and developments you have saved.",
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
