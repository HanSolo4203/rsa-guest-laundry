import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookingPaymentStatus } from '@/components/home/booking-payment-status'
import { PropertyThemeProvider } from '@/components/property-theme-provider'
import { isUuid } from '@/lib/payments/money'
import { getActiveProperty } from '@/lib/properties'
import { createServiceRoleClient } from '@/lib/supabase/service'
import type { BookingPaymentStatus as PaymentState, OnlinePaymentStatus, PaymentKind } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; bookingId: string }>
  searchParams: Promise<{ payment?: string }>
}

function outcomeOf(value: string | undefined): 'success' | 'cancelled' | 'failed' | null {
  if (value === 'success' || value === 'cancelled' || value === 'failed') return value
  return null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const property = await getActiveProperty(slug)
  return { title: property ? `Payment · ${property.name}` : 'Payment' }
}

export default async function BookingPaymentPage({ params, searchParams }: PageProps) {
  const { slug, bookingId } = await params
  const query = await searchParams
  if (!isUuid(bookingId)) notFound()

  const property = await getActiveProperty(slug)
  if (!property) notFound()

  const supabase = createServiceRoleClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, property_id, payment_status, total_price, prepaid_amount_cents')
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !booking || booking.property_id !== property.id) notFound()

  const { data: latest } = await supabase
    .from('payments')
    .select('kind, status')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const paymentStatus = booking.payment_status as PaymentState
  const totalCents =
    paymentStatus === 'topup_due' && booking.total_price != null && booking.prepaid_amount_cents != null
      ? Math.round(Number(booking.total_price) * 100) - Number(booking.prepaid_amount_cents)
      : null

  return (
    <PropertyThemeProvider
      font={property.font}
      primaryColor={property.primary_color}
      accentColor={property.accent_color}
      backgroundColor={property.background_color}
      textColor={property.text_color}
      buttonTextColor={property.button_text_color}
    >
      <section className="guest-booking relative min-h-dvh">
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          <header className="pt-4 text-center">
            <p className="mb-2 text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
              {property.name}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--brand-primary)' }}>
              Laundry payment
            </h1>
          </header>
          <div className="guest-card mt-6 rounded-2xl p-5 shadow-lg">
            <BookingPaymentStatus
              bookingId={booking.id}
              outcome={outcomeOf(query.payment)}
              initial={{
                paymentStatus,
                latestKind: (latest?.kind as PaymentKind | undefined) ?? null,
                latestStatus: (latest?.status as OnlinePaymentStatus | undefined) ?? null,
                topupDueCents: totalCents != null && totalCents >= 200 ? totalCents : null,
              }}
            />
            <a
              href={`/${property.slug}`}
              className="guest-hint mt-6 block text-center text-sm underline"
            >
              Back to booking
            </a>
          </div>
        </div>
      </section>
    </PropertyThemeProvider>
  )
}
