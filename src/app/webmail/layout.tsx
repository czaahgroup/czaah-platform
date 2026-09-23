import type { Metadata, Viewport } from 'next'

// Webmail installs as its own home-screen app ("CZAAH Mail") that opens
// straight into the mailbox, separate from the main CZAAH site app.
export const metadata: Metadata = {
  title: 'CZAAH Mail',
  manifest: '/mail-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CZAAH Mail',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  // The mail app behaves like an installed app (see the PWA manifest); it
  // keeps the old no-zoom viewport the whole site used to have.
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function WebmailLayout({ children }: { children: React.ReactNode }) {
  return children
}
