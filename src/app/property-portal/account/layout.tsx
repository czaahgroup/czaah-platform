import { portalMetadata } from '../_components/seo'

// The page is a client component, so its metadata lives here.
export const metadata = portalMetadata({
  path: '/account',
  title: 'Your Account',
  description: 'Sign in to CZAAH Properties to keep your saved properties and searches on every device.',
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
