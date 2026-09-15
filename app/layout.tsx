import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'NimSnap — Studio photos for ten cents a shot.',
  description:
    'Turn any photo into a studio-grade portrait, avatar or product shot for $0.10, paid instantly in NIM or USDT. No account, no subscription.',
  applicationName: 'NimSnap',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'NimSnap — Studio photos for ten cents a shot.',
    description: 'Pay per shot with Nimiq Pay. No subscription, no signup.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NimSnap — Studio photos for ten cents a shot.',
    description: 'Pay per shot with Nimiq Pay. No subscription, no signup.',
  },
}

export const viewport: Viewport = {
  themeColor: '#EDF2F7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  )
}
