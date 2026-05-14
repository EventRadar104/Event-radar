import type { Metadata } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'
import { MobileTabBar } from '@/components/MobileTabBar'

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
  title: 'Event Radar — Norway',
  description: 'Find concerts, sports, food, art and more across every city in Norway.',
  openGraph: {
    title: 'Event Radar — Norway',
    description: 'Find your next favourite event across Norway.',
    siteName: 'Event Radar',
    locale: 'nb_NO',
    type: 'website',
  },
  other: {
    'impact-site-verification': '787be7d9-82e4-4097-9fbd-af6b3a2433ca',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body>
        <Nav />
        <main style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {children}
        </main>
        <MobileTabBar />
      </body>
    </html>
  )
}
