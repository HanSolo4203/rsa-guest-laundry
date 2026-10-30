'use client'

import { useEffect, useRef } from 'react'

const IDLE_MS = 10 * 60 * 1000

export function useIdleLock(enabled: boolean, onLock: () => void) {
  const onLockRef = useRef(onLock)
  onLockRef.current = onLock

  useEffect(() => {
    if (!enabled) return

    let lastActivity = Date.now()
    let timer = 0

    const arm = () => {
      window.clearTimeout(timer)
      const remaining = IDLE_MS - (Date.now() - lastActivity)
      if (remaining <= 0) {
        onLockRef.current()
        return
      }
      timer = window.setTimeout(() => onLockRef.current(), remaining)
    }

    const bump = () => {
      lastActivity = Date.now()
      arm()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') arm()
    }

    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const event of events) {
      window.addEventListener(event, bump, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    arm()

    return () => {
      window.clearTimeout(timer)
      for (const event of events) {
        window.removeEventListener(event, bump)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
