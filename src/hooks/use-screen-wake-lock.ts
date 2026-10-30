'use client'

import { useEffect } from 'react'

export function useScreenWakeLock() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let cancelled = false
    let sentinel: WakeLockSentinel | null = null

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || sentinel) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await next.release()
          return
        }
        sentinel = next
        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null
        })
      } catch {
        sentinel = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    const onGesture = () => {
      void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointerdown', onGesture, { passive: true })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointerdown', onGesture)
      void sentinel?.release()
      sentinel = null
    }
  }, [])
}
