'use client'

import { useEffect, useState } from 'react'
import { Delete, Loader2, X } from 'lucide-react'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { KioskPanel } from '@/components/kiosk/kiosk-panel'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { createClient } from '@/lib/supabase/client'
import {
  canAdvanceWeight,
  formatWeightReadout,
  guestDisplayName,
  parseWeightEntry,
  weightWarning,
  type KioskMachine,
} from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

const keyClass =
  'aspect-square h-auto w-full rounded-xl border border-neutral-200 bg-white text-2xl font-semibold text-neutral-950 shadow-none hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:opacity-40 md:text-3xl'

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
  const guest = guestDisplayName(booking.last_name, booking.first_name, booking.first_name_initial)

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
    <KioskPanel
      title="Weigh in"
      description={`Enter a weight for ${guest}`}
      avoidToast={avoidToast}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-500 md:text-base">Step {step} of 2</p>
          <GuestName
            id="kiosk-weigh-title"
            lastName={booking.last_name}
            firstName={booking.first_name}
            initial={booking.first_name_initial}
            surnameClassName="text-2xl md:text-3xl"
          />
          <ServiceDetail serviceName={booking.service_name} size="sheet" className="mt-2" />
          <StayDates
            collectionDate={booking.collection_date}
            departureDate={booking.departure_date}
            size="sheet"
            className="mt-1"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0 rounded-xl border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-50 md:size-16"
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
        >
          <X className="size-5 md:size-6" />
        </Button>
      </header>
      <div className="max-h-28 shrink-0 overflow-y-auto">
        <GuestNotes notes={booking.additional_details} mode="band" />
      </div>

      {step === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-center',
              warning ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-neutral-50'
            )}
          >
            <p className="text-5xl font-semibold leading-none tabular-nums text-neutral-950 md:text-6xl">
              {formatWeightReadout(entry)}
            </p>
          </div>
          <div className="flex min-h-8 items-center justify-center">
            {warning ? (
              <p role="alert" className="text-center text-base font-medium text-red-700 md:text-lg">
                {warning}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2" aria-label="Weight keypad">
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
                {key === 'back' ? <Delete className="mx-auto size-6 md:size-8" /> : key}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="h-12 min-h-12 shrink-0 rounded-xl bg-neutral-950 text-base font-semibold text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 md:h-16 md:text-lg"
            disabled={!weightReady || busy}
            onClick={() => setStep(2)}
          >
            Next
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 min-h-12 rounded-xl border-neutral-200 bg-white px-4 text-base font-semibold text-neutral-950 hover:bg-neutral-50 md:h-16 md:text-lg"
              onClick={() => {
                setError(null)
                setStep(1)
              }}
              disabled={busy}
            >
              Back
            </Button>
            <p className="text-2xl font-semibold tabular-nums text-neutral-950 md:text-3xl">
              {formatWeightReadout(entry)}
            </p>
          </div>
          {washers.length === 0 ? (
            <p className="text-base font-medium text-neutral-700 md:text-lg">No washers are set up.</p>
          ) : (
            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-4 content-start gap-2 overflow-y-auto md:grid-cols-6">
              {washers.map((washer) => {
                const taken = inUse.get(washer.number)
                const selected = machineNumber === washer.number
                return (
                  <Toggle
                    key={washer.id}
                    variant="outline"
                    pressed={selected}
                    disabled={busy || taken != null}
                    aria-label={
                      taken
                        ? `Washer ${washer.number}, in use by ${taken}`
                        : `Washer ${washer.number}`
                    }
                    className={cn(
                      'aspect-square h-auto w-full flex-col gap-1 whitespace-normal rounded-xl border-neutral-200 bg-white p-1 text-neutral-950 hover:bg-neutral-50',
                      'data-[state=on]:border-neutral-950 data-[state=on]:bg-neutral-950 data-[state=on]:text-white',
                      'disabled:opacity-100',
                      taken && 'border-neutral-200 bg-neutral-100 text-neutral-400'
                    )}
                    onPressedChange={() => {
                      setMachineNumber(washer.number)
                      setError(null)
                    }}
                  >
                    <span className="text-xl font-semibold leading-none tabular-nums md:text-2xl">
                      {washer.number}
                    </span>
                    {taken ? (
                      <span className="line-clamp-2 text-center text-xs font-medium leading-tight">
                        {taken}
                      </span>
                    ) : null}
                  </Toggle>
                )
              })}
            </div>
          )}
          {washers.length > 0 && washers.every((washer) => inUse.has(washer.number)) ? (
            <p className="text-center text-base font-medium text-neutral-600 md:text-lg">
              Every washer is in use.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-center text-base font-medium text-red-700 md:text-lg">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="h-12 min-h-12 shrink-0 rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:bg-neutral-200 disabled:text-neutral-500 md:h-16 md:text-lg"
            disabled={busy || machineNumber == null || !weightReady}
            onClick={() => void start()}
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Starting
              </>
            ) : (
              'Start'
            )}
          </Button>
        </div>
      )}
    </KioskPanel>
  )
}
