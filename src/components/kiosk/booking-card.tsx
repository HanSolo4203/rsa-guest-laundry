import type { KioskBooking } from '@/lib/types/database'
import {
  formatArrivedAgo,
  guestDisplayName,
  guestSurname,
  hasGuestNotes,
  machineForStage,
  serviceDetailLine,
  STAGE_STYLES,
  stageTone,
} from '@/lib/kiosk/board'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { cn } from '@/lib/utils'
import { StickyNote } from 'lucide-react'

const cardChrome =
  'w-full rounded-3xl border-2 p-5 text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-950'

type BookingCardProps = {
  booking: KioskBooking
  now: number
  onWeigh?: () => void
  onAdvance?: () => void
  onNotes?: () => void
  timerLabel?: string | null
  alarming?: boolean
}

export function BookingCard({
  booking,
  now,
  onWeigh,
  onAdvance,
  onNotes,
  timerLabel,
  alarming,
}: BookingCardProps) {
  const notes = hasGuestNotes(booking.additional_details)
  const surname = guestSurname(booking.last_name)
  const guest = guestDisplayName(booking.last_name, booking.first_name, booking.first_name_initial)
  const ago = formatArrivedAgo(booking.created_at, now)
  const tone = stageTone(booking.stage)
  const styles = tone ? STAGE_STYLES[tone] : null
  const machine = machineForStage(booking)
  const onOpen = onWeigh ?? onAdvance
  const service = serviceDetailLine(booking.service_name)

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <GuestName
          heading="h3"
          lastName={booking.last_name}
          firstName={booking.first_name}
          initial={booking.first_name_initial}
          surnameClassName="text-[clamp(3rem,6.2vw,4.75rem)]"
          givenClassName={cn('text-4xl', styles ? 'text-white' : 'text-neutral-800')}
        />
        {machine ? (
          <span
            className={cn(
              'flex size-28 shrink-0 items-center justify-center rounded-3xl text-7xl font-bold tabular-nums',
              styles ? 'bg-white text-neutral-950' : 'bg-neutral-950 text-white'
            )}
          >
            <span className="sr-only">{machine.kind === 'dryer' ? 'Dryer ' : 'Washer '}</span>
            {machine.number}
          </span>
        ) : null}
      </div>
      <ServiceDetail serviceName={booking.service_name} className="mt-4" />
      <StayDates
        collectionDate={booking.collection_date}
        departureDate={booking.departure_date}
        className={cn('mt-3', styles ? 'text-white' : 'text-neutral-800')}
      />
      {styles ? (
        <p className="mt-4 text-5xl font-bold uppercase leading-none tracking-wide">
          {styles.label}
        </p>
      ) : null}
      {timerLabel ? (
        <p className="mt-3 text-5xl font-bold tabular-nums leading-none">{timerLabel}</p>
      ) : null}
      <GuestNotes notes={booking.additional_details} mode="clamp" className="mt-4" />
      <p
        className={cn(
          'mt-5 text-3xl font-semibold',
          styles ? 'text-white' : 'text-neutral-800'
        )}
      >
        {ago}
      </p>
    </>
  )

  const className = cn(
    cardChrome,
    styles ? styles.card : 'border-neutral-950 bg-white text-neutral-950',
    onOpen && (styles ? 'active:brightness-110' : 'active:bg-neutral-100'),
    notes && onNotes && 'pb-28',
    alarming && 'kiosk-alarm'
  )

  return (
    <article className="relative">
      {onOpen ? (
        <button
          type="button"
          className={className}
          onClick={onOpen}
          aria-label={
            onAdvance && styles
              ? `${guest}, ${service}, ${styles.label}${notes ? ', has notes' : ''}${alarming ? ", time's up" : ''}`
              : undefined
          }
        >
          {body}
        </button>
      ) : (
        <div className={className}>{body}</div>
      )}
      {notes && onNotes ? (
        <button
          type="button"
          className="absolute right-4 bottom-4 z-10 flex size-20 items-center justify-center rounded-2xl border-2 border-neutral-950 bg-white text-neutral-950 active:bg-neutral-100"
          aria-label={`Read all notes for ${surname}`}
          onClick={onNotes}
        >
          <StickyNote className="size-10" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  )
}
