'use client'

import { useEffect, useState } from 'react'
import { Link2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  copyPropertyBookingLink,
  copyPropertyPortalLink,
  downloadPropertyQr,
  propertyBookingUrl,
  propertyPortalUrl,
} from '@/lib/property-booking-link'

export function PropertyLinkActions({
  slug,
  savedSlug,
  kind = 'both',
}: {
  slug: string
  savedSlug?: string
  kind?: 'both' | 'portal'
}) {
  const linkSlug = savedSlug ?? slug
  const [bookingUrl, setBookingUrl] = useState('')
  const [portalUrl, setPortalUrl] = useState('')

  useEffect(() => {
    setBookingUrl(propertyBookingUrl(linkSlug))
    setPortalUrl(propertyPortalUrl(linkSlug))
  }, [linkSlug])

  async function copyBooking() {
    try {
      const copied = await copyPropertyBookingLink(linkSlug)
      setBookingUrl(copied)
      toast.success('Booking link copied')
    } catch (error) {
      console.error(error)
      toast.error('Could not copy the link')
    }
  }

  async function copyPortal() {
    try {
      const copied = await copyPropertyPortalLink(linkSlug)
      setPortalUrl(copied)
      toast.success('Portal link copied')
    } catch (error) {
      console.error(error)
      toast.error('Could not copy the link')
    }
  }

  async function downloadQr() {
    try {
      await downloadPropertyQr(linkSlug)
    } catch (error) {
      console.error(error)
      toast.error('Could not download the QR code')
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-3">
      {kind === 'both' ? (
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">Booking</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyBooking}
              className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy link
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadQr}
              className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              <QrCode className="h-3.5 w-3.5" />
              Download QR code
            </Button>
          </div>
          {bookingUrl ? <p className="max-w-full truncate text-xs text-gray-400">{bookingUrl}</p> : null}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">Portal</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyPortal}
            className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
          >
            <Link2 className="h-3.5 w-3.5" />
            Copy link
          </Button>
        </div>
        {portalUrl ? <p className="max-w-full truncate text-xs text-gray-400">{portalUrl}</p> : null}
      </div>
      {savedSlug && slug !== savedSlug ? (
        <p className="text-xs text-gray-400">Save to update the booking and portal links.</p>
      ) : null}
    </div>
  )
}
