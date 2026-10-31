import { createGuestBookingSchema } from '@/lib/schemas/booking'
import { isUuid, randsToCents } from '@/lib/payments/money'
import { openYocoCheckout } from '@/lib/payments/yoco'
import { createServiceRoleClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

export type GuestBookingResult =
  | { bookingId: string }
  | { bookingId: string; redirectUrl: string }

async function propertyForBooking(supabase: ServiceClient, propertyId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('id, slug, active, ask_room_number')
    .eq('id', propertyId)
    .maybeSingle()

  if (error) throw new Error('Could not load the property')
  if (!data?.active || typeof data.slug !== 'string') return null
  return data
}

async function serviceIsOffered(supabase: ServiceClient, propertyId: string, serviceId: string) {
  const { data, error } = await supabase
    .from('property_services')
    .select('service_id')
    .eq('property_id', propertyId)
    .eq('service_id', serviceId)
    .maybeSingle()

  if (error) throw new Error('Could not load the service')
  return Boolean(data)
}

export async function createGuestBooking(input: unknown): Promise<GuestBookingResult> {
  const parsed = createGuestBookingSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check the booking details'
    throw new GuestBookingError(message, 400)
  }

  const data = parsed.data
  const firstName = data.first_name.trim()
  const lastName = data.last_name.trim()
  const phone = data.phone.trim()
  if (firstName.length < 2 || lastName.length < 2 || phone.length < 10) {
    throw new GuestBookingError('Check the booking details', 400)
  }

  const supabase = createServiceRoleClient()
  const property = await propertyForBooking(supabase, data.property_id)
  if (!property) throw new GuestBookingError('This property is not taking bookings', 400)

  if (!isUuid(data.service_id) || !(await serviceIsOffered(supabase, property.id, data.service_id))) {
    throw new GuestBookingError('Choose a service offered at this property', 400)
  }

  const roomNumber = property.ask_room_number ? data.room_number?.trim() || null : null
  const notes = data.additional_details?.trim() || null
  const payNow = data.payment_choice === 'pay_now'

  let amountCents: number | null = null
  let tierMaxKg: number | null = null
  if (payNow) {
    const tierId = data.tier_id
    if (!tierId) throw new GuestBookingError('Choose a bag size', 400)
    const { data: tier, error } = await supabase
      .from('service_pricing_tiers')
      .select('id, max_weight, price, service_id')
      .eq('id', tierId)
      .eq('service_id', data.service_id)
      .maybeSingle()

    if (error) throw new Error('Could not load the price')
    if (!tier) throw new GuestBookingError('Choose a bag size for this service', 400)
    amountCents = randsToCents(Number(tier.price))
    tierMaxKg = Number(tier.max_weight)
    if (amountCents == null || !Number.isFinite(tierMaxKg) || tierMaxKg <= 0) {
      throw new GuestBookingError('Online payment is not available for that bag size', 400)
    }
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      property_id: property.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      room_number: roomNumber,
      service_id: data.service_id,
      collection_date: data.collection_date,
      departure_date: data.departure_date,
      additional_details: notes,
      status: 'pending',
      stage: 'to_weigh',
      source: 'guest',
      machine_number: null,
      dryer_number: null,
      weighed_by: null,
      weighed_at: null,
      washing_at: null,
      drying_at: null,
      finishing_at: null,
      ready_at: null,
      ready_acknowledged_at: null,
      out_for_delivery_at: null,
      delivered_at: null,
      received_at: null,
      payment_method: null,
      total_price: null,
      weight_kg: null,
      completed_at: null,
      payment_status: payNow ? 'pending' : 'pay_on_delivery',
      prepaid_amount_cents: null,
      prepaid_tier_max_kg: null,
    })
    .select('id')
    .single()

  if (bookingError || !booking) throw new Error('Could not create the booking')
  if (!payNow || amountCents == null) return { bookingId: booking.id }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      kind: 'booking',
      amount_cents: amountCents,
      currency: 'ZAR',
      status: 'pending',
      prepaid_tier_max_kg: tierMaxKg,
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    await supabase.from('bookings').delete().eq('id', booking.id)
    throw new Error('Could not start the payment')
  }

  try {
    const checkout = await openYocoCheckout({
      slug: property.slug,
      bookingId: booking.id,
      paymentId: payment.id,
      kind: 'booking',
      amountCents,
    })
    const { error: checkoutError } = await supabase
      .from('payments')
      .update({ yoco_checkout_id: checkout.id })
      .eq('id', payment.id)

    if (checkoutError) throw new Error('Could not save the payment')
    return { bookingId: booking.id, redirectUrl: checkout.redirectUrl }
  } catch (error) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id).eq('status', 'pending')
    if (error instanceof GuestBookingError) throw error
    throw new GuestBookingError('Payment could not be started', 502, booking.id)
  }
}

export class GuestBookingError extends Error {
  status: number
  bookingId?: string

  constructor(message: string, status: number, bookingId?: string) {
    super(message)
    this.status = status
    this.bookingId = bookingId
  }
}

export async function retryBookingCheckout(bookingId: string): Promise<string> {
  if (!isUuid(bookingId)) throw new GuestBookingError('Booking not found', 404)
  const supabase = createServiceRoleClient()
  const booking = await loadCheckoutBooking(supabase, bookingId)
  if (!booking) throw new GuestBookingError('Booking not found', 404)
  if (booking.payment_status === 'paid') throw new GuestBookingError('This booking is already paid', 409)
  if (booking.payment_status !== 'pending') {
    throw new GuestBookingError('This booking is not waiting for an online payment', 409)
  }

  const { data: previous, error: previousError } = await supabase
    .from('payments')
    .select('prepaid_tier_max_kg, amount_cents')
    .eq('booking_id', bookingId)
    .eq('kind', 'booking')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (previousError || previous?.prepaid_tier_max_kg == null) {
    throw new GuestBookingError('This booking has no prepaid tier to retry', 409)
  }

  const { data: tier, error: tierError } = await supabase
    .from('service_pricing_tiers')
    .select('price, max_weight')
    .eq('service_id', booking.service_id)
    .eq('max_weight', previous.prepaid_tier_max_kg)
    .order('min_weight')
    .limit(1)
    .maybeSingle()

  if (tierError || !tier) throw new GuestBookingError('That bag size is no longer available', 409)
  const amountCents = randsToCents(Number(tier.price))
  if (amountCents == null) throw new GuestBookingError('Online payment is not available for that bag size', 409)

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('booking_id', bookingId)
    .eq('kind', 'booking')
    .eq('status', 'pending')

  return insertCheckout(supabase, {
    bookingId,
    slug: booking.slug,
    kind: 'booking',
    amountCents,
    prepaidTierMaxKg: Number(tier.max_weight),
  })
}

export async function createTopupCheckout(bookingId: string): Promise<{ redirectUrl: string; amountCents: number }> {
  if (!isUuid(bookingId)) throw new GuestBookingError('Booking not found', 404)
  const supabase = createServiceRoleClient()
  const booking = await loadCheckoutBooking(supabase, bookingId)
  if (!booking) throw new GuestBookingError('Booking not found', 404)
  if (booking.payment_status !== 'topup_due') {
    throw new GuestBookingError('This booking does not need a top-up', 409)
  }

  const totalCents = Math.round(Number(booking.total_price) * 100)
  const prepaid = booking.prepaid_amount_cents
  if (!Number.isFinite(totalCents) || prepaid == null) {
    throw new GuestBookingError('The top-up amount is not ready yet', 409)
  }
  const difference = totalCents - prepaid
  if (difference < 200) {
    throw new GuestBookingError('The difference is below the minimum online payment', 409)
  }

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('booking_id', bookingId)
    .eq('kind', 'topup')
    .eq('status', 'pending')

  const redirectUrl = await insertCheckout(supabase, {
    bookingId,
    slug: booking.slug,
    kind: 'topup',
    amountCents: difference,
    prepaidTierMaxKg: null,
  })
  return { redirectUrl, amountCents: difference }
}

async function loadCheckoutBooking(supabase: ServiceClient, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, property_id, service_id, payment_status, total_price, prepaid_amount_cents, properties(slug)')
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !data) return null
  const property = data.properties as { slug?: string } | { slug?: string }[] | null
  const slug = Array.isArray(property) ? property[0]?.slug : property?.slug
  if (!slug) return null
  return {
    id: data.id as string,
    service_id: data.service_id as string,
    payment_status: data.payment_status as string,
    total_price: data.total_price as number | null,
    prepaid_amount_cents: data.prepaid_amount_cents as number | null,
    slug,
  }
}

async function insertCheckout(
  supabase: ServiceClient,
  input: {
    bookingId: string
    slug: string
    kind: 'booking' | 'topup'
    amountCents: number
    prepaidTierMaxKg: number | null
  }
) {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      booking_id: input.bookingId,
      kind: input.kind,
      amount_cents: input.amountCents,
      currency: 'ZAR',
      status: 'pending',
      prepaid_tier_max_kg: input.prepaidTierMaxKg,
    })
    .select('id')
    .single()

  if (error || !payment) throw new Error('Could not start the payment')

  try {
    const checkout = await openYocoCheckout({
      slug: input.slug,
      bookingId: input.bookingId,
      paymentId: payment.id,
      kind: input.kind,
      amountCents: input.amountCents,
    })
    const { error: saveError } = await supabase
      .from('payments')
      .update({ yoco_checkout_id: checkout.id })
      .eq('id', payment.id)
    if (saveError) throw new Error('Could not save the payment')
    return checkout.redirectUrl
  } catch (error) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id).eq('status', 'pending')
    if (error instanceof GuestBookingError) throw error
    throw new GuestBookingError('Payment could not be started', 502)
  }
}
