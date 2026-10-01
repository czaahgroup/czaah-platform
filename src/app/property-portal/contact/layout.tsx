import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/contact',
  title: "Speak to an Advisor",
  description: "Speak to a CZAAH Properties advisor about buying, selling, renting or investing in property.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
