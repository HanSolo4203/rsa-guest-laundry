'use client'

import { useEffect, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { paidToastMessage } from '@/lib/payments/ledger'

type PaymentEvent = {
  id?: string
  booking_id?: string
  amount_cents?: number
  status?: string
}

function becameSucceeded(payload: RealtimePostgresChangesPayload<PaymentEvent>): PaymentEvent | null {
  if (!payload.new || typeof payload.new !== 'object') return null
  const next = payload.new as PaymentEvent
  if (next.status !== 'succeeded' || !next.id || !next.booking_id) return null
  if (typeof next.amount_cents !== 'number') return null
  if (payload.eventType === 'INSERT') return next
  if (payload.eventType !== 'UPDATE') return null
  const previous = payload.old
  if (!previous || typeof previous !== 'object' || !('status' in previous)) return null
  if (previous.status === 'succeeded') return null
  return next
}

export function useOutstandingPayments(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let timer: number | null = null

    const refreshCount = async () => {
      const { count: outstanding, error } = await supabase
        .from('admin_payment_ledger')
        .select('booking_id', { count: 'exact', head: true })
        .eq('payment_state', 'outstanding')
      if (cancelled || error) return
      setCount(outstanding ?? 0)
    }

    const scheduleRefresh = () => {
      if (timer != null) window.clearTimeout(timer)
      timer = window.setTimeout(() => void refreshCount(), 300)
    }

    const announce = async (payment: PaymentEvent) => {
      const { data } = await supabase
        .from('bookings')
        .select('room_number, properties(name)')
        .eq('id', payment.booking_id!)
        .maybeSingle()
      if (cancelled || payment.amount_cents == null || !payment.id) return
      const property = data?.properties as { name?: string | null } | { name?: string | null }[] | null
      const name = Array.isArray(property) ? property[0]?.name : property?.name
      toast.success(paidToastMessage(payment.amount_cents, data?.room_number, name), {
        id: `paid-${payment.id}`,
      })
    }

    const channel = supabase
      .channel('dashboard-payment-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          const payment = becameSucceeded(payload as RealtimePostgresChangesPayload<PaymentEvent>)
          if (payment) void announce(payment)
          scheduleRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => scheduleRefresh()
      )
      .subscribe()

    void refreshCount()

    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [])

  return count
}
