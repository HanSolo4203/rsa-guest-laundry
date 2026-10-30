import type { Metadata, Viewport } from 'next'
import { KioskShell } from '@/components/kiosk/kiosk-shell'

export const metadata: Metadata = {
  title: 'RSL Kiosk',
  applicationName: 'RSL Kiosk',
  description: 'Staff kiosk for guest laundry',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: 'RSL Kiosk',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/kiosk-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/kiosk-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/kiosk-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="kiosk fixed inset-0 overflow-hidden bg-white text-neutral-950 antialiased">
      <KioskShell>{children}</KioskShell>
    </div>
  )
}
