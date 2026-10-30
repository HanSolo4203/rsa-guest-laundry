'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { guestSurname } from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-notes-title"
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-white text-neutral-950',
        avoidToast && 'pb-40'
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b-2 border-neutral-950 px-6 py-5">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold">Notes</p>
          <div className="mt-2 flex flex-wrap items-start gap-x-10 gap-y-4">
            <GuestName
              id="kiosk-notes-title"
              lastName={booking.last_name}
              firstName={booking.first_name}
              initial={booking.first_name_initial}
              surnameClassName="text-5xl"
              givenClassName="text-4xl text-neutral-800"
            />
            <div className="min-w-72 flex-1">
              <ServiceDetail serviceName={booking.service_name} size="sheet" />
              <StayDates
                collectionDate={booking.collection_date}
                departureDate={booking.departure_date}
                size="sheet"
                className="mt-3 text-neutral-800"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-neutral-950 bg-white"
          aria-label={`Close notes for ${surname}`}
          onClick={onClose}
        >
          <X className="size-8" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <GuestNotes notes={booking.additional_details} mode="full" />
      </div>
      <div className="border-t-2 border-neutral-950 px-6 py-5">
        <button
          type="button"
          className="h-20 w-full rounded-2xl bg-neutral-950 text-3xl font-bold text-white"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
