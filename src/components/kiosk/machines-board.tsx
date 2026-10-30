'use client'

import { timerKey, type MachineTimer } from '@/contexts/machine-timers-context'
import { GuestNotes } from '@/components/kiosk/guest-facts'
import {
  MACHINE_TIMER_MINUTES,
  serviceDetailLine,
  STAGE_STYLES,
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
  { key: 'washers', title: 'WASHERS', kind: 'washer' },
  { key: 'dryers', title: 'DRYERS', kind: 'dryer' },
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
    <div className="grid min-h-0 flex-1 grid-cols-2">
      {columns.map((column) => {
        const machines = lists[column.key]
        const assigned = assignments[column.key]
        const minutes = MACHINE_TIMER_MINUTES[column.kind]
        const noun = column.kind === 'washer' ? 'Washer' : 'Dryer'
        return (
          <section
            key={column.key}
            className="flex min-h-0 min-w-0 flex-col border-r-2 border-neutral-950 last:border-r-0"
            aria-labelledby={`kiosk-machines-${column.key}`}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 bg-neutral-950 px-5 py-4 text-white">
              <h2
                id={`kiosk-machines-${column.key}`}
                className="min-w-0 text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-none tracking-tight"
              >
                {column.title}
              </h2>
              <p className="shrink-0 text-[clamp(3rem,5vw,4.5rem)] font-bold leading-none tabular-nums">
                {machines.length}
              </p>
            </header>
            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto bg-neutral-100 p-4',
                toastClearance && 'pb-40'
              )}
            >
              {machines.length === 0 ? (
                <p className="px-2 py-8 text-center text-3xl font-semibold text-neutral-800">
                  No {column.kind === 'washer' ? 'washers' : 'dryers'} are set up.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {machines.map((machine) => {
                    const guest = assigned.get(machine.number) ?? null
                    const timer = timers[timerKey(column.kind, machine.number)]
                    const active =
                      timer && guest && timer.bookingId === guest.bookingId ? timer : null
                    const readout = active ? timerReadout(active.endsAt, now) : null
                    const styles = guest ? STAGE_STYLES[guest.stage] : null
                    const service = guest ? serviceDetailLine(guest.serviceName) : ''
                    const label = guest
                      ? `${noun} ${machine.number}, ${guest.displayName}, ${service}, ${styles?.label}${
                          guest.notes ? ', has notes' : ''
                        }${readout ? `, ${readout.text}` : ', no timer'}`
                      : `${noun} ${machine.number}, free`
                    return (
                      <article
                        key={machine.id}
                        aria-label={label}
                        className={cn(
                          'flex min-h-64 flex-col items-center justify-center rounded-3xl border-4 px-3 py-5 text-center',
                          guest && styles
                            ? styles.card
                            : 'border-neutral-950 bg-emerald-600 text-white',
                          readout?.done && 'kiosk-alarm'
                        )}
                      >
                        <p className="text-7xl font-bold leading-none tabular-nums">
                          {machine.number}
                        </p>
                        {guest && styles ? (
                          <>
                            <p className="mt-3 line-clamp-2 text-4xl font-bold uppercase leading-none">
                              {guest.surname}
                            </p>
                            {guest.firstName ? (
                              <p className="mt-2 line-clamp-1 text-2xl font-semibold leading-none">
                                {guest.firstName}
                              </p>
                            ) : null}
                            <p className="mt-3 text-2xl font-bold leading-tight">{service}</p>
                            <GuestNotes notes={guest.notes} mode="clamp" className="mt-3 w-full text-left" />
                            <p className="mt-3 text-3xl font-bold uppercase">{styles.label}</p>
                            {readout && !readout.done ? (
                              <p className="mt-3 text-5xl font-bold tabular-nums leading-none">
                                {readout.text}
                              </p>
                            ) : (
                              <>
                                {readout?.done ? (
                                  <p className="mt-3 text-4xl font-bold">Time&apos;s up</p>
                                ) : null}
                                <button
                                  type="button"
                                  className="mt-4 h-16 rounded-2xl bg-white px-5 text-2xl font-bold text-neutral-950"
                                  onClick={() =>
                                    onStartTimer(column.kind, machine.number, guest.bookingId)
                                  }
                                >
                                  Start {minutes} min
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <p className="mt-3 text-4xl font-bold uppercase">Free</p>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
