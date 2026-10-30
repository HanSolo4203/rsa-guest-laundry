'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { markDelivered, markOutForDelivery } from '@/lib/supabase/services'
import type { Booking } from '@/lib/types/database'

export type DeliveryPatch = {
  id: string
  out_for_delivery_at?: string
  delivered_at?: string
  status?: Booking['status']
}

export function DeliveryActions({
  booking,
  tone = 'dark',
  onChanged,
}: {
  booking: Pick<Booking, 'id' | 'stage' | 'status' | 'out_for_delivery_at' | 'delivered_at'>
  tone?: 'dark' | 'light'
  onChanged?: (patch: DeliveryPatch) => void
}) {
  const [busy, setBusy] = useState<'out' | 'delivered' | null>(null)
  const visible =
    booking.stage === 'ready' &&
    booking.status !== 'cancelled' &&
    booking.status !== 'completed' &&
    booking.status !== 'delivered' &&
    !booking.delivered_at

  if (!visible) return null

  const sent = Boolean(booking.out_for_delivery_at)
  const outline =
    tone === 'light'
      ? 'border-[#6B2F2F] bg-white text-[#6B2F2F] hover:bg-[#6B2F2F]/10'
      : 'border-sky-700 bg-transparent text-sky-100 hover:bg-sky-950'
  const filled =
    tone === 'light'
      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
      : 'bg-emerald-700 text-white hover:bg-emerald-600'

  async function run(action: 'out' | 'delivered') {
    setBusy(action)
    try {
      if (action === 'out') {
        await markOutForDelivery(booking.id)
        onChanged?.({ id: booking.id, out_for_delivery_at: new Date().toISOString() })
        toast.success('Marked out for delivery')
      } else {
        await markDelivered(booking.id)
        onChanged?.({
          id: booking.id,
          delivered_at: new Date().toISOString(),
          status: 'delivered',
        })
        toast.success('Marked delivered')
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Could not update delivery')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`flex flex-wrap gap-1 ${tone === 'light' ? 'mt-3' : 'justify-end'}`}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy != null || sent}
        onClick={() => {
          void run('out')
        }}
        className={`text-xs ${outline}`}
      >
        {busy === 'out' ? 'Saving…' : 'Out for delivery'}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={busy != null || !sent}
        onClick={() => {
          void run('delivered')
        }}
        className={`text-xs ${filled}`}
      >
        {busy === 'delivered' ? 'Saving…' : 'Delivered'}
      </Button>
    </div>
  )
}
