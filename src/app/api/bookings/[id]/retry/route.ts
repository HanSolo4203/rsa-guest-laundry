import { NextResponse } from 'next/server'
import { GuestBookingError, retryBookingCheckout } from '@/lib/payments/guest-booking'
import { clientIp, rateLimit } from '@/lib/payments/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  if (!rateLimit(`booking-retry:${clientIp(request)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await context.params
  try {
    const redirectUrl = await retryBookingCheckout(id)
    return NextResponse.json({ redirectUrl })
  } catch (error) {
    if (error instanceof GuestBookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Payment retry failed', error)
    return NextResponse.json({ error: 'Payment could not be started' }, { status: 500 })
  }
}
