import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'NimSnap — Pay-Per-Shot AI Photo Studio',
  description:
    'Turn any photo into a studio-grade portrait, avatar or product shot for $0.10, paid instantly in NIM or USDT. No account, no subscription.',
  applicationName: 'NimSnap',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'NimSnap — Pay-Per-Shot AI Photo Studio',
    description: 'Studio-grade AI photos for $0.10 a shot. Pay instantly with Nimiq Pay.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NimSnap — Pay-Per-Shot AI Photo Studio',
    description: 'Studio-grade AI photos for $0.10 a shot. Pay instantly with Nimiq Pay.',
  },
}

export const viewport: Viewport = {
  themeColor: '#05060B',
  width: 'device-width',
  initialScale: 1,
  // Fill the notch area — the app is designed to run full-bleed inside Nimiq Pay.
  viewportFit: 'cover',
  // Prevent double-tap zoom from fighting the comparison slider.
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
