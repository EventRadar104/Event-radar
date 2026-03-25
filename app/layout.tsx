import type { Metadata } from 'next'
import { Instrument_Serif, Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className={`${instrumentSerif.variable} ${inter.variable}`}>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
