import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/off-plan',
  title: "Off-Plan & New Developments",
  description: "Off-plan property and new developments with staged payment plans in Dubai, Pakistan and the United Kingdom.",
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
