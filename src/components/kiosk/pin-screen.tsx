'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { KioskStaff } from '@/contexts/kiosk-staff-context'
import { unlockKioskChime } from '@/lib/kiosk/chime'
import { cn } from '@/lib/utils'

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

const keyClass =
  'h-20 min-h-16 w-full rounded-2xl border-2 border-neutral-950 bg-white text-4xl font-semibold text-neutral-950 shadow-none hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-950'

type PinScreenProps = {
  onUnlock: (staff: KioskStaff) => void
}

export function PinScreen({ onUnlock }: PinScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pinRef = useRef('')
  const submittingRef = useRef(false)

  const clear = () => {
    if (submittingRef.current) return
    pinRef.current = ''
    setPin('')
    setError(null)
  }

  const submit = async (code: string) => {
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('verify_staff_pin', {
        pin: code,
      })

      if (rpcError) {
        pinRef.current = ''
        setPin('')
        setError('The PIN could not be checked. Try again.')
        return
      }

      const match = Array.isArray(data)
        ? (data[0] as { id?: string; name?: string } | undefined)
        : undefined

      if (!match?.id || !match.name) {
        pinRef.current = ''
        setPin('')
        setError('That PIN is not recognized.')
        return
      }

      onUnlock({ id: match.id, name: match.name })
    } catch {
      pinRef.current = ''
      setPin('')
      setError('The PIN could not be checked. Try again.')
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  const press = (digit: string) => {
    unlockKioskChime()
    if (submittingRef.current || pinRef.current.length >= 4) return
    const next = `${pinRef.current}${digit}`
    pinRef.current = next
    setPin(next)
    setError(null)
    if (next.length === 4) {
      submittingRef.current = true
      void submit(next)
    }
  }

  const pressRef = useRef(press)
  const clearRef = useRef(clear)
  pressRef.current = press
  clearRef.current = clear

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        pressRef.current(event.key)
        return
      }
      if (event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault()
        clearRef.current()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-950">
          Enter your PIN
        </h1>
        <p className="mt-3 text-[22px] text-neutral-800">
          Use the keypad to sign in.
        </p>
      </div>

      <div
        className="flex items-center justify-center gap-6"
        aria-hidden="true"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-7 w-7 rounded-full border-2 border-neutral-950',
              index < pin.length ? 'bg-neutral-950' : 'bg-white'
            )}
          />
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {pin.length} of 4 digits entered
      </p>

      <div className="flex min-h-12 items-center justify-center">
        {error ? (
          <p role="alert" className="text-center text-[22px] font-medium text-red-800">
            {error}
          </p>
        ) : busy ? (
          <p className="flex items-center gap-3 text-[22px] text-neutral-800">
            <Loader2 className="size-6 animate-spin" />
            Checking PIN
          </p>
        ) : null}
      </div>

      <div className="grid w-full grid-cols-3 gap-4" aria-label="Number pad">
        {digits.map((digit) => (
          <Button
            key={digit}
            type="button"
            disabled={busy}
            className={keyClass}
            onClick={() => press(digit)}
            aria-label={`Digit ${digit}`}
          >
            {digit}
          </Button>
        ))}
        <span aria-hidden="true" />
        <Button
          type="button"
          disabled={busy}
          className={keyClass}
          onClick={() => press('0')}
          aria-label="Digit 0"
        >
          0
        </Button>
        <span aria-hidden="true" />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="col-span-3 h-20 min-h-16 rounded-2xl border-2 border-neutral-950 bg-white text-[22px] font-semibold text-neutral-950 shadow-none hover:bg-neutral-100"
          onClick={clear}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
