import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RSL Kiosk',
    short_name: 'RSL Kiosk',
    description: 'Staff kiosk for guest laundry',
    start_url: '/kiosk',
    scope: '/',
    display: 'fullscreen',
    background_color: '#fafafa',
    theme_color: '#fafafa',
    icons: [
      {
        src: '/icons/kiosk-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/kiosk-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/kiosk-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
