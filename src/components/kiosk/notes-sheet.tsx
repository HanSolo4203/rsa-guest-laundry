'use client'

import { useEffect } from 'react'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { KioskPanel } from '@/components/kiosk/kiosk-panel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { guestDisplayName, guestSurname } from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'

type NotesSheetProps = {
  booking: KioskBooking
  onClose: () => void
  avoidToast?: boolean
}

export function NotesSheet({ booking, onClose, avoidToast = false }: NotesSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const surname = guestSurname(booking.last_name)
  const guest = guestDisplayName(booking.last_name, booking.first_name, booking.first_name_initial)

  return (
    <KioskPanel
      title={`Notes for ${surname}`}
      description={`Notes for ${guest}`}
      avoidToast={avoidToast}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-500 md:text-base">Notes</p>
          <GuestName
            id="kiosk-notes-title"
            lastName={booking.last_name}
            firstName={booking.first_name}
            initial={booking.first_name_initial}
            surnameClassName="text-2xl md:text-3xl"
          />
          <ServiceDetail serviceName={booking.service_name} size="sheet" className="mt-2" />
          <StayDates
            collectionDate={booking.collection_date}
            departureDate={booking.departure_date}
            size="sheet"
            className="mt-1"
          />
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4">
          <GuestNotes notes={booking.additional_details} mode="full" />
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t border-neutral-200 px-4 py-3">
        <Button
          type="button"
          className="h-12 min-h-12 w-full rounded-xl bg-neutral-950 text-base font-semibold text-white hover:bg-neutral-800 md:h-16 md:text-lg"
          aria-label={`Close notes for ${surname}`}
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </KioskPanel>
  )
}
