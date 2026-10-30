import { StageStepper } from '@/components/portal/stage-stepper'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { canConfirmReceived, displayPrice, formatPoint, guestName } from '@/lib/portal/board'
import type { PortalBooking } from '@/lib/types/database'

export function BookingCard({
  booking,
  showPrices,
  now,
  onPrimary,
  confirming,
  onOpen,
  onConfirm,
}: {
  booking: PortalBooking
  showPrices: boolean
  now: number
  onPrimary: string
  confirming: boolean
  onOpen: () => void
  onConfirm: () => void
}) {
  const name = guestName(booking)
  const room = booking.room_number?.trim()
  const created = formatPoint('Booked', booking.created_at, now)
  const awaitingDelivery = booking.status !== 'completed' && booking.status !== 'delivered' && !booking.delivered_at
  const readySince =
    awaitingDelivery && !booking.out_for_delivery_at && booking.stage === 'ready'
      ? formatPoint('Ready since', booking.ready_at, now)
      : null
  const outForDelivery =
    awaitingDelivery && booking.out_for_delivery_at
      ? formatPoint('Out for delivery', booking.out_for_delivery_at, now)
      : null
  const delivered =
    booking.delivered_at || booking.status === 'delivered' || booking.status === 'completed'
      ? formatPoint('Delivered', booking.delivered_at ?? booking.completed_at, now)
      : null
  const received = booking.received_at ? formatPoint('Received', booking.received_at, now) : null
  const price = displayPrice(booking, showPrices)
  const confirm = canConfirmReceived(booking)
  const statusLine = received ?? delivered ?? outForDelivery ?? readySince

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white py-0 shadow-sm transition hover:shadow-md">
      <button type="button" onClick={onOpen} className="w-full cursor-pointer text-left">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-950">{name}</h2>
              <p className="truncate text-sm text-slate-500">{booking.service_name}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {room ? (
                <Badge variant="outline" className="max-w-28 border-slate-200 bg-white text-slate-700">
                  <span className="truncate">Room {room}</span>
                </Badge>
              ) : null}
              {created ? (
                <time dateTime={booking.created_at} className="text-xs tabular-nums text-slate-500">
                  {created}
                </time>
              ) : null}
            </div>
          </div>
          <StageStepper booking={booking} />
          {statusLine || price ? (
            <div className="flex items-center justify-between gap-3">
              {statusLine ? (
                <p
                  className={
                    readySince || outForDelivery
                      ? 'text-sm font-semibold'
                      : 'text-sm font-medium text-slate-600'
                  }
                  style={readySince || outForDelivery ? { color: 'var(--portal-primary)' } : undefined}
                >
                  {statusLine}
                </p>
              ) : (
                <span />
              )}
              {price ? (
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">{price}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </button>
      {confirm ? (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl text-lg font-semibold disabled:cursor-wait disabled:opacity-70"
            style={{ backgroundColor: 'var(--portal-primary)', color: onPrimary }}
          >
            {confirming ? 'Confirming…' : 'Confirm received'}
          </button>
        </div>
      ) : null}
    </Card>
  )
}
