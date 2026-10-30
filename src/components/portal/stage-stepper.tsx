import { Progress } from '@/components/ui/progress'
import { PORTAL_STEPS, portalStepIndex, portalStepLabel } from '@/lib/portal/board'
import type { PortalBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export function StageStepper({ booking }: { booking: Pick<PortalBooking, 'stage' | 'status' | 'out_for_delivery_at' | 'delivered_at' | 'received_at'> }) {
  const index = portalStepIndex(booking)
  const progress = (index / (PORTAL_STEPS.length - 1)) * 100
  const inset = `${50 / PORTAL_STEPS.length}%`
  const columns = `repeat(${PORTAL_STEPS.length}, minmax(0, 1fr))`

  return (
    <div className="relative">
      <p className="sr-only">Stage: {portalStepLabel(booking)}</p>
      <Progress
        value={progress}
        aria-hidden="true"
        className="absolute top-[5px] h-1 w-auto"
        style={{ left: inset, right: inset }}
      />
      <ol aria-hidden="true" className="relative grid" style={{ gridTemplateColumns: columns }}>
        {PORTAL_STEPS.map((step, stepIndex) => {
          const state = stepIndex < index ? 'done' : stepIndex === index ? 'current' : 'upcoming'
          return (
            <li key={step.id} className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={cn(
                  'relative z-10 size-3.5 rounded-full border-2 border-white',
                  state === 'upcoming' && 'bg-slate-200'
                )}
                style={
                  state === 'current'
                    ? {
                        backgroundColor: 'var(--portal-primary)',
                        boxShadow: '0 0 0 4px color-mix(in srgb, var(--portal-primary) 22%, white)',
                      }
                    : state === 'done'
                      ? { backgroundColor: 'var(--portal-primary)' }
                      : undefined
                }
              />
              <span
                className={cn(
                  'block w-full whitespace-normal text-center text-[8px] leading-3 tracking-tight min-[400px]:text-[10px] lg:text-xs lg:leading-4',
                  state === 'upcoming' && 'text-slate-400',
                  state === 'done' && 'text-slate-500',
                  state === 'current' && 'font-semibold'
                )}
                style={state === 'current' ? { color: 'var(--portal-primary)' } : undefined}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
