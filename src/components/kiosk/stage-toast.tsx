'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

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
      className="fixed inset-x-0 bottom-0 z-[80] flex items-center gap-4 border-t-4 border-neutral-950 bg-neutral-950 px-6 py-4 text-white"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-4xl font-bold">{message}</p>
        {error ? (
          <p role="alert" className="mt-1 text-2xl font-semibold text-red-200">
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="flex h-24 min-w-56 shrink-0 items-center justify-center gap-3 rounded-2xl bg-white px-8 text-4xl font-bold tracking-wide text-neutral-950 disabled:opacity-60"
        onClick={() => void undo()}
        disabled={busy}
      >
        {busy ? <Loader2 className="size-10 animate-spin" /> : null}
        UNDO
      </button>
    </div>
  )
}
