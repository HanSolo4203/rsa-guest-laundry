'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Inbox, PackageCheck, Scale } from 'lucide-react'
import { BookingCard } from '@/components/kiosk/booking-card'
import { KioskEmpty } from '@/components/kiosk/kiosk-ui'
import { MachinesBoard } from '@/components/kiosk/machines-board'
import { NotesSheet } from '@/components/kiosk/notes-sheet'
import { StageSheet } from '@/components/kiosk/stage-sheet'
import { StageToast } from '@/components/kiosk/stage-toast'
import { timerProgress } from '@/components/kiosk/kiosk-ui'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const columns = [
  {
    key: 'to_weigh',
    title: 'To weigh',
    dot: 'bg-amber-500',
    empty: 'No bags waiting',
    icon: Scale,
  },
  {
    key: 'in_progress',
    title: 'In progress',
    dot: 'bg-blue-600',
    empty: 'Nothing in progress',
    icon: Inbox,
  },
  {
    key: 'ready',
    title: 'Ready',
    dot: 'bg-emerald-600',
    empty: 'Nothing ready',
    icon: PackageCheck,
  },
] as const

type ColumnKey = (typeof columns)[number]['key']

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
  return {
    label: readout.text,
    alarming: readout.done,
    endsAt: timer.endsAt,
    progress: timerProgress(timer.endsAt, now, machine.kind),
  }
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
  const [weighing, setWeighing] = useState<KioskBooking | null>(null)
  const [advancing, setAdvancing] = useState<KioskBooking | null>(null)
  const [notesFor, setNotesFor] = useState<KioskBooking | null>(null)
  const [toast, setToast] = useState<UndoToast | null>(null)
  const [readyOpen, setReadyOpen] = useState(false)

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

  const renderBooking = (booking: KioskBooking, columnKey: ColumnKey) => {
    const timing = cardTimer(booking, timers, now)
    return (
      <BookingCard
        key={booking.id}
        booking={booking}
        now={now}
        timerLabel={timing?.label}
        timerProgress={timing?.progress}
        alarming={timing?.alarming}
        onWeigh={columnKey === 'to_weigh' ? () => setWeighing(booking) : undefined}
        onAdvance={columnKey === 'in_progress' ? () => setAdvancing(booking) : undefined}
        onNotes={hasGuestNotes(booking.additional_details) ? () => setNotesFor(booking) : undefined}
      />
    )
  }

  const list = (columnKey: ColumnKey, items: KioskBooking[]) => {
    const column = columns.find((item) => item.key === columnKey)!
    if (items.length === 0) {
      return <KioskEmpty icon={column.icon} message={column.empty} />
    }
    return items.map((booking) => renderBooking(booking, columnKey))
  }

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <h1 className="sr-only">Laundry board</h1>
      <p className="sr-only" aria-live="polite">
        {board.announcement}
      </p>
      <div className="flex min-h-0 flex-1 flex-col" aria-hidden={sheetOpen}>
        {board.loading && board.bookings.length === 0 ? (
          <div className="grid min-h-0 flex-1 content-start gap-3 p-3 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            <p className="sr-only">Loading the board</p>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-xl bg-neutral-200" />
            ))}
          </div>
        ) : board.error && board.bookings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p role="alert" className="text-base font-medium text-neutral-800 md:text-lg">
              {board.error}
            </p>
            <Button
              type="button"
              className="h-12 min-h-12 rounded-xl bg-neutral-950 px-6 text-base font-semibold text-white hover:bg-neutral-800 md:h-16 md:text-lg"
              onClick={board.reload}
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            {board.error ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3">
                <p role="alert" className="min-w-0 text-base font-medium text-red-900 md:text-lg">
                  {board.error}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 min-h-12 shrink-0 rounded-xl border-neutral-200 bg-white px-4 text-base font-semibold text-neutral-950 hover:bg-neutral-50"
                  onClick={board.reload}
                >
                  Try again
                </Button>
              </div>
            ) : null}
            <TabsContent
              value="board"
              id="kiosk-panel-board"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex min-h-0 flex-1 flex-col md:hidden">
                <Tabs defaultValue="to_weigh" className="flex min-h-0 flex-1 flex-col gap-0">
                  <div className="shrink-0 px-3 pt-3">
                    <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-neutral-100 p-1">
                      {columns.map((column) => (
                        <TabsTrigger
                          key={column.key}
                          value={column.key}
                          className="h-auto min-h-14 flex-col gap-1 px-1 py-1.5 text-base leading-tight text-neutral-600 data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm"
                        >
                          <span>{column.title}</span>
                          <Badge className="h-5 min-w-5 border-transparent bg-neutral-200 px-1 text-xs text-neutral-800 tabular-nums">
                            {lists[column.key].length}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {columns.map((column) => (
                    <TabsContent
                      key={column.key}
                      value={column.key}
                      className="mt-0 min-h-0 flex-1 overflow-hidden"
                    >
                      <ScrollArea className="h-full">
                        <div className={cn('space-y-3 p-3', toast && 'pb-36')}>
                          {list(column.key, lists[column.key])}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="hidden min-h-0 flex-1 flex-col md:flex lg:hidden">
                <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-neutral-200">
                  {columns.slice(0, 2).map((column) => (
                    <section key={column.key} className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`kiosk-column-${column.key}`}>
                      <ColumnHeader id={`kiosk-column-${column.key}`} title={column.title} dot={column.dot} count={lists[column.key].length} />
                      <ScrollArea className="min-h-0 flex-1">
                        <div className={cn('space-y-3 p-3', toast && 'pb-28')}>
                          {list(column.key, lists[column.key])}
                        </div>
                      </ScrollArea>
                    </section>
                  ))}
                </div>
                <section className="shrink-0 border-t border-neutral-200 bg-white">
                  <button
                    type="button"
                    className="flex min-h-16 w-full items-center gap-2 px-4 text-left"
                    aria-expanded={readyOpen}
                    aria-controls="kiosk-ready-panel"
                    onClick={() => setReadyOpen((open) => !open)}
                  >
                    <span className="size-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span className="text-base font-semibold text-neutral-950">Ready</span>
                    <Badge className="border-transparent bg-neutral-200 text-neutral-800 tabular-nums">
                      {lists.ready.length}
                    </Badge>
                    <ChevronDown className={cn('ml-auto size-5 text-neutral-500 transition', readyOpen && 'rotate-180')} />
                  </button>
                  {readyOpen ? (
                    <ScrollArea id="kiosk-ready-panel" className="h-[min(40vh,22rem)] border-t border-neutral-200">
                      <div className={cn('space-y-3 p-3', toast && 'pb-28')}>
                        {list('ready', lists.ready)}
                      </div>
                    </ScrollArea>
                  ) : null}
                </section>
              </div>

              <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-neutral-200">
                {columns.map((column) => (
                  <section key={column.key} className="flex min-h-0 min-w-0 flex-col" aria-labelledby={`kiosk-lg-column-${column.key}`}>
                    <ColumnHeader id={`kiosk-lg-column-${column.key}`} title={column.title} dot={column.dot} count={lists[column.key].length} />
                    <ScrollArea className="min-h-0 flex-1">
                      <div className={cn('space-y-3 p-3', toast && 'pb-28')}>
                        {list(column.key, lists[column.key])}
                      </div>
                    </ScrollArea>
                  </section>
                ))}
              </div>
            </TabsContent>
            <TabsContent
              value="machines"
              id="kiosk-panel-machines"
              className="mt-0 min-h-0 flex-1 overflow-hidden"
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
            </TabsContent>
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

function ColumnHeader({
  id,
  title,
  dot,
  count,
}: {
  id: string
  title: string
  dot: string
  count: number
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3">
      <span className={cn('size-2.5 rounded-full', dot)} aria-hidden="true" />
      <h2 id={id} className="text-base font-semibold text-neutral-950 md:text-lg">
        {title}
      </h2>
      <Badge className="ml-auto border-transparent bg-neutral-200 text-neutral-800 tabular-nums">
        {count}
      </Badge>
    </header>
  )
}
