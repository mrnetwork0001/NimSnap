import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NimSnap - Pay-Per-Shot AI Photo Studio',
    short_name: 'NimSnap',
    description:
      'Studio photos for ten cents a shot, paid instantly in NIM or USDT.',
    // Straight into the studio: a Mini App user arrives intending to make
    // something, not to read a landing page.
    start_url: '/app',
    display: 'standalone',
    background_color: '#EDF2F7',
    theme_color: '#EDF2F7',
    orientation: 'portrait',
    icons: [
      { src: '/brand/nimsnap-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/nimsnap-logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
