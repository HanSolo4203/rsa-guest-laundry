'use client'

import { useEffect, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { playKioskChime, unlockKioskChime } from '@/lib/kiosk/chime'

type ReadyBookingRow = {
  id?: string
  stage?: string
  ready_at?: string | null
  ready_acknowledged_at?: string | null
  last_name?: string | null
}

function becameReady(
  previous: ReadyBookingRow,
  next: ReadyBookingRow,
  seenReadyAt: Map<string, string | null>
): boolean {
  if (next.stage !== 'ready' || !next.id) return false
  if (next.ready_acknowledged_at != null) return false

  if (previous.stage === 'ready') {
    const priorReadyAt = previous.ready_at ?? seenReadyAt.get(next.id)
    return priorReadyAt !== (next.ready_at ?? null)
  }

  if (typeof previous.stage === 'string') return true
  return seenReadyAt.get(next.id) !== (next.ready_at ?? null)
}

function notifyReady(next: ReadyBookingRow) {
  const lastName = next.last_name?.trim() || 'Guest'
  toast(`🧺 ${lastName} – ready for delivery`, {
    id: `ready-${next.id}-${next.ready_at ?? 'now'}`,
  })
  playKioskChime()
}

export function useReadyDeliveryNotifications(): number {
  const [readyCount, setReadyCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    const seenReadyAt = new Map<string, string | null>()
    const queued: RealtimePostgresChangesPayload<ReadyBookingRow>[] = []
    let seeded = false

    const refreshCount = async () => {
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'ready')
        .is('ready_acknowledged_at', null)

      if (cancelled) return
      if (error) {
        console.error('Error counting ready bookings:', error)
        return
      }
      setReadyCount(count ?? 0)
    }

    const handleChange = (payload: RealtimePostgresChangesPayload<ReadyBookingRow>) => {
      if (!seeded) {
        queued.push(payload)
        return
      }

      if (payload.eventType !== 'UPDATE') return
      const next = payload.new
      const previous = payload.old
      if (!next.id || next.stage !== 'ready') return

      if (becameReady(previous, next, seenReadyAt)) {
        notifyReady(next)
      }
      seenReadyAt.set(next.id, next.ready_at ?? null)
      void refreshCount()
    }

    const unlock = () => unlockKioskChime()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    const channel = supabase
      .channel('dashboard-ready-bookings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: 'stage=eq.ready',
        },
        handleChange
      )
      .subscribe()

    const seed = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, ready_at')
        .eq('stage', 'ready')

      if (cancelled) return
      if (error) {
        console.error('Error loading ready bookings:', error)
      }

      const queuedIds = new Set(
        queued
          .map((payload) => (payload.eventType === 'UPDATE' ? payload.new.id : undefined))
          .filter((id): id is string => Boolean(id))
      )

      for (const row of data ?? []) {
        if (!queuedIds.has(row.id)) {
          seenReadyAt.set(row.id, row.ready_at)
        }
      }

      seeded = true
      const pending = queued.splice(0)
      for (const payload of pending) {
        handleChange(payload)
      }
    }

    void refreshCount()
    void seed()

    return () => {
      cancelled = true
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      supabase.removeChannel(channel)
    }
  }, [])

  return readyCount
}
