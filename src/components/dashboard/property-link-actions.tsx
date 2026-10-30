'use client'

import { useEffect, useState } from 'react'
import { Link2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copyPropertyBookingLink, downloadPropertyQr, propertyBookingUrl } from '@/lib/property-booking-link'

export function PropertyLinkActions({ slug, savedSlug }: { slug: string; savedSlug?: string }) {
  const linkSlug = savedSlug ?? slug
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(propertyBookingUrl(linkSlug))
  }, [linkSlug])

  async function copyLink() {
    try {
      const copied = await copyPropertyBookingLink(linkSlug)
      setUrl(copied)
      toast.success('Booking link copied')
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
    <div className="flex min-w-0 flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyLink}
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
      {url ? <p className="max-w-full truncate text-xs text-gray-400">{url}</p> : null}
      {savedSlug && slug !== savedSlug ? (
        <p className="text-xs text-gray-400">Save to update the booking link.</p>
      ) : null}
    </div>
  )
}
