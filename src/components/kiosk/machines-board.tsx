'use client'

import { Timer, WashingMachine } from 'lucide-react'
import { timerKey, type MachineTimer } from '@/contexts/machine-timers-context'
import { GuestNotes } from '@/components/kiosk/guest-facts'
import { KioskEmpty, machineCode, STAGE_ACCENT, timerProgress } from '@/components/kiosk/kiosk-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MACHINE_TIMER_MINUTES,
  serviceDetailLine,
  timerReadout,
  type KioskMachine,
  type MachineAssignment,
  type MachineKind,
} from '@/lib/kiosk/board'
import { cn } from '@/lib/utils'

type MachinesBoardProps = {
  washers: KioskMachine[]
  dryers: KioskMachine[]
  assignments: {
    washers: Map<number, MachineAssignment>
    dryers: Map<number, MachineAssignment>
  }
  timers: Record<string, MachineTimer>
  now: number
  toastClearance: boolean
  onStartTimer: (kind: MachineKind, number: number, bookingId: string) => void
}

const columns = [
  { key: 'washers', title: 'Washers', kind: 'washer' },
  { key: 'dryers', title: 'Dryers', kind: 'dryer' },
] as const

export function MachinesBoard({
  washers,
  dryers,
  assignments,
  timers,
  now,
  toastClearance,
  onStartTimer,
}: MachinesBoardProps) {
  const lists = { washers, dryers }

  return (
    <ScrollArea className="h-full">
      <div className={cn('space-y-8 p-3 md:p-4', toastClearance && 'pb-36 md:pb-28')}>
        {columns.map((column) => {
          const machines = lists[column.key]
          const assigned = assignments[column.key]
          const minutes = MACHINE_TIMER_MINUTES[column.kind]
          const noun = column.kind === 'washer' ? 'Washer' : 'Dryer'
          return (
            <section key={column.key} aria-labelledby={`kiosk-machines-${column.key}`}>
              <header className="mb-3 flex items-center gap-2">
                <h2 id={`kiosk-machines-${column.key}`} className="text-base font-semibold text-neutral-950 md:text-lg">
                  {column.title}
                </h2>
                <Badge className="border-transparent bg-neutral-200 text-neutral-800 tabular-nums">
                  {machines.length}
                </Badge>
              </header>
              {machines.length === 0 ? (
                <KioskEmpty
                  icon={column.kind === 'washer' ? WashingMachine : Timer}
                  message={`No ${column.kind === 'washer' ? 'washers' : 'dryers'} are set up.`}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {machines.map((machine) => {
                    const guest = assigned.get(machine.number) ?? null
                    const timer = timers[timerKey(column.kind, machine.number)]
                    const active =
                      timer && guest && timer.bookingId === guest.bookingId ? timer : null
                    const readout = active ? timerReadout(active.endsAt, now) : null
                    const accent = guest ? STAGE_ACCENT[guest.stage] : null
                    const service = guest ? serviceDetailLine(guest.serviceName) : ''
                    const progress =
                      active && accent ? timerProgress(active.endsAt, now, column.kind) : 0
                    const label = guest
                      ? `${noun} ${machine.number}, ${guest.displayName}, ${service}, ${accent?.label}${
                          guest.notes ? ', has notes' : ''
                        }${readout ? `, ${readout.text}` : ', no timer'}`
                      : `${noun} ${machine.number}, free`
                    return (
                      <Card
                        key={machine.id}
                        aria-label={label}
                        className={cn(
                          'gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white py-0 shadow-sm',
                          accent && 'border-l-4',
                          accent?.border,
                          readout?.done && 'kiosk-alarm'
                        )}
                      >
                        <CardContent className="flex flex-col gap-2 p-3 md:p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-lg font-semibold tabular-nums text-neutral-950 md:text-xl">
                              {machineCode(column.kind, machine.number)}
                            </p>
                            <Badge
                              className={cn(
                                'border-transparent text-white',
                                guest ? 'bg-neutral-950' : 'bg-emerald-600'
                              )}
                            >
                              {guest ? 'Busy' : 'Free'}
                            </Badge>
                          </div>
                          {guest && accent ? (
                            <>
                              <p className="truncate text-base font-semibold text-neutral-950 md:text-lg" title={guest.surname}>
                                {guest.surname}
                              </p>
                              {guest.firstName ? (
                                <p className="-mt-1 truncate text-sm text-neutral-500 md:text-base">
                                  {guest.firstName}
                                </p>
                              ) : null}
                              <p className="truncate text-sm text-neutral-600 md:text-base">{service}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn('size-2.5 shrink-0 rounded-full', accent.dot)} aria-hidden="true" />
                                <span className="text-sm font-medium text-neutral-700 md:text-base">{accent.label}</span>
                              </div>
                              {guest.notes ? (
                                <GuestNotes notes={guest.notes} mode="clamp" className="text-left" />
                              ) : null}
                              {readout && !readout.done ? (
                                <div className="space-y-1">
                                  <Progress
                                    value={progress}
                                    className={cn('h-1.5 bg-neutral-200', accent.bar)}
                                    aria-label={readout.text}
                                  />
                                  <p className="text-sm tabular-nums text-neutral-600 md:text-base">{readout.text}</p>
                                </div>
                              ) : (
                                <>
                                  {readout?.done ? (
                                    <p className="text-sm font-semibold text-amber-700 md:text-base">Time&apos;s up</p>
                                  ) : null}
                                  <Button
                                    type="button"
                                    className="h-12 min-h-12 w-full rounded-xl bg-neutral-950 text-base font-semibold text-white hover:bg-neutral-800 md:h-16 md:text-lg"
                                    onClick={() =>
                                      onStartTimer(column.kind, machine.number, guest.bookingId)
                                    }
                                  >
                                    Start {minutes} min
                                  </Button>
                                </>
                              )}
                            </>
                          ) : null}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </ScrollArea>
  )
}
