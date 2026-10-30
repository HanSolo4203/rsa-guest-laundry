'use client'

import { useEffect, useRef, useState } from 'react'
import { Delete, Loader2 } from 'lucide-react'
import { KioskWordmark } from '@/components/kiosk/kiosk-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import type { KioskStaff } from '@/contexts/kiosk-staff-context'
import { unlockKioskChime } from '@/lib/kiosk/chime'
import { createClient } from '@/lib/supabase/client'

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

const keyClass =
  'aspect-square h-auto w-full rounded-xl border-neutral-200 bg-white text-2xl font-semibold text-neutral-950 shadow-none hover:bg-neutral-50 active:bg-neutral-100'

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

  const applyPin = (value: string) => {
    if (submittingRef.current) return
    const next = value.replace(/\D/g, '').slice(0, 4)
    pinRef.current = next
    setPin(next)
    setError(null)
    if (next.length === 4) {
      submittingRef.current = true
      void submit(next)
    }
  }

  const press = (digit: string) => {
    unlockKioskChime()
    if (submittingRef.current || pinRef.current.length >= 4) return
    applyPin(`${pinRef.current}${digit}`)
  }

  const pressRef = useRef(press)
  const clearRef = useRef(clear)
  pressRef.current = press
  clearRef.current = clear

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const fromOtp = event.target instanceof HTMLInputElement
      if (/^[0-9]$/.test(event.key)) {
        if (fromOtp) return
        event.preventDefault()
        pressRef.current(event.key)
        return
      }
      if (event.key === 'Backspace') {
        if (fromOtp) return
        event.preventDefault()
        clearRef.current()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        clearRef.current()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Card className="w-full max-w-sm gap-4 border-neutral-200 bg-white py-6 text-neutral-950 shadow-sm">
      <CardHeader className="gap-2 px-5 text-center">
        <KioskWordmark className="text-center" />
        <CardTitle className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
          Enter your PIN
        </CardTitle>
        <CardDescription className="text-base text-neutral-500 md:text-lg">
          Use the keypad to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <InputOTP
          maxLength={4}
          value={pin}
          inputMode="none"
          autoFocus
          disabled={busy}
          onChange={(value) => {
            unlockKioskChime()
            applyPin(value)
          }}
          containerClassName="justify-center"
          aria-label="4 digit PIN"
        >
          <InputOTPGroup className="gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-12 rounded-lg border border-neutral-200 text-xl text-neutral-950 first:rounded-lg first:border-l last:rounded-lg md:size-14"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p className="sr-only" role="status" aria-live="polite">
          {pin.length} of 4 digits entered
        </p>

        <div className="flex min-h-12 items-center justify-center">
          {error ? (
            <p role="alert" className="text-center text-base font-medium text-red-700 md:text-lg">
              {error}
            </p>
          ) : busy ? (
            <p className="flex items-center gap-2 text-base text-neutral-600 md:text-lg">
              <Loader2 className="size-5 animate-spin" />
              Checking PIN
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2" aria-label="Number pad">
          {digits.map((digit) => (
            <Button
              key={digit}
              type="button"
              variant="outline"
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
            variant="outline"
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
            className="col-span-3 h-12 min-h-12 rounded-xl border-neutral-200 bg-white text-base font-semibold text-neutral-950 shadow-none hover:bg-neutral-50 md:h-16"
            onClick={clear}
          >
            <Delete className="size-5" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
