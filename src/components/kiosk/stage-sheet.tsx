'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { GuestName, GuestNotes, ServiceDetail, StayDates } from '@/components/kiosk/guest-facts'
import { KioskPanel } from '@/components/kiosk/kiosk-panel'
import { STAGE_ACCENT, STAGE_ACTION } from '@/components/kiosk/kiosk-ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { createClient } from '@/lib/supabase/client'
import {
  guestDisplayName,
  MACHINE_TIMER_MINUTES,
  machineForStage,
  nextStage,
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

  const currentStyle = STAGE_ACCENT[booking.stage]
  const nextAction = STAGE_ACTION[next]
  const machineNoun = currentMachine?.kind === 'dryer' ? 'Dryer' : 'Washer'
  const minutes = currentMachine ? MACHINE_TIMER_MINUTES[currentMachine.kind] : null

  return (
    <>
      <KioskPanel
        title={currentStyle.label}
        description={`Move ${guest} to ${STAGE_ACCENT[next].label}`}
        avoidToast={avoidToast}
        onOpenChange={(open) => {
          if (!open && !busy) onClose()
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <GuestName
              id="kiosk-stage-title"
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
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-neutral-700 md:text-base">
              <span className={cn('size-2.5 rounded-full', currentStyle.dot)} aria-hidden="true" />
              {currentStyle.label}
            </p>
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

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {currentMachine && minutes != null ? (
              <div className="shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-base font-medium text-neutral-700 md:text-lg">
                  {machineNoun} {currentMachine.number}
                </p>
                {readout && !readout.done ? (
                  <p className="mt-1 text-3xl font-semibold tabular-nums leading-none text-neutral-950 md:text-4xl">
                    {readout.text}
                  </p>
                ) : (
                  <>
                    {readout?.done ? (
                      <p className="mt-2 text-xl font-semibold text-amber-700 md:text-2xl">Time&apos;s up</p>
                    ) : null}
                    <Button
                      type="button"
                      className="mt-3 h-12 min-h-12 w-full rounded-xl bg-neutral-950 text-base font-semibold text-white hover:bg-neutral-800 md:h-16 md:text-lg"
                      onClick={onStartTimer}
                      disabled={busy}
                    >
                      Start {minutes} min timer
                    </Button>
                  </>
                )}
              </div>
            ) : null}

            {next === 'drying' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="shrink-0">
                  <p className="text-base font-semibold text-neutral-950 md:text-lg">Dryer</p>
                  <p className="text-sm text-neutral-500 md:text-base">
                    Optional. Leave them all unselected to skip.
                  </p>
                </div>
                {dryers.length === 0 ? (
                  <p className="text-base font-medium text-neutral-700 md:text-lg">No dryers are set up.</p>
                ) : (
                  <div className="grid auto-rows-min grid-cols-4 content-start gap-2 md:grid-cols-6">
                    {dryers.map((dryer) => {
                      const taken = dryersInUse.get(dryer.number)
                      const selected = dryerNumber === dryer.number
                      return (
                        <Toggle
                          key={dryer.id}
                          variant="outline"
                          pressed={selected}
                          disabled={busy || taken != null}
                          aria-label={
                            taken
                              ? `Dryer ${dryer.number}, in use by ${taken}`
                              : `Dryer ${dryer.number}`
                          }
                          className={cn(
                            'aspect-square h-auto w-full flex-col gap-1 whitespace-normal rounded-xl border-neutral-200 bg-white p-1 text-neutral-950 hover:bg-neutral-50',
                            'data-[state=on]:border-neutral-950 data-[state=on]:bg-neutral-950 data-[state=on]:text-white',
                            'disabled:opacity-100',
                            taken && 'border-neutral-200 bg-neutral-100 text-neutral-400'
                          )}
                          onPressedChange={(on) => {
                            setDryerNumber(on ? dryer.number : null)
                            if (!on) setStartDryerTimer(false)
                            setError(null)
                          }}
                        >
                          <span className="text-xl font-semibold leading-none tabular-nums md:text-2xl">
                            {dryer.number}
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
                {dryers.length > 0 && dryers.every((dryer) => dryersInUse.has(dryer.number)) ? (
                  <p className="text-center text-base font-medium text-neutral-600 md:text-lg">
                    Every dryer is in use. You can still move this bag on.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 space-y-3 border-t border-neutral-200 px-4 py-3">
            {next === 'drying' ? (
              <Toggle
                pressed={startDryerTimer}
                disabled={busy || dryerNumber == null}
                aria-label={
                  startDryerTimer
                    ? `${MACHINE_TIMER_MINUTES.dryer} min timer on`
                    : `Start ${MACHINE_TIMER_MINUTES.dryer} min timer`
                }
                className={cn(
                  'h-12 min-h-12 w-full rounded-xl border border-neutral-200 bg-white text-base font-semibold text-neutral-950 hover:bg-neutral-50 md:h-16 md:text-lg',
                  'data-[state=on]:border-orange-500 data-[state=on]:bg-orange-500 data-[state=on]:text-white',
                  'disabled:opacity-40'
                )}
                onPressedChange={setStartDryerTimer}
              >
                {startDryerTimer
                  ? `${MACHINE_TIMER_MINUTES.dryer} min timer on`
                  : `Start ${MACHINE_TIMER_MINUTES.dryer} min timer`}
              </Toggle>
            ) : null}

            {error && !confirming ? (
              <p role="alert" className="text-center text-base font-medium text-red-700 md:text-lg">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              className={cn(
                'h-16 min-h-16 w-full flex-col rounded-xl text-2xl font-semibold md:h-24 md:text-3xl',
                nextAction
              )}
              onClick={() => void advance()}
              disabled={busy}
            >
              {busy ? (
                <span className="flex items-center gap-2 text-xl md:text-2xl">
                  <Loader2 className="size-6 animate-spin" />
                  Saving
                </span>
              ) : (
                <>
                  <span className="leading-none">{STAGE_ACCENT[next].label}</span>
                  {next === 'drying' ? (
                    <span className="mt-1 text-sm font-medium normal-case md:text-base">
                      {dryerNumber != null ? `Dryer ${dryerNumber}` : 'No dryer'}
                    </span>
                  ) : null}
                </>
              )}
            </Button>
          </div>
        </div>
      </KioskPanel>

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setError(null)
            setConfirming(false)
          }
        }}
      >
        <AlertDialogContent className="border-neutral-200 bg-white text-neutral-950 sm:max-w-md">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle id="kiosk-ready-confirm" className="text-xl font-semibold text-balance md:text-2xl">
              Mark {guest} ready for delivery?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-neutral-500 md:text-lg">
              This moves the bag to Ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-base font-medium text-red-700 md:text-lg">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              disabled={busy}
              className="h-12 min-h-12 border-neutral-200 bg-white text-base text-neutral-950 hover:bg-neutral-50 md:h-16 md:text-lg"
            >
              Not yet
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="h-12 min-h-12 bg-emerald-600 text-base text-white hover:bg-emerald-700 md:h-16 md:text-lg"
              onClick={(event) => {
                event.preventDefault()
                void advance()
              }}
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : null}
              Mark ready
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
