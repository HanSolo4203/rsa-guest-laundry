'use client'

import { useEffect, useState } from 'react'
import { Delete, Loader2, X } from 'lucide-react'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { createClient } from '@/lib/supabase/client'
import {
  canAdvanceWeight,
  formatWeightReadout,
  parseWeightEntry,
  weightWarning,
  type KioskMachine,
} from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

const keyClass =
  'h-full min-h-16 rounded-2xl border-2 border-neutral-950 bg-white text-5xl font-semibold text-neutral-950 active:bg-neutral-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neutral-950'

function appendKey(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }
  if (current === '0') return key
  const [whole, fraction] = current.split('.')
  if (current.includes('.')) {
    if ((fraction ?? '').length >= 1) return current
    return `${current}${key}`
  }
  if (whole.length >= 3) return current
  return `${current}${key}`
}

function staffMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('price') || lower.includes('pricing') || lower.includes('tier')) {
    return 'No price tier – split the bag?'
  }
  if (lower.includes('washer')) return 'That washer is not available. Pick another.'
  if (lower.includes('staff')) return 'Sign in again, then start the wash.'
  if (
    lower.includes('cancelled') ||
    lower.includes('completed') ||
    lower.includes('cannot be weighed')
  ) {
    return 'This booking can no longer be started.'
  }
  if (lower.includes('not found')) return 'This booking is no longer on the board.'
  return 'The wash could not be started. Try again.'
}

type WeighInSheetProps = {
  booking: KioskBooking
  staffId: string
  washers: KioskMachine[]
  inUse: Map<number, string>
  onClose: () => void
  onStarted: () => void
  avoidToast?: boolean
}

export function WeighInSheet({
  booking,
  staffId,
  washers,
  inUse,
  onClose,
  onStarted,
  avoidToast = false,
}: WeighInSheetProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [entry, setEntry] = useState('')
  const [machineNumber, setMachineNumber] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const warning = weightWarning(entry)
  const weight = parseWeightEntry(entry)
  const weightReady = canAdvanceWeight(entry)
  const selectedBusy = machineNumber != null && inUse.has(machineNumber)

  useEffect(() => {
    if (selectedBusy) setMachineNumber(null)
  }, [selectedBusy])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (busy) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (step === 1 && /^[0-9.]$/.test(event.key)) {
        event.preventDefault()
        setEntry((current) => appendKey(current, event.key))
        setError(null)
        return
      }
      if (step === 1 && event.key === 'Backspace') {
        event.preventDefault()
        setEntry((current) => appendKey(current, 'back'))
        setError(null)
        return
      }
      if (event.key === 'Enter' && step === 1 && weightReady) {
        event.preventDefault()
        setStep(2)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose, step, weightReady])

  const start = async () => {
    if (busy || weight == null || !weightReady || machineNumber == null) return
    if (inUse.has(machineNumber)) {
      setMachineNumber(null)
      setError('That washer is already in use.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc('kiosk_weigh_and_start', {
        booking_id: booking.id,
        weight_kg: weight,
        machine_number: machineNumber,
        staff_id: staffId,
      })
      if (rpcError) {
        setError(staffMessage(rpcError.message))
        setBusy(false)
        return
      }
      onStarted()
    } catch {
      setError('The wash could not be started. Try again.')
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-weigh-title"
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-white text-neutral-950',
        avoidToast && 'pb-40'
      )}
    >
      <div className="max-h-[46%] shrink-0 overflow-y-auto">
      <header className="flex items-start justify-between gap-4 border-b-2 border-neutral-950 px-6 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold">Step {step} of 2</p>
          <div className="mt-2 flex flex-wrap items-start gap-x-10 gap-y-4">
            <GuestName
              id="kiosk-weigh-title"
              lastName={booking.last_name}
              firstName={booking.first_name}
              initial={booking.first_name_initial}
              surnameClassName="text-5xl"
              givenClassName="text-4xl text-neutral-800"
            />
            <div className="min-w-72 flex-1">
              <ServiceDetail serviceName={booking.service_name} size="sheet" />
              <StayDates
                collectionDate={booking.collection_date}
                departureDate={booking.departure_date}
                size="sheet"
                className="mt-3 text-neutral-800"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-neutral-950 bg-white"
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
        >
          <X className="size-8" />
        </button>
      </header>
      <GuestNotes notes={booking.additional_details} mode="band" />
      </div>

      {step === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
          <div
            className={cn(
              'rounded-3xl border-4 px-4 py-4 text-center',
              warning ? 'border-red-700' : 'border-neutral-950'
            )}
          >
            <p className="text-[clamp(4rem,12vw,7.5rem)] font-bold leading-none tabular-nums">
              {formatWeightReadout(entry)}
            </p>
          </div>
          <div className="flex min-h-14 items-center justify-center">
            {warning ? (
              <p role="alert" className="text-center text-3xl font-bold text-red-800">
                {warning}
              </p>
            ) : null}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-3" aria-label="Weight keypad">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                className={keyClass}
                disabled={busy}
                aria-label={key === 'back' ? 'Delete' : key === '.' ? 'Decimal point' : `Digit ${key}`}
                onClick={() => {
                  setEntry((current) => appendKey(current, key))
                  setError(null)
                }}
              >
                {key === 'back' ? <Delete className="mx-auto size-10" /> : key}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="h-24 shrink-0 rounded-2xl bg-neutral-950 text-4xl font-bold text-white disabled:bg-neutral-300 disabled:text-neutral-600"
            disabled={!weightReady || busy}
            onClick={() => setStep(2)}
          >
            Next
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="h-16 rounded-2xl border-2 border-neutral-950 bg-white px-8 text-2xl font-bold"
              onClick={() => {
                setError(null)
                setStep(1)
              }}
              disabled={busy}
            >
              Back
            </button>
            <p className="text-4xl font-bold tabular-nums">{formatWeightReadout(entry)}</p>
          </div>
          {washers.length === 0 ? (
            <p className="text-3xl font-semibold">No washers are set up.</p>
          ) : (
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-3 overflow-y-auto">
              {washers.map((washer) => {
                const guest = inUse.get(washer.number)
                const selected = machineNumber === washer.number
                return (
                  <button
                    key={washer.id}
                    type="button"
                    disabled={busy || guest != null}
                    aria-pressed={selected}
                    aria-label={
                      guest
                        ? `Washer ${washer.number}, in use by ${guest}`
                        : `Washer ${washer.number}`
                    }
                    className={cn(
                      'flex min-h-32 flex-col items-center justify-center rounded-3xl border-4 px-3 py-4',
                      guest && 'border-neutral-300 bg-neutral-200 text-neutral-500',
                      !guest && !selected && 'border-neutral-950 bg-white text-neutral-950',
                      selected && 'border-neutral-950 bg-neutral-950 text-white'
                    )}
                    onClick={() => {
                      setMachineNumber(washer.number)
                      setError(null)
                    }}
                  >
                    <span className="text-7xl font-bold leading-none tabular-nums">
                      {washer.number}
                    </span>
                    {guest ? (
                      <span className="mt-2 line-clamp-2 text-center text-2xl font-semibold uppercase">
                        {guest}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
          {washers.length > 0 && washers.every((washer) => inUse.has(washer.number)) ? (
            <p className="text-center text-2xl font-semibold">Every washer is in use.</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-center text-3xl font-bold text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="flex h-24 shrink-0 items-center justify-center gap-4 rounded-2xl bg-emerald-700 text-4xl font-bold tracking-wide text-white disabled:bg-neutral-300 disabled:text-neutral-600"
            disabled={busy || machineNumber == null || !weightReady}
            onClick={() => void start()}
          >
            {busy ? (
              <>
                <Loader2 className="size-10 animate-spin" />
                Starting
              </>
            ) : (
              'START'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
