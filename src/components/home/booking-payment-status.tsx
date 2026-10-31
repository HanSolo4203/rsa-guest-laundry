'use client'

import { useEffect, useState } from 'react'
import { isYocoRedirect } from '@/lib/payments/redirect'
import { formatCents } from '@/lib/payments/money'
import type { BookingPaymentStatus, PaymentKind, OnlinePaymentStatus } from '@/lib/types/database'

type Outcome = 'success' | 'cancelled' | 'failed' | null

type Snapshot = {
  paymentStatus: BookingPaymentStatus
  latestKind: PaymentKind | null
  latestStatus: OnlinePaymentStatus | null
  topupDueCents: number | null
}

export function BookingPaymentStatus({
  bookingId,
  initial,
  outcome,
}: {
  bookingId: string
  initial: Snapshot
  outcome: Outcome
}) {
  const [snapshot, setSnapshot] = useState(initial)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const polling = shouldPoll(snapshot, outcome)

  useEffect(() => {
    if (!polling) return
    let stopped = false

    async function poll() {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/status`)
        if (!response.ok) return
        const body = (await response.json()) as Snapshot
        if (!stopped && body.paymentStatus) setSnapshot(body)
      } catch {
        // The next poll retries. The success page never marks a booking paid.
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), 2000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [bookingId, polling])

  const view = describe(snapshot, outcome)

  async function startCheckout(path: 'retry' | 'topup') {
    setWorking(true)
    setError(null)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/${path}`, { method: 'POST' })
      const body = (await response.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null
      if (!response.ok || !body?.redirectUrl || !isYocoRedirect(body.redirectUrl)) {
        setError(body?.error || 'Payment could not be started')
        setWorking(false)
        return
      }
      window.location.assign(body.redirectUrl)
    } catch {
      setError('Payment could not be started')
      setWorking(false)
    }
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--brand-primary)' }}>
        {view.title}
      </h2>
      {view.body ? <p className="text-base leading-relaxed">{view.body}</p> : null}
      {error ? <p className="guest-error text-sm">{error}</p> : null}
      {view.action === 'retry' ? (
        <button
          type="button"
          className="guest-submit inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-medium disabled:opacity-60"
          disabled={working}
          onClick={() => void startCheckout('retry')}
        >
          {working ? 'Starting payment…' : 'Try again'}
        </button>
      ) : null}
      {view.action === 'topup' ? (
        <button
          type="button"
          className="guest-submit inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-medium disabled:opacity-60"
          disabled={working}
          onClick={() => void startCheckout('topup')}
        >
          {working ? 'Starting payment…' : snapshot.topupDueCents != null ? `Pay ${formatCents(snapshot.topupDueCents)}` : 'Pay the difference'}
        </button>
      ) : null}
    </div>
  )
}

function shouldPoll(snapshot: Snapshot, outcome: Outcome): boolean {
  if (snapshot.paymentStatus === 'paid' || snapshot.paymentStatus === 'pay_on_delivery') return false
  if (snapshot.paymentStatus === 'pending') {
    return snapshot.latestStatus == null || snapshot.latestStatus === 'pending'
  }
  return snapshot.paymentStatus === 'topup_due' && outcome === 'success' && snapshot.latestKind === 'topup' && snapshot.latestStatus === 'pending'
}

function describe(snapshot: Snapshot, outcome: Outcome): { title: string; body: string; action: 'retry' | 'topup' | null } {
  const failed =
    outcome === 'cancelled' ||
    outcome === 'failed' ||
    snapshot.latestStatus === 'failed' ||
    snapshot.latestStatus === 'cancelled' ||
    snapshot.latestStatus === 'expired'

  if (snapshot.paymentStatus === 'paid') {
    return { title: 'Paid ✓', body: 'Your payment is confirmed.', action: null }
  }

  if (snapshot.paymentStatus === 'topup_due') {
    if (outcome === 'success' && snapshot.latestKind === 'topup' && (snapshot.latestStatus === 'pending' || snapshot.latestStatus == null)) {
      return { title: 'Payment processing…', body: 'This page updates when the payment is confirmed.', action: null }
    }
    if (failed && snapshot.latestKind === 'topup') {
      return {
        title: 'Payment not completed',
        body: snapshot.topupDueCents == null
          ? 'The difference is below the minimum online payment. Reception can collect it.'
          : 'You can try the top-up again.',
        action: snapshot.topupDueCents == null ? null : 'topup',
      }
    }
    return {
      title: 'Top-up due',
      body: snapshot.topupDueCents == null
        ? 'Your bag weighed more than the prepaid tier. The difference is below the minimum online payment.'
        : 'Your bag weighed more than the prepaid tier.',
      action: snapshot.topupDueCents == null ? null : 'topup',
    }
  }

  if (snapshot.paymentStatus === 'pending') {
    if (!failed && (outcome === 'success' || snapshot.latestStatus === 'pending')) {
      return { title: 'Payment processing…', body: 'This page updates when the payment is confirmed.', action: null }
    }
    if (failed) {
      return { title: 'Payment not completed', body: 'You can try the payment again.', action: 'retry' }
    }
    return { title: 'Awaiting payment', body: 'Finish payment to confirm the booking.', action: 'retry' }
  }

  return {
    title: 'Pay on delivery',
    body: 'You can pay by cash or card when your laundry is delivered.',
    action: null,
  }
}
