import type { SupabaseClient } from '@supabase/supabase-js'
import { withoutUnpaidNote } from '@/lib/payments/money'
import { createServiceRoleClient } from '@/lib/supabase/service'

type YocoEvent = {
  id?: unknown
  type?: unknown
  payload?: {
    id?: unknown
    amount?: unknown
    currency?: unknown
    metadata?: unknown
  }
}

function metaString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null
}

function integerAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

export async function recordAndApplyYocoEvent(event: YocoEvent): Promise<void> {
  if (typeof event.id !== 'string' || event.id.length === 0 || event.id.length > 200) return
  if (typeof event.type !== 'string' || event.type.length === 0 || event.type.length > 100) return

  const supabase = createServiceRoleClient()
  const { error: insertError } = await supabase.from('payment_events').insert({
    yoco_event_id: event.id,
    type: event.type,
    raw: event,
  })

  if (insertError) {
    if (insertError.code === '23505') return
    throw insertError
  }

  try {
    if (event.type === 'payment.succeeded') await applySucceeded(supabase, event)
    else if (event.type === 'payment.failed') await applyFailed(supabase, event)
  } catch (error) {
    await supabase.from('payment_events').delete().eq('yoco_event_id', event.id)
    throw error
  }
}

async function applySucceeded(supabase: SupabaseClient, event: YocoEvent) {
  const metadata = event.payload?.metadata
  const paymentId = metaString(metadata, 'paymentId')
  const checkoutId = metaString(metadata, 'checkoutId')
  const bookingId = metaString(metadata, 'bookingId')
  const kind = metaString(metadata, 'kind')
  const amount = integerAmount(event.payload?.amount)
  const yocoPaymentId = typeof event.payload?.id === 'string' ? event.payload.id : null

  if (!paymentId || !checkoutId || amount == null || !yocoPaymentId) {
    console.error('Yoco success event is missing payment details', event.id)
    return
  }
  if (event.payload?.currency !== 'ZAR') {
    console.error('Yoco success event currency does not match', event.id)
    return
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, booking_id, kind, amount_cents, status, yoco_checkout_id, yoco_payment_id, prepaid_tier_max_kg')
    .eq('id', paymentId)
    .maybeSingle()

  if (error) throw error
  if (!payment) {
    console.error('Yoco payment was not found', paymentId)
    return
  }
  if (payment.yoco_checkout_id && payment.yoco_checkout_id !== checkoutId) {
    console.error('Yoco checkout id does not match', paymentId)
    return
  }
  if (bookingId && payment.booking_id !== bookingId) {
    console.error('Yoco booking id does not match', paymentId)
    return
  }
  if (kind && payment.kind !== kind) {
    console.error('Yoco payment kind does not match', paymentId)
    return
  }
  if (payment.amount_cents !== amount) {
    console.error('Yoco amount does not match', paymentId)
    return
  }

  if (payment.status !== 'succeeded') {
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        yoco_payment_id: yocoPaymentId,
        yoco_checkout_id: payment.yoco_checkout_id ?? checkoutId,
      })
      .eq('id', payment.id)
      .neq('status', 'succeeded')

    if (updateError) throw updateError
  }

  await markBookingPaid(supabase, payment)
}

async function markBookingPaid(
  supabase: SupabaseClient,
  payment: {
    booking_id: string
    kind: string
    amount_cents: number
    prepaid_tier_max_kg: number | null
  }
) {
  if (payment.kind === 'topup') {
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: 'card',
      })
      .eq('id', payment.booking_id)
    if (error) throw error
    return
  }

  const { data: booking, error: readError } = await supabase
    .from('bookings')
    .select('additional_details')
    .eq('id', payment.booking_id)
    .maybeSingle()
  if (readError) throw readError

  const { error } = await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      payment_method: 'card',
      prepaid_amount_cents: payment.amount_cents,
      prepaid_tier_max_kg: payment.prepaid_tier_max_kg,
      additional_details: withoutUnpaidNote(booking?.additional_details ?? null),
    })
    .eq('id', payment.booking_id)
  if (error) throw error
}

async function applyFailed(supabase: SupabaseClient, event: YocoEvent) {
  const paymentId = metaString(event.payload?.metadata, 'paymentId')
  const checkoutId = metaString(event.payload?.metadata, 'checkoutId')
  if (!paymentId) return

  let query = supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId).eq('status', 'pending')
  if (checkoutId) query = query.eq('yoco_checkout_id', checkoutId)
  const { error } = await query
  if (error) throw error
}
