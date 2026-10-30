'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { StageStepper } from '@/components/portal/stage-stepper'
import { portalFont } from '@/components/portal/font'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  canConfirmReceived,
  displayPayment,
  displayPrice,
  formatPoint,
  formatStayDate,
  guestName,
  portalOnPrimary,
  portalPrimary,
} from '@/lib/portal/board'
import type { PortalBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

function useWideLayout() {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setWide(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return wide
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === false || children === '') return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-slate-900">{children}</dd>
    </div>
  )
}

function machineLabel(booking: PortalBooking): string | null {
  const parts = [
    booking.machine_number != null ? `Washer ${booking.machine_number}` : null,
    booking.dryer_number != null ? `Dryer ${booking.dryer_number}` : null,
  ].filter((part): part is string => part != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

function weightLabel(weight: number | null): string | null {
  if (weight == null) return null
  const rounded = weight.toFixed(1).replace(/\.0$/, '')
  return `${rounded} kg`
}

export function BookingSheet({
  booking,
  showPrices,
  primaryColor,
  now,
  confirming,
  onConfirm,
  onOpenChange,
}: {
  booking: PortalBooking | null
  showPrices: boolean
  primaryColor: string | null
  now: number
  confirming: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const wide = useWideLayout()
  const primary = portalPrimary(primaryColor)
  const [shown, setShown] = useState(booking)
  if (booking != null && booking !== shown) setShown(booking)

  return (
    <Sheet open={booking != null} onOpenChange={onOpenChange}>
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        className={cn(
          'portal gap-0 bg-white p-0 text-slate-900',
          portalFont.className,
          wide ? 'w-full sm:max-w-md' : 'max-h-[88dvh] rounded-t-3xl'
        )}
        style={{ '--portal-primary': primary } as CSSProperties}
      >
        {shown ? (
          <BookingDetails
            booking={shown}
            showPrices={showPrices}
            primary={primary}
            now={now}
            wide={wide}
            confirming={confirming}
            onConfirm={onConfirm}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function BookingDetails({
  booking,
  showPrices,
  primary,
  now,
  wide,
  confirming,
  onConfirm,
}: {
  booking: PortalBooking
  showPrices: boolean
  primary: string
  now: number
  wide: boolean
  confirming: boolean
  onConfirm: () => void
}) {
  const room = booking.room_number?.trim()
  const price = displayPrice(booking, showPrices)
  const payment = displayPayment(booking, showPrices)
  const collection = formatStayDate(booking.collection_date)
  const departure = formatStayDate(booking.departure_date)
  const awaitingDelivery = booking.status !== 'completed' && booking.status !== 'delivered' && !booking.delivered_at
  const readySince =
    awaitingDelivery && !booking.out_for_delivery_at && booking.stage === 'ready'
      ? formatPoint('Ready since', booking.ready_at, now)
      : null
  const confirm = canConfirmReceived(booking)

  return (
    <div className="overflow-y-auto px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {wide ? null : <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />}
      <SheetHeader className="gap-2 p-0 pr-8 text-left">
        <SheetTitle className="text-xl text-slate-950">{guestName(booking)}</SheetTitle>
        <SheetDescription className="text-slate-500">{booking.service_name}</SheetDescription>
        <div className="flex flex-wrap items-center gap-2">
          {room ? (
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              Room {room}
            </Badge>
          ) : null}
          {readySince ? (
            <Badge className="border-transparent text-white" style={{ backgroundColor: primary }}>
              {readySince}
            </Badge>
          ) : null}
        </div>
      </SheetHeader>
      <div className="mt-5">
        <StageStepper booking={booking} />
      </div>
      {price ? (
        <p className="mt-5 text-lg font-semibold tabular-nums text-slate-950">
          {price}
          {payment ? <span className="ml-2 text-sm font-medium text-slate-500">{payment}</span> : null}
        </p>
      ) : null}
      <dl className="mt-2">
        <Fact label="Booked">{formatPoint('', booking.created_at, now)}</Fact>
        <Fact label="Collect">{collection}</Fact>
        <Fact label="Depart">{departure}</Fact>
        <Fact label="Phone">
          {booking.phone ? (
            <a href={`tel:${booking.phone}`} style={{ color: primary }}>
              {booking.phone}
            </a>
          ) : null}
        </Fact>
        <Fact label="Weight">{weightLabel(booking.weight_kg)}</Fact>
        <Fact label="Machine">{machineLabel(booking)}</Fact>
        <Fact label="Out for delivery">{formatPoint('', booking.out_for_delivery_at, now)}</Fact>
        <Fact label="Delivered">{formatPoint('', booking.delivered_at ?? booking.completed_at, now)}</Fact>
        <Fact label="Received">{formatPoint('', booking.received_at, now)}</Fact>
      </dl>
      {confirm ? (
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="mt-5 flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl text-lg font-semibold disabled:cursor-wait disabled:opacity-70"
          style={{ backgroundColor: primary, color: portalOnPrimary(primary) }}
        >
          {confirming ? 'Confirming…' : 'Confirm received'}
        </button>
      ) : null}
      {booking.additional_details ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Notes</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800">{booking.additional_details}</p>
        </div>
      ) : null}
    </div>
  )
}
