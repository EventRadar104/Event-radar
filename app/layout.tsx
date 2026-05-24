import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'
import { MobileTabBar } from '@/components/MobileTabBar'
import { CookieBanner } from '@/components/CookieBanner'
import { Analytics } from '@vercel/analytics/react'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Event Radar — Find events in Norway',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  description: 'Event Radar is Norway\'s event discovery platform. Find concerts, sports, food festivals, art exhibitions and outdoor activities across every city in Norway.',
  openGraph: {
    title: 'Event Radar — Find events in Norway',
    description: 'Event Radar is Norway\'s event discovery platform. Find concerts, sports, food festivals, art exhibitions and outdoor activities across every city in Norway.',
    url: 'https://eventradar.no',
    siteName: 'Event Radar',
    images: [
      {
        url: 'https://eventradar.no/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Event Radar — Find events in Norway',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Event Radar — Find events in Norway',
    description: 'Event Radar is Norway\'s event discovery platform. Find concerts, sports, food festivals, art exhibitions and outdoor activities across every city in Norway.',
    images: ['https://eventradar.no/og-image.png'],
  },
  other: {
    'impact-site-verification': '787be7d9-82e4-4097-9fbd-af6b3a2433ca',
    'google-site-verification': '0tfm0RyyBVoj7H2d3OcWzdRGbEMDbsu95_8CdgcTk8I',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body>
        <Nav />
        <main>
          {children}
        </main>
        <MobileTabBar />
        <CookieBanner />
        <Analytics />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
