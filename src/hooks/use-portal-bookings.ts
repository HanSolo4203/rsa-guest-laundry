'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { playKioskChime } from '@/lib/kiosk/chime'
import {
  HISTORY_MS,
  deliveryAnnouncement,
  isBookingStage,
  isPortalStatus,
  parsePortalBooking,
  portalTitle,
  readyAnnouncement,
} from '@/lib/portal/board'
import { createClient } from '@/lib/supabase/client'
import type { PortalBooking } from '@/lib/types/database'

const PROPERTY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RealtimeBooking = {
  id?: string
  property_id?: string
  stage?: string
  status?: string
  ready_at?: string | null
  out_for_delivery_at?: string | null
  delivered_at?: string | null
  received_at?: string | null
  room_number?: string | null
  last_name?: string | null
  completed_at?: string | null
}

function becameReady(
  previous: RealtimeBooking,
  next: RealtimeBooking,
  seenReadyAt: Map<string, string | null>
): boolean {
  if (next.stage !== 'ready' || !next.id) return false
  if (next.status === 'completed' || next.status === 'cancelled') return false
  if (previous.stage === 'ready') {
    const prior = previous.ready_at ?? seenReadyAt.get(next.id)
    return prior !== (next.ready_at ?? null)
  }
  if (typeof previous.stage === 'string') return true
  return seenReadyAt.get(next.id) !== (next.ready_at ?? null)
}

function rememberReady(next: RealtimeBooking, seenReadyAt: Map<string, string | null>) {
  if (!next.id) return
  if (next.stage === 'ready') seenReadyAt.set(next.id, next.ready_at ?? null)
  else seenReadyAt.delete(next.id)
}

function becameOutForDelivery(
  previous: RealtimeBooking,
  next: RealtimeBooking,
  seenOutAt: Map<string, string | null>
): boolean {
  if (typeof next.out_for_delivery_at !== 'string' || !next.id) return false
  if (next.status === 'completed' || next.status === 'cancelled') return false
  if (typeof previous.out_for_delivery_at === 'string') {
    const prior = previous.out_for_delivery_at
    return prior !== next.out_for_delivery_at
  }
  if (previous.out_for_delivery_at === null) return true
  if (typeof previous.stage === 'string' || typeof previous.status === 'string') return true
  return seenOutAt.get(next.id) !== next.out_for_delivery_at
}

function rememberOutForDelivery(next: RealtimeBooking, seenOutAt: Map<string, string | null>) {
  if (!next.id) return
  if (typeof next.out_for_delivery_at === 'string') seenOutAt.set(next.id, next.out_for_delivery_at)
  else seenOutAt.delete(next.id)
}

function patchBooking(current: PortalBooking[], next: RealtimeBooking): PortalBooking[] {
  if (!next.id || !isBookingStage(next.stage)) return current
  const stage = next.stage
  const id = next.id
  return current.map((booking) => {
    if (booking.id !== id) return booking
    return {
      ...booking,
      stage,
      status: isPortalStatus(next.status) ? next.status : booking.status,
      ready_at: next.ready_at === undefined ? booking.ready_at : next.ready_at,
      out_for_delivery_at:
        next.out_for_delivery_at === undefined ? booking.out_for_delivery_at : next.out_for_delivery_at,
      delivered_at: next.delivered_at === undefined ? booking.delivered_at : next.delivered_at,
      received_at: next.received_at === undefined ? booking.received_at : next.received_at,
      completed_at: next.completed_at === undefined ? booking.completed_at : next.completed_at,
      room_number:
        next.room_number === undefined ? booking.room_number : next.room_number?.trim() || null,
      last_name: typeof next.last_name === 'string' ? next.last_name.trim() : booking.last_name,
    }
  })
}

async function fetchBookings(propertyId: string): Promise<PortalBooking[]> {
  const supabase = createClient('portal')
  const since = new Date(Date.now() - HISTORY_MS).toISOString()
  const [openResult, completedResult, receivedResult] = await Promise.all([
    supabase
      .from('portal_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .is('received_at', null),
    supabase
      .from('portal_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'completed')
      .gte('completed_at', since),
    supabase
      .from('portal_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .not('received_at', 'is', null)
      .gte('received_at', since),
  ])

  if (openResult.error) throw new Error(openResult.error.message)
  if (completedResult.error) throw new Error(completedResult.error.message)
  if (receivedResult.error) throw new Error(receivedResult.error.message)

  const merged = new Map<string, PortalBooking>()
  for (const row of [...(openResult.data ?? []), ...(completedResult.data ?? []), ...(receivedResult.data ?? [])]) {
    const booking = parsePortalBooking(row)
    if (booking) merged.set(booking.id, booking)
  }
  return [...merged.values()]
}

export function usePortalBookings(propertyId: string | null, watchingReady: boolean) {
  const [snapshot, setSnapshot] = useState<{ propertyId: string | null; bookings: PortalBooking[] }>({
    propertyId: null,
    bookings: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [unreadFor, setUnreadFor] = useState(propertyId)
  const [attempt, setAttempt] = useState(0)
  const watchingRef = useRef(watchingReady)
  const loadedFor = useRef(snapshot.propertyId)
  watchingRef.current = watchingReady
  loadedFor.current = snapshot.propertyId

  if (unreadFor !== propertyId) {
    setUnreadFor(propertyId)
    setUnread(0)
    setError(null)
  }

  const bookings = snapshot.propertyId === propertyId ? snapshot.bookings : []
  const loading = propertyId != null && snapshot.propertyId !== propertyId && error == null

  useEffect(() => {
    document.title = portalTitle(unread)
  }, [unread])

  useEffect(() => {
    return () => {
      document.title = 'Laundry Service Admin'
    }
  }, [])

  useEffect(() => {
    if (watchingReady) setUnread(0)
  }, [watchingReady])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && watchingRef.current) setUnread(0)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!propertyId || !PROPERTY_UUID.test(propertyId)) return

    let cancelled = false
    const seenReadyAt = new Map<string, string | null>()
    const seenOutAt = new Map<string, string | null>()
    const queued: RealtimePostgresChangesPayload<RealtimeBooking>[] = []
    let seeded = false
    let reloadTimer: number | undefined

    const load = async () => {
      try {
        const rows = await fetchBookings(propertyId)
        if (cancelled) return
        setSnapshot({ propertyId, bookings: rows })
        setError(null)
      } catch (loadError) {
        console.error(loadError)
        if (cancelled) return
        if (loadedFor.current === propertyId) return
        setError('Could not load laundry')
        toast.error('Could not load laundry')
        setSnapshot({ propertyId, bookings: [] })
      }
    }

    const scheduleReload = () => {
      window.clearTimeout(reloadTimer)
      reloadTimer = window.setTimeout(() => {
        void load()
      }, 200)
    }

    const notifyReady = (next: RealtimeBooking) => {
      toast(readyAnnouncement(next.room_number, next.last_name), {
        id: `portal-ready-${next.id}-${next.ready_at ?? 'now'}`,
      })
      playKioskChime()
      if (watchingRef.current && document.visibilityState === 'visible') return
      setUnread((count) => count + 1)
    }

    const notifyOutForDelivery = (next: RealtimeBooking) => {
      toast(deliveryAnnouncement(next.room_number, next.last_name), {
        id: `portal-out-${next.id}-${next.out_for_delivery_at ?? 'now'}`,
      })
      playKioskChime()
      if (watchingRef.current && document.visibilityState === 'visible') return
      setUnread((count) => count + 1)
    }

    const handleChange = (payload: RealtimePostgresChangesPayload<RealtimeBooking>) => {
      if (cancelled) return
      if (!seeded) {
        queued.push(payload)
        return
      }

      const record = payload.eventType === 'DELETE' ? payload.old : payload.new
      if (record.property_id && record.property_id !== propertyId) return

      if (payload.eventType === 'DELETE') {
        if (payload.old.id) {
          const removedId = payload.old.id
          setSnapshot((current) => {
            if (current.propertyId !== propertyId) return current
            return {
              propertyId,
              bookings: current.bookings.filter((booking) => booking.id !== removedId),
            }
          })
        }
        scheduleReload()
        return
      }

      const previous = payload.eventType === 'UPDATE' ? payload.old : {}
      if (becameReady(previous, payload.new, seenReadyAt)) notifyReady(payload.new)
      rememberReady(payload.new, seenReadyAt)
      if (becameOutForDelivery(previous, payload.new, seenOutAt)) notifyOutForDelivery(payload.new)
      rememberOutForDelivery(payload.new, seenOutAt)

      if (payload.eventType === 'UPDATE' && payload.new.id) {
        const nextRow = payload.new
        setSnapshot((current) => {
          if (current.propertyId !== propertyId) return current
          if (!current.bookings.some((booking) => booking.id === nextRow.id)) return current
          return { propertyId, bookings: patchBooking(current.bookings, nextRow) }
        })
      }
      scheduleReload()
    }

    const supabase = createClient('portal')
    const channel = supabase
      .channel(`portal-bookings-${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `property_id=eq.${propertyId}`,
        },
        handleChange
      )
      .subscribe()

    const seed = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_bookings')
          .select('id, ready_at, stage, out_for_delivery_at')
          .eq('property_id', propertyId)
          .eq('stage', 'ready')
        if (cancelled) return
        if (error) {
          console.error(error)
        } else {
          const queuedIds = new Set(
            queued.flatMap((payload) => {
              if (payload.eventType === 'DELETE') return []
              return payload.new.id ? [payload.new.id] : []
            })
          )
          for (const row of data ?? []) {
            if (!row || typeof row !== 'object') continue
            const record = row as { id?: unknown; ready_at?: unknown; out_for_delivery_at?: unknown }
            if (typeof record.id !== 'string' || queuedIds.has(record.id)) continue
            seenReadyAt.set(record.id, typeof record.ready_at === 'string' ? record.ready_at : null)
            if (typeof record.out_for_delivery_at === 'string') {
              seenOutAt.set(record.id, record.out_for_delivery_at)
            }
          }
        }
      } catch (seedError) {
        console.error(seedError)
      } finally {
        if (cancelled) return
        seeded = true
        const pending = queued.splice(0)
        for (const payload of pending) handleChange(payload)
      }
    }

    void load()
    void seed()

    return () => {
      cancelled = true
      window.clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [propertyId, attempt])

  return {
    bookings,
    loading,
    error,
    unread,
    retry: () => {
      setError(null)
      setSnapshot({ propertyId: null, bookings: [] })
      setAttempt((value) => value + 1)
    },
  }
}
