'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type StageToastProps = {
  message: string
  onUndo: () => Promise<string | null>
  onDismiss: () => void
}

export function StageToast({ message, onUndo, onDismiss }: StageToastProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [life, setLife] = useState(0)
  const hold = useRef(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!hold.current) onDismiss()
    }, 6000)
    return () => window.clearTimeout(id)
  }, [life, onDismiss])

  const undo = async () => {
    if (busy) return
    hold.current = true
    setBusy(true)
    setError(null)
    const failure = await onUndo()
    if (failure) {
      hold.current = false
      setBusy(false)
      setError(failure)
      setLife((value) => value + 1)
      return
    }
    onDismiss()
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[80] md:inset-x-auto md:right-4 md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:w-full md:max-w-lg"
    >
      <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium md:text-lg">{message}</p>
          {error ? (
            <p role="alert" className="mt-1 text-sm font-medium text-red-200 md:text-base">
              {error}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          className="h-12 min-h-12 min-w-24 shrink-0 rounded-xl bg-white text-base font-semibold text-neutral-950 hover:bg-neutral-100 md:h-16 md:min-w-28 md:text-lg"
          onClick={() => void undo()}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : null}
          Undo
        </Button>
      </div>
    </div>
  )
}
