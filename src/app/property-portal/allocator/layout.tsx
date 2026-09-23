import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/allocator',
  title: "Compare Property Markets",
  description: "See what a budget buys across the markets CZAAH Properties covers, using live listings.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
