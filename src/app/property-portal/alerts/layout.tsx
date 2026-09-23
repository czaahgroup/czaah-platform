import { portalMetadata } from '../_components/seo'

export const metadata = portalMetadata({
  path: '/alerts/unsubscribe',
  title: 'Email Alerts',
  description: 'Manage CZAAH Properties saved-search email alerts.',
  noindex: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
