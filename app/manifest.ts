import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aid & Ace Tutoring',
    short_name: 'Aid & Ace',
    description: 'Fix the gaps. Ace the exam.',
    start_url: '/portal',
    display: 'standalone',
    background_color: '#F7F4EC',
    theme_color: '#2B1766',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
