import { Badge } from '@/components/ui/badge'
import type { BookingPaymentStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const BADGES: Record<BookingPaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'border-transparent bg-green-600 text-white' },
  pending: { label: 'Awaiting payment', className: 'border-transparent bg-amber-400 text-amber-950' },
  topup_due: { label: 'Top-up due', className: 'border-transparent bg-red-600 text-white' },
  unpaid: { label: 'Unpaid', className: 'border-transparent bg-neutral-500 text-white' },
  pay_on_delivery: { label: 'Pay on delivery', className: 'border-transparent bg-neutral-500 text-white' },
}

export function paymentBadge(status: string | null | undefined) {
  if (status && status in BADGES) return BADGES[status as BookingPaymentStatus]
  return BADGES.pay_on_delivery
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined
  className?: string
}) {
  const badge = paymentBadge(status)
  return <Badge className={cn(badge.className, className)}>{badge.label}</Badge>
}
