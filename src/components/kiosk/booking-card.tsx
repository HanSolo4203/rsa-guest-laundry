import { StickyNote } from 'lucide-react'
import { FrontDeskBadge } from '@/components/front-desk-badge'
import { GuestName } from '@/components/kiosk/guest-facts'
import { machineCode, serviceMarks, STAGE_ACCENT } from '@/components/kiosk/kiosk-ui'
import { PaymentStatusBadge, paymentBadge } from '@/components/payments/payment-status-badge'
import { PropertyBadge } from '@/components/property-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  formatArrivedAgo,
  formatStayDate,
  guestDisplayName,
  guestSurname,
  hasGuestNotes,
  machineForStage,
  serviceDetailLine,
} from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type BookingCardProps = {
  booking: KioskBooking
  now: number
  onWeigh?: () => void
  onAdvance?: () => void
  onNotes?: () => void
  timerLabel?: string | null
  timerProgress?: number | null
  alarming?: boolean
}

export function BookingCard({
  booking,
  now,
  onWeigh,
  onAdvance,
  onNotes,
  timerLabel,
  timerProgress,
  alarming,
}: BookingCardProps) {
  const notes = hasGuestNotes(booking.additional_details)
  const surname = guestSurname(booking.last_name)
  const guest = guestDisplayName(booking.last_name, booking.first_name, booking.first_name_initial)
  const ago = formatArrivedAgo(booking.created_at, now)
  const accent = STAGE_ACCENT[booking.stage]
  const machine = machineForStage(booking)
  const onOpen = onWeigh ?? onAdvance
  const service = serviceDetailLine(booking.service_name)
  const marks = serviceMarks(booking.service_name)
  const property = booking.property_name.trim() ? booking.property_name : null
  const room = booking.room_number?.trim()
  const collection = formatStayDate(booking.collection_date)
  const departure = formatStayDate(booking.departure_date)

  const body = (
    <>
      <div className="flex items-start gap-3">
        <GuestName
          heading="h3"
          lastName={booking.last_name}
          firstName={booking.first_name}
          initial={booking.first_name_initial}
          surnameClassName="text-2xl lg:text-3xl"
          givenClassName="text-base font-normal text-neutral-500 md:text-lg"
          className="min-w-0 flex-1"
        />
        {machine ? (
          <Badge className="mt-1 shrink-0 border-transparent bg-neutral-950 px-2 py-0.5 text-sm font-semibold text-white">
            <span className="sr-only">{machine.kind === 'dryer' ? 'Dryer ' : 'Washer '}</span>
            {machineCode(machine.kind, machine.number)}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {property ? (
          <PropertyBadge name={property} color={booking.primary_color} className="max-w-40 text-xs md:max-w-56 md:text-sm" />
        ) : null}
        {room ? (
          <Badge variant="outline" className="border-neutral-200 bg-white text-xs text-neutral-700 md:text-sm">
            Room {room}
          </Badge>
        ) : null}
        <FrontDeskBadge source={booking.source} className="text-xs md:text-sm" />
        <PaymentStatusBadge status={booking.payment_status} className="text-xs md:text-sm" />
        <Badge className="border-transparent bg-neutral-100 text-xs text-neutral-800 md:text-sm">
          {marks.label}
        </Badge>
        {marks.colourSep ? (
          <Badge className="border-transparent bg-violet-50 text-xs text-violet-700 md:text-sm">
            Colour sep
          </Badge>
        ) : null}
        {ago ? (
          <Badge variant="outline" className="border-neutral-200 bg-white text-xs text-neutral-600 md:text-sm">
            {ago}
          </Badge>
        ) : null}
      </div>
      {(collection || departure) ? (
        <p className="truncate text-sm text-neutral-500 md:text-base">
          {collection ? `Collect ${collection}` : null}
          {collection && departure ? ' · ' : null}
          {departure ? `Depart ${departure}` : null}
        </p>
      ) : null}
      <div className={cn('flex items-center gap-2', notes && onNotes && 'pr-12')}>
        <span className={cn('size-2.5 shrink-0 rounded-full', accent.dot)} aria-hidden="true" />
        <span className="text-sm font-medium text-neutral-700 md:text-base">{accent.label}</span>
      </div>
      {timerLabel ? (
        <div className={cn('space-y-1', notes && onNotes && 'pr-12')}>
          <Progress
            value={alarming ? 100 : timerProgress ?? 0}
            className={cn('h-1.5 bg-neutral-200', accent.bar)}
            aria-label={timerLabel}
          />
          <p
            className={cn(
              'text-sm tabular-nums md:text-base',
              alarming ? 'font-semibold text-amber-700' : 'text-neutral-600'
            )}
          >
            {timerLabel}
          </p>
        </div>
      ) : null}
    </>
  )

  const payment = paymentBadge(booking.payment_status).label
  const label =
    onAdvance && accent
      ? `${guest}${property ? `, ${property}` : ''}${room ? `, room ${room}` : ''}${booking.source === 'portal' ? ', front desk' : ''}, ${service}, ${accent.label}, ${payment}${notes ? ', has notes' : ''}${alarming ? ", time's up" : ''}`
      : onWeigh
        ? `${guest}${property ? `, ${property}` : ''}${room ? `, room ${room}` : ''}${booking.source === 'portal' ? ', front desk' : ''}, ${service}, to weigh, ${payment}${notes ? ', has notes' : ''}`
        : undefined

  return (
    <article className="group relative min-w-0">
      <Card
        className={cn(
          'gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white py-0 shadow-sm transition group-hover:shadow-md',
          'border-l-4',
          accent.border,
          alarming && 'kiosk-alarm'
        )}
      >
        {onOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            onClick={onOpen}
            aria-label={label}
          />
        ) : null}
        <CardContent
          className={cn(
            'relative z-10 flex min-h-[88px] flex-col gap-2 p-4 pointer-events-none',
            notes && onNotes && 'pb-5'
          )}
        >
          {body}
        </CardContent>
      </Card>
      {notes && onNotes ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="absolute right-3 bottom-3 z-20 flex size-12 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50 active:bg-neutral-100 md:size-14"
              aria-label={`Read all notes for ${surname}`}
              onClick={onNotes}
            >
              <StickyNote className="size-5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Guest notes</TooltipContent>
        </Tooltip>
      ) : null}
    </article>
  )
}
