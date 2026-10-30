import type { Metadata, Viewport } from 'next'
import { PortalShell } from '@/components/portal/portal-shell'
import { portalFont } from '@/components/portal/font'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Laundry Portal',
  applicationName: 'Laundry Portal',
  description: 'Track guest laundry for your property',
  manifest: '/portal.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: 'Laundry Portal',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/portal-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/portal-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/portal-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={cn('portal min-h-dvh bg-slate-50 text-slate-900 antialiased', portalFont.className)}>
      <PortalShell>{children}</PortalShell>
    </div>
  )
}
