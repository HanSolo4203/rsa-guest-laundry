'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PaymentStatusBadge } from '@/components/payments/payment-status-badge'
import { createClient } from '@/lib/supabase/client'
import { formatCents, isPrepaidNoChange, topupDueCents } from '@/lib/payments/money'
import { isYocoRedirect } from '@/lib/payments/redirect'
import type { BookingWithService, Payment } from '@/lib/types/database'

const STATUS_LABEL: Record<Payment['status'], string> = {
  pending: 'Pending',
  succeeded: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export function BookingPaymentPanel({ booking }: { booking: BookingWithService }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [link, setLink] = useState('')
  const difference = topupDueCents(booking.total_price, booking.prepaid_amount_cents)
  const noChange = isPrepaidNoChange(booking)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    void supabase
      .from('payments')
      .select('id, booking_id, kind, amount_cents, currency, status, yoco_checkout_id, yoco_payment_id, prepaid_tier_max_kg, created_at, paid_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Payment history failed', error)
          setPayments([])
        } else {
          setPayments((data ?? []) as Payment[])
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [booking.id])

  async function sendTopupLink() {
    setSending(true)
    try {
      const response = await fetch(`/api/bookings/${booking.id}/topup`, { method: 'POST' })
      const body = (await response.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null
      if (!response.ok || !body?.redirectUrl || !isYocoRedirect(body.redirectUrl)) {
        toast.error(body?.error || 'Could not create a top-up link')
        return
      }
      setLink(body.redirectUrl)
      try {
        await navigator.clipboard.writeText(body.redirectUrl)
        toast.success('Top-up link copied')
      } catch {
        toast.success('Top-up link ready to copy')
      }
    } catch {
      toast.error('Could not create a top-up link')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-lg text-white">Payment</h3>
        <PaymentStatusBadge status={booking.payment_status} />
      </div>
      {noChange ? <p className="text-base font-semibold text-green-300">Prepaid – no change</p> : null}
      {booking.prepaid_amount_cents != null ? (
        <p className="text-sm text-gray-300">
          Prepaid {formatCents(booking.prepaid_amount_cents)}
          {booking.prepaid_tier_max_kg != null ? ` · up to ${Number(booking.prepaid_tier_max_kg)} kg` : ''}
        </p>
      ) : null}
      {booking.payment_status === 'topup_due' ? (
        <div className="space-y-3">
          <p className="text-sm text-red-200">
            {difference != null
              ? `Difference ${formatCents(difference)}.`
              : 'The difference is below the minimum online payment.'}
          </p>
          {difference != null ? (
            <button
              type="button"
              onClick={() => void sendTopupLink()}
              disabled={sending}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? 'Creating link…' : 'Send top-up link'}
            </button>
          ) : null}
          {link ? (
            <label className="block space-y-1 text-sm text-gray-300">
              Top-up link
              <input readOnly value={link} className="w-full rounded-lg bg-gray-900 px-3 py-2 text-white" />
            </label>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-300">Payment history</p>
        {loading ? <p className="text-sm text-gray-400">Loading payments…</p> : null}
        {!loading && payments.length === 0 ? <p className="text-sm text-gray-400">No online payments</p> : null}
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-900/60 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-white">{payment.kind === 'topup' ? 'Top-up' : 'Booking'}</p>
              <p className="text-gray-400">{new Date(payment.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">{formatCents(payment.amount_cents)}</p>
              <p className="text-gray-400">{STATUS_LABEL[payment.status] ?? payment.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
