import { NextResponse } from 'next/server'
import { GuestBookingError, createGuestBooking } from '@/lib/payments/guest-booking'
import { clientIp, rateLimit } from '@/lib/payments/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 10 * 60 * 1000
const LIMIT = 8

export async function POST(request: Request) {
  if (!rateLimit(`bookings:${clientIp(request)}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Check the booking details' }, { status: 400 })
  }

  try {
    const result = await createGuestBooking(body)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GuestBookingError) {
      return NextResponse.json(
        { error: error.message, ...(error.bookingId ? { bookingId: error.bookingId } : {}) },
        { status: error.status }
      )
    }
    console.error('Guest booking failed', error)
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 })
  }
}
