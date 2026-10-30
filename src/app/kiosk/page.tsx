'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BookingCard } from '@/components/kiosk/booking-card'
import { MachinesBoard } from '@/components/kiosk/machines-board'
import { NotesSheet } from '@/components/kiosk/notes-sheet'
import { StageSheet } from '@/components/kiosk/stage-sheet'
import { StageToast } from '@/components/kiosk/stage-toast'
import { WeighInSheet } from '@/components/kiosk/weigh-in-sheet'
import { useKioskStaff } from '@/contexts/kiosk-staff-context'
import { timerKey, useMachineTimers, type MachineTimer } from '@/contexts/machine-timers-context'
import { useKioskBoard } from '@/hooks/use-kiosk-board'
import {
  groupKioskBoard,
  guestDisplayName,
  hasGuestNotes,
  machineAssignments,
  machineForStage,
  STAGE_STYLES,
  timerReadout,
  washersInUse,
} from '@/lib/kiosk/board'
import { createClient } from '@/lib/supabase/client'
import type { KioskBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const columns = [
  {
    key: 'to_weigh',
    title: 'TO WEIGH',
    headerClass: 'bg-amber-400 text-neutral-950',
    bodyClass: 'bg-amber-50',
    empty: 'No bags waiting',
  },
  {
    key: 'in_progress',
    title: 'IN PROGRESS',
    headerClass: 'bg-blue-700 text-white',
    bodyClass: 'bg-blue-50',
    empty: 'Nothing in progress',
  },
  {
    key: 'ready',
    title: 'READY',
    headerClass: 'bg-emerald-700 text-white',
    bodyClass: 'bg-emerald-50',
    empty: 'Nothing ready',
  },
] as const

type UndoToast = {
  id: number
  bookingId: string
  message: string
}

function cardTimer(booking: KioskBooking, timers: Record<string, MachineTimer>, now: number) {
  const machine = machineForStage(booking)
  if (!machine) return null
  const timer = timers[timerKey(machine.kind, machine.number)]
  if (!timer || timer.bookingId !== booking.id) return null
  const readout = timerReadout(timer.endsAt, now)
  return { label: readout.text, alarming: readout.done, endsAt: timer.endsAt }
}

function undoFailure(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already at')) return 'That bag is already at the first stage.'
  if (lower.includes('cancelled')) return 'This booking can no longer be changed.'
  if (lower.includes('not found')) return 'This booking is no longer on the board.'
  if (lower.includes('kiosk role')) return 'This tablet is not signed in as the kiosk.'
  return 'The change could not be undone. Try again.'
}

export default function KioskPage() {
  const { staff } = useKioskStaff()
  const board = useKioskBoard(staff !== null)
  const { timers, now, start, clear, clearBooking, prune } = useMachineTimers()
  const [tab, setTab] = useState<'board' | 'machines'>('board')
  const [weighing, setWeighing] = useState<KioskBooking | null>(null)
  const [advancing, setAdvancing] = useState<KioskBooking | null>(null)
  const [notesFor, setNotesFor] = useState<KioskBooking | null>(null)
  const [toast, setToast] = useState<UndoToast | null>(null)

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (board.loading && board.bookings.length === 0) return
    prune(board.bookings)
  }, [board.bookings, board.loading, prune])

  const grouped = useMemo(
    () => groupKioskBoard(board.bookings, now),
    [board.bookings, now]
  )
  const inUse = useMemo(() => washersInUse(board.bookings), [board.bookings])
  const assignments = useMemo(() => machineAssignments(board.bookings), [board.bookings])
  const washers = useMemo(
    () => board.machines.filter((machine) => machine.type === 'washer'),
    [board.machines]
  )
  const dryers = useMemo(
    () => board.machines.filter((machine) => machine.type === 'dryer'),
    [board.machines]
  )
  const dryerNames = useMemo(() => {
    const names = new Map<number, string>()
    for (const [number, assignment] of assignments.dryers) {
      names.set(number, assignment.displayName)
    }
    return names
  }, [assignments])

  useEffect(() => {
    if (!weighing) return
    const stillWaiting = grouped.toWeigh.some((booking) => booking.id === weighing.id)
    if (!stillWaiting) setWeighing(null)
  }, [grouped.toWeigh, weighing])

  useEffect(() => {
    if (!advancing) return
    const live = board.bookings.find((booking) => booking.id === advancing.id)
    if (!live || live.stage !== advancing.stage || live.status === 'cancelled') {
      setAdvancing(null)
    }
  }, [advancing, board.bookings])

  const undoStage = useCallback(
    async (bookingId: string) => {
      try {
        const supabase = createClient()
        const { error } = await supabase.rpc('kiosk_undo_stage', { booking_id: bookingId })
        if (error) return undoFailure(error.message)
        clearBooking(bookingId)
        board.reload()
        return null
      } catch {
        return 'The change could not be undone. Try again.'
      }
    },
    [board, clearBooking]
  )

  if (!staff) return null

  const lists = {
    to_weigh: grouped.toWeigh,
    in_progress: grouped.inProgress,
    ready: grouped.ready,
  }
  const sheetOpen = weighing !== null || notesFor !== null || advancing !== null
  const advancingTimer = advancing ? cardTimer(advancing, timers, now) : null

  return (
    <main className="relative flex h-full min-h-0 flex-col">
      <h1 className="sr-only">Laundry board</h1>
      <p className="sr-only" aria-live="polite">
        {board.announcement}
      </p>
      <div className="flex min-h-0 flex-1 flex-col" aria-hidden={sheetOpen}>
        <div role="tablist" aria-label="Kiosk" className="grid shrink-0 grid-cols-2 border-b-2 border-neutral-950">
          <button
            type="button"
            role="tab"
            id="kiosk-tab-board"
            aria-selected={tab === 'board'}
            aria-controls="kiosk-panel-board"
            className={cn(
              'h-20 text-3xl font-bold',
              tab === 'board' ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-950'
            )}
            onClick={() => setTab('board')}
          >
            Board
          </button>
          <button
            type="button"
            role="tab"
            id="kiosk-tab-machines"
            aria-selected={tab === 'machines'}
            aria-controls="kiosk-panel-machines"
            className={cn(
              'h-20 border-l-2 border-neutral-950 text-3xl font-bold',
              tab === 'machines' ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-950'
            )}
            onClick={() => setTab('machines')}
          >
            Machines
          </button>
        </div>

        {board.loading && board.bookings.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="flex items-center gap-4 text-3xl font-semibold">
              <Loader2 className="size-10 animate-spin" />
              Loading the board
            </p>
          </div>
        ) : board.error && board.bookings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <p role="alert" className="text-3xl font-semibold">
              {board.error}
            </p>
            <button
              type="button"
              className="h-20 rounded-2xl bg-neutral-950 px-10 text-3xl font-bold text-white"
              onClick={board.reload}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {board.error ? (
              <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-red-800 bg-red-50 px-5 py-3">
                <p role="alert" className="text-2xl font-semibold text-red-900">
                  {board.error}
                </p>
                <button
                  type="button"
                  className="h-14 shrink-0 rounded-xl border-2 border-neutral-950 bg-white px-5 text-2xl font-bold"
                  onClick={board.reload}
                >
                  Try again
                </button>
              </div>
            ) : null}
            {tab === 'board' ? (
              <div
                id="kiosk-panel-board"
                role="tabpanel"
                aria-labelledby="kiosk-tab-board"
                className="grid min-h-0 flex-1 grid-cols-3"
              >
                {columns.map((column) => {
                  const items = lists[column.key]
                  return (
                    <section
                      key={column.key}
                      className="flex min-h-0 min-w-0 flex-col border-r-2 border-neutral-950 last:border-r-0"
                      aria-labelledby={`kiosk-column-${column.key}`}
                    >
                      <header
                        className={cn(
                          'flex shrink-0 items-center justify-between gap-3 px-5 py-4',
                          column.headerClass
                        )}
                      >
                        <h2
                          id={`kiosk-column-${column.key}`}
                          className="min-w-0 text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-none tracking-tight"
                        >
                          {column.title}
                        </h2>
                        <p className="shrink-0 text-[clamp(3rem,5vw,4.5rem)] font-bold leading-none tabular-nums">
                          {items.length}
                        </p>
                      </header>
                      <div
                        className={cn(
                          'min-h-0 flex-1 space-y-4 overflow-y-auto p-4',
                          column.bodyClass,
                          toast && 'pb-40'
                        )}
                      >
                        {items.length === 0 ? (
                          <p className="px-2 py-8 text-center text-3xl font-semibold text-neutral-700">
                            {column.empty}
                          </p>
                        ) : (
                          items.map((booking) => {
                            const timing = cardTimer(booking, timers, now)
                            return (
                              <BookingCard
                                key={booking.id}
                                booking={booking}
                                now={now}
                                timerLabel={timing?.label}
                                alarming={timing?.alarming}
                                onWeigh={
                                  column.key === 'to_weigh'
                                    ? () => setWeighing(booking)
                                    : undefined
                                }
                                onAdvance={
                                  column.key === 'in_progress'
                                    ? () => setAdvancing(booking)
                                    : undefined
                                }
                                onNotes={
                                  hasGuestNotes(booking.additional_details)
                                    ? () => setNotesFor(booking)
                                    : undefined
                                }
                              />
                            )
                          })
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>
            ) : (
              <div
                id="kiosk-panel-machines"
                role="tabpanel"
                aria-labelledby="kiosk-tab-machines"
                className="flex min-h-0 flex-1 flex-col"
              >
                <MachinesBoard
                  washers={washers}
                  dryers={dryers}
                  assignments={assignments}
                  timers={timers}
                  now={now}
                  toastClearance={toast != null}
                  onStartTimer={start}
                />
              </div>
            )}
          </>
        )}
      </div>

      {weighing ? (
        <WeighInSheet
          booking={weighing}
          staffId={staff.id}
          washers={washers}
          inUse={inUse}
          avoidToast={toast != null}
          onClose={() => setWeighing(null)}
          onStarted={() => {
            setWeighing(null)
            board.reload()
          }}
        />
      ) : null}

      {advancing &&
      (advancing.stage === 'washing' ||
        advancing.stage === 'drying' ||
        advancing.stage === 'finishing') ? (
        <StageSheet
          key={advancing.id}
          booking={advancing}
          dryers={dryers}
          dryersInUse={dryerNames}
          now={now}
          timerEndsAt={advancingTimer?.endsAt ?? null}
          avoidToast={toast != null}
          onStartTimer={() => {
            const machine = machineForStage(advancing)
            if (!machine) return
            start(machine.kind, machine.number, advancing.id)
          }}
          onClose={() => setAdvancing(null)}
          onDone={(change) => {
            const current = machineForStage(advancing)
            if (current) clear(current.kind, current.number)
            if (change.stage === 'drying' && change.dryerNumber != null && change.startDryerTimer) {
              start('dryer', change.dryerNumber, advancing.id)
            }
            const word =
              change.stage === 'ready' ? 'ready' : STAGE_STYLES[change.stage].label.toLowerCase()
            setToast({
              id: Date.now(),
              bookingId: advancing.id,
              message: `${guestDisplayName(advancing.last_name, advancing.first_name, advancing.first_name_initial)} is ${word}`,
            })
            setAdvancing(null)
            board.reload()
          }}
        />
      ) : null}

      {notesFor && hasGuestNotes(notesFor.additional_details) ? (
        <NotesSheet
          booking={notesFor}
          avoidToast={toast != null}
          onClose={() => setNotesFor(null)}
        />
      ) : null}

      {toast ? (
        <StageToast
          key={toast.id}
          message={toast.message}
          onDismiss={dismissToast}
          onUndo={() => undoStage(toast.bookingId)}
        />
      ) : null}
    </main>
  )
}
