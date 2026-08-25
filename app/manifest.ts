import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NimSnap — Pay-Per-Shot AI Photo Studio',
    short_name: 'NimSnap',
    description:
      'Studio-grade AI portraits, avatars and product shots for $0.10 a shot, paid instantly in NIM or USDT.',
    start_url: '/',
    display: 'standalone',
    background_color: '#05060B',
    theme_color: '#05060B',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
