import type { Metadata, Viewport } from "next"
import { CookieConsent } from "@/components/CookieConsent"
import { AiChatWidget } from "@/components/AiChatWidget"
import { InstallAppBanner } from "@/components/InstallAppBanner"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL('https://czaah.com'),
  title: "CZAAH — International Investment Facilitation Group",
  description:
    "CZAAH — London-based international investment facilitation group. Connecting global capital with opportunities across the UK and international markets across 13 sectors.",
  manifest: "/favicon/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CZAAH",
  },
  openGraph: {
    title: "CZAAH — Capital · Ventures · Infrastructure",
    description:
      "A London-based international investment facilitation group connecting global capital with opportunities across the UK and international markets.",
    siteName: "CZAAH",
    type: "website",
    images: [{ url: "/favicon/czaah-shared.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CZAAH — Capital · Ventures · Infrastructure",
    description:
      "London-based international investment facilitation group.",
    images: ["/favicon/czaah-shared.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Raleway:wght@200;300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* PWA: Apple-specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Splash screens for iOS */}
        <link rel="apple-touch-startup-image" href="/favicon/czaah-shared.png" />
      </head>
      <body>
        {children}
        <CookieConsent />
        <AiChatWidget />
        <InstallAppBanner />
        {/* Register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
