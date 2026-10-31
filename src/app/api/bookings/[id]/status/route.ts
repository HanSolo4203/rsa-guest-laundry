import { NextResponse } from 'next/server'
import { isUuid, topupDueCents } from '@/lib/payments/money'
import { clientIp, rateLimit } from '@/lib/payments/rate-limit'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  if (!rateLimit(`booking-status:${clientIp(request)}`, 90, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await context.params
  if (!isUuid(id)) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const supabase = createServiceRoleClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('payment_status, total_price, prepaid_amount_cents')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Booking status failed', error)
    return NextResponse.json({ error: 'Could not load payment status' }, { status: 500 })
  }
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const { data: latest, error: latestError } = await supabase
    .from('payments')
    .select('kind, status')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    console.error('Booking payment status failed', latestError)
    return NextResponse.json({ error: 'Could not load payment status' }, { status: 500 })
  }

  return NextResponse.json({
    paymentStatus: booking.payment_status,
    latestKind: latest?.kind ?? null,
    latestStatus: latest?.status ?? null,
    topupDueCents:
      booking.payment_status === 'topup_due'
        ? topupDueCents(booking.total_price, booking.prepaid_amount_cents)
        : null,
  })
}
