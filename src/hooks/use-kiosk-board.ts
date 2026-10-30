'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playKioskChime, unlockKioskChime } from '@/lib/kiosk/chime'
import {
  toKioskBooking,
  toKioskMachine,
  toWeighIds,
  type KioskMachine,
} from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'

const SAFETY_REFRESH_MS = 30_000

type KioskBoardState = {
  bookings: KioskBooking[]
  machines: KioskMachine[]
  loading: boolean
  error: string | null
  announcement: string
  reload: () => void
}

export function useKioskBoard(enabled: boolean): KioskBoardState {
  const [bookings, setBookings] = useState<KioskBooking[]>([])
  const [machines, setMachines] = useState<KioskMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const seenToWeigh = useRef<Set<string> | null>(null)
  const requestId = useRef(0)
  const reloadTimer = useRef(0)
  const announceTimer = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    const supabase = createClient()

    const [bookingsResult, machinesResult] = await Promise.all([
      supabase.from('kiosk_bookings').select('*'),
      supabase
        .from('machines')
        .select('id, number, type')
        .eq('active', true)
        .order('number'),
    ])

    if (id !== requestId.current) return

    if (bookingsResult.error) {
      setError('The board could not be loaded. Try again.')
      setLoading(false)
      return
    }

    const nextBookings = (bookingsResult.data ?? [])
      .map(toKioskBooking)
      .filter((row): row is KioskBooking => row !== null)

    const arriving = toWeighIds(nextBookings)
    const previous = seenToWeigh.current
    if (previous === null) {
      seenToWeigh.current = new Set(arriving)
    } else {
      const fresh = arriving.filter((bookingId) => !previous.has(bookingId))
      for (const bookingId of arriving) previous.add(bookingId)
      if (fresh.length > 0) {
        playKioskChime()
        const message =
          fresh.length === 1 ? 'New bag to weigh' : `${fresh.length} new bags to weigh`
        window.clearTimeout(announceTimer.current)
        setAnnouncement('')
        announceTimer.current = window.setTimeout(() => setAnnouncement(message), 50)
      }
    }

    setBookings(nextBookings)
    if (machinesResult.error) {
      setError('Machines could not be loaded. Try again.')
    } else {
      setMachines(
        (machinesResult.data ?? [])
          .map(toKioskMachine)
          .filter((row): row is KioskMachine => row !== null)
          .sort((a, b) => a.number - b.number || a.type.localeCompare(b.type))
      )
      setError(null)
    }
    setLoading(false)
  }, [])

  const scheduleReload = useCallback(() => {
    window.clearTimeout(reloadTimer.current)
    reloadTimer.current = window.setTimeout(() => {
      void load()
    }, 120)
  }, [load])

  useEffect(() => {
    if (!enabled) return

    const unlock = () => unlockKioskChime()
    window.addEventListener('pointerdown', unlock)
    void load()

    const supabase = createClient()
    const channel = supabase
      .channel(`kiosk-board-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kiosk_board_signal' },
        () => scheduleReload()
      )
      .subscribe()

    const safety = window.setInterval(() => {
      void load()
    }, SAFETY_REFRESH_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.clearTimeout(reloadTimer.current)
      window.clearTimeout(announceTimer.current)
      window.clearInterval(safety)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [enabled, load, scheduleReload])

  return {
    bookings,
    machines,
    loading,
    error,
    announcement,
    reload: () => {
      void load()
    },
  }
}
