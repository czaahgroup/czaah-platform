import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/contact',
  title: "Contact Us",
  description: "Speak to CZAAH Properties about buying, selling, renting or investing in property.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
