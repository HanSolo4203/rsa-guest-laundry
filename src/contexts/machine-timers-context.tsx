'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { playKioskBeep } from '@/lib/kiosk/chime'
import { machineTimerMs, type MachineKind } from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'

const GRACE_MS = 5000

export type MachineTimer = {
  endsAt: number
  bookingId: string
  beeped: boolean
  startedAt: number
}

export function timerKey(kind: MachineKind, number: number): string {
  return `${kind}:${number}`
}

type MachineTimersValue = {
  timers: Record<string, MachineTimer>
  now: number
  start: (kind: MachineKind, number: number, bookingId: string) => void
  clear: (kind: MachineKind, number: number) => void
  clearBooking: (bookingId: string) => void
  prune: (bookings: KioskBooking[]) => void
}

const MachineTimersContext = createContext<MachineTimersValue | null>(null)

function timerStillValid(
  key: string,
  timer: MachineTimer,
  bookings: KioskBooking[],
  now: number
): boolean {
  if (now - timer.startedAt < GRACE_MS) return true
  const [kind, rawNumber] = key.split(':')
  const number = Number(rawNumber)
  const booking = bookings.find((row) => row.id === timer.bookingId)
  if (!booking || booking.status === 'cancelled') return false
  if (kind === 'washer') {
    return booking.stage === 'washing' && booking.machine_number === number
  }
  if (kind === 'dryer') {
    return booking.stage === 'drying' && booking.dryer_number === number
  }
  return false
}

export function MachineTimersProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<Record<string, MachineTimer>>({})
  const [now, setNow] = useState(() => Date.now())
  const beepedRef = useRef(new Set<string>())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const due: string[] = []
    for (const [key, timer] of Object.entries(timers)) {
      if (!timer.beeped && timer.endsAt <= now && !beepedRef.current.has(key)) {
        due.push(key)
      }
    }
    if (due.length === 0) return
    for (const key of due) beepedRef.current.add(key)
    playKioskBeep()
    setTimers((current) => {
      let changed = false
      const next = { ...current }
      for (const key of due) {
        const timer = next[key]
        if (timer && !timer.beeped) {
          next[key] = { ...timer, beeped: true }
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [now, timers])

  const start = useCallback((kind: MachineKind, number: number, bookingId: string) => {
    const key = timerKey(kind, number)
    beepedRef.current.delete(key)
    const startedAt = Date.now()
    setTimers((current) => ({
      ...current,
      [key]: {
        endsAt: startedAt + machineTimerMs(kind),
        bookingId,
        beeped: false,
        startedAt,
      },
    }))
  }, [])

  const clear = useCallback((kind: MachineKind, number: number) => {
    const key = timerKey(kind, number)
    beepedRef.current.delete(key)
    setTimers((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])

  const clearBooking = useCallback((bookingId: string) => {
    setTimers((current) => {
      let changed = false
      const next: Record<string, MachineTimer> = {}
      for (const [key, timer] of Object.entries(current)) {
        if (timer.bookingId === bookingId) {
          changed = true
          beepedRef.current.delete(key)
        } else {
          next[key] = timer
        }
      }
      return changed ? next : current
    })
  }, [])

  const prune = useCallback((bookings: KioskBooking[]) => {
    const tick = Date.now()
    setTimers((current) => {
      let changed = false
      const next: Record<string, MachineTimer> = {}
      for (const [key, timer] of Object.entries(current)) {
        if (timerStillValid(key, timer, bookings, tick)) {
          next[key] = timer
        } else {
          changed = true
          beepedRef.current.delete(key)
        }
      }
      return changed ? next : current
    })
  }, [])

  const value = useMemo(
    () => ({ timers, now, start, clear, clearBooking, prune }),
    [timers, now, start, clear, clearBooking, prune]
  )

  return (
    <MachineTimersContext.Provider value={value}>{children}</MachineTimersContext.Provider>
  )
}

export function useMachineTimers() {
  const context = useContext(MachineTimersContext)
  if (!context) {
    throw new Error('useMachineTimers must be used within a MachineTimersProvider')
  }
  return context
}
