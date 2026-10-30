'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { createClient } from '@/lib/supabase/client'
import {
  guestDisplayName,
  MACHINE_TIMER_MINUTES,
  machineForStage,
  nextStage,
  STAGE_STYLES,
  timerReadout,
  type KioskMachine,
} from '@/lib/kiosk/board'
import type { KioskBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export type StageChange = {
  stage: 'drying' | 'finishing' | 'ready'
  dryerNumber: number | null
  startDryerTimer: boolean
}

type StageSheetProps = {
  booking: KioskBooking
  dryers: KioskMachine[]
  dryersInUse: Map<number, string>
  now: number
  timerEndsAt: number | null
  onStartTimer: () => void
  onClose: () => void
  onDone: (change: StageChange) => void
  avoidToast?: boolean
}

function stageFailure(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('in use')) return 'That dryer is already in use.'
  if (lower.includes('dryer')) return 'That dryer is not available. Pick another.'
  if (lower.includes('cancelled')) return 'This booking can no longer be moved.'
  if (lower.includes('not found')) return 'This booking is no longer on the board.'
  if (lower.includes('kiosk role')) return 'This tablet is not signed in as the kiosk.'
  return 'The stage could not be changed. Try again.'
}

export function StageSheet({
  booking,
  dryers,
  dryersInUse,
  now,
  timerEndsAt,
  onStartTimer,
  onClose,
  onDone,
  avoidToast = false,
}: StageSheetProps) {
  const [dryerNumber, setDryerNumber] = useState<number | null>(null)
  const [startDryerTimer, setStartDryerTimer] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const next =
    booking.stage === 'washing' || booking.stage === 'drying' || booking.stage === 'finishing'
      ? nextStage(booking.stage)
      : null
  const guest = guestDisplayName(booking.last_name, booking.first_name, booking.first_name_initial)
  const currentMachine = machineForStage(booking)
  const readout = timerEndsAt != null ? timerReadout(timerEndsAt, now) : null

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (dryerNumber != null && dryersInUse.has(dryerNumber)) {
      setDryerNumber(null)
      setStartDryerTimer(false)
    }
  }, [dryerNumber, dryersInUse])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (busy) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const advance = async () => {
    if (busy || !next) return
    if (next === 'ready' && !confirming) {
      setConfirming(true)
      setError(null)
      return
    }
    if (next === 'drying' && dryerNumber != null && dryersInUse.has(dryerNumber)) {
      setDryerNumber(null)
      setStartDryerTimer(false)
      setError('That dryer is already in use.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc('kiosk_set_stage', {
        booking_id: booking.id,
        stage: next,
        machine_number: next === 'drying' ? dryerNumber : null,
      })
      if (rpcError) {
        if (mounted.current) {
          setError(stageFailure(rpcError.message))
          setBusy(false)
        }
        return
      }
      onDone({
        stage: next,
        dryerNumber: next === 'drying' ? dryerNumber : null,
        startDryerTimer: next === 'drying' && dryerNumber != null && startDryerTimer,
      })
    } catch {
      if (mounted.current) {
        setError('The stage could not be changed. Try again.')
        setBusy(false)
      }
    }
  }

  if (
    booking.stage !== 'washing' &&
    booking.stage !== 'drying' &&
    booking.stage !== 'finishing'
  ) {
    return null
  }
  if (!next) return null

  const currentStyle = STAGE_STYLES[booking.stage]
  const nextStyle = STAGE_STYLES[next]
  const machineNoun = currentMachine?.kind === 'dryer' ? 'Dryer' : 'Washer'
  const minutes = currentMachine ? MACHINE_TIMER_MINUTES[currentMachine.kind] : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={confirming ? 'kiosk-ready-confirm' : 'kiosk-stage-title'}
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-white text-neutral-950',
        avoidToast && 'pb-40'
      )}
    >
      <div className="max-h-[46%] shrink-0 overflow-y-auto">
      <header className="flex items-start justify-between gap-4 border-b-2 border-neutral-950 px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            <GuestName
              id="kiosk-stage-title"
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
          <p
            className={cn(
              'mt-4 inline-flex rounded-full border-4 px-5 py-2 text-3xl font-bold uppercase',
              currentStyle.action
            )}
          >
            {currentStyle.label}
          </p>
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

      {confirming ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 px-6 py-6">
          <h3
            id="kiosk-ready-confirm"
            className="text-center text-[clamp(2.75rem,5vw,4.5rem)] font-bold leading-tight"
          >
            Mark {guest} ready for delivery?
          </h3>
          {error ? (
            <p role="alert" className="text-center text-3xl font-bold text-red-800">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="h-40 rounded-3xl border-4 border-neutral-950 bg-white text-4xl font-bold"
              onClick={() => {
                setError(null)
                setConfirming(false)
              }}
              disabled={busy}
            >
              Not yet
            </button>
            <button
              type="button"
              className="flex h-40 items-center justify-center gap-4 rounded-3xl border-4 border-neutral-950 bg-emerald-600 text-4xl font-bold text-white disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-neutral-600"
              onClick={() => void advance()}
              disabled={busy}
            >
              {busy ? <Loader2 className="size-10 animate-spin" /> : null}
              Mark ready
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              'flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4',
              next === 'drying' || currentMachine ? 'flex-1' : 'shrink-0'
            )}
          >
          {currentMachine && minutes != null ? (
            <div className="shrink-0 rounded-3xl border-4 border-neutral-950 px-5 py-4">
              <p className="text-2xl font-semibold">
                {machineNoun} {currentMachine.number}
              </p>
              {readout && !readout.done ? (
                <p className="mt-1 text-7xl font-bold tabular-nums leading-none">{readout.text}</p>
              ) : (
                <>
                  {readout?.done ? (
                    <p className="mt-2 text-5xl font-bold">Time&apos;s up</p>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 h-20 w-full rounded-2xl bg-neutral-950 text-3xl font-bold text-white"
                    onClick={onStartTimer}
                    disabled={busy}
                  >
                    Start {minutes} min timer
                  </button>
                </>
              )}
            </div>
          ) : null}

          {next === 'drying' ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="shrink-0">
                <p className="text-3xl font-bold">Dryer</p>
                <p className="text-2xl font-semibold text-neutral-700">
                  Optional. Leave them all unselected to skip.
                </p>
              </div>
              {dryers.length === 0 ? (
                <p className="text-3xl font-semibold">No dryers are set up.</p>
              ) : (
                <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 content-start gap-3">
                  {dryers.map((dryer) => {
                    const guest = dryersInUse.get(dryer.number)
                    const selected = dryerNumber === dryer.number
                    return (
                      <button
                        key={dryer.id}
                        type="button"
                        disabled={busy || guest != null}
                        aria-pressed={selected}
                        aria-label={
                          guest
                            ? `Dryer ${dryer.number}, in use by ${guest}`
                            : `Dryer ${dryer.number}`
                        }
                        className={cn(
                          'flex min-h-32 flex-col items-center justify-center rounded-3xl border-4 px-3 py-4',
                          guest && 'border-neutral-300 bg-neutral-200 text-neutral-500',
                          !guest && !selected && 'border-neutral-950 bg-white text-neutral-950',
                          selected && 'border-neutral-950 bg-neutral-950 text-white'
                        )}
                        onClick={() => {
                          const turningOff = dryerNumber === dryer.number
                          setDryerNumber(turningOff ? null : dryer.number)
                          if (turningOff) setStartDryerTimer(false)
                          setError(null)
                        }}
                      >
                        <span className="text-7xl font-bold leading-none tabular-nums">
                          {dryer.number}
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
              {dryers.length > 0 && dryers.every((dryer) => dryersInUse.has(dryer.number)) ? (
                <p className="text-center text-2xl font-semibold">
                  Every dryer is in use. You can still move this bag on.
                </p>
              ) : null}
            </div>
          ) : null}
          </div>

          <div
            className={cn(
              'space-y-3 border-t-2 border-neutral-950 px-6 py-4',
              next === 'drying' ? 'shrink-0' : 'flex min-h-0 flex-1 flex-col'
            )}
          >
          {next === 'drying' ? (
            <button
              type="button"
              aria-pressed={startDryerTimer}
              disabled={busy || dryerNumber == null}
              className={cn(
                'h-16 w-full rounded-2xl border-4 text-2xl font-bold disabled:opacity-40',
                startDryerTimer
                  ? 'border-orange-800 bg-orange-600 text-white'
                  : 'border-neutral-950 bg-white text-neutral-950'
              )}
              onClick={() => setStartDryerTimer((current) => !current)}
            >
              {startDryerTimer
                ? `${MACHINE_TIMER_MINUTES.dryer} min timer on`
                : `Start ${MACHINE_TIMER_MINUTES.dryer} min timer`}
            </button>
          ) : null}

          {error ? (
            <p role="alert" className="text-center text-3xl font-bold text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className={cn(
              'flex w-full shrink-0 flex-col items-center justify-center rounded-3xl border-4 px-6 font-bold uppercase tracking-wide disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-neutral-600',
              next === 'drying' ? 'h-36' : 'min-h-64 flex-1',
              nextStyle.action
            )}
            onClick={() => void advance()}
            disabled={busy}
          >
            {busy ? (
              <span className="flex items-center gap-4 text-5xl">
                <Loader2 className="size-12 animate-spin" />
                Saving
              </span>
            ) : (
              <>
                <span className="text-[clamp(4rem,9vw,6.5rem)] leading-none">{nextStyle.label}</span>
                {next === 'drying' ? (
                  <span className="mt-2 text-3xl font-semibold normal-case tracking-normal">
                    {dryerNumber != null ? `Dryer ${dryerNumber}` : 'No dryer'}
                  </span>
                ) : null}
              </>
            )}
          </button>
          </div>
        </div>
      )}
    </div>
  )
}
