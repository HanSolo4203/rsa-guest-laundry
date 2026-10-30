import type { LucideIcon } from 'lucide-react'
import {
  machineTimerMs,
  serviceDetail,
  serviceUsesIron,
  type MachineKind,
} from '@/lib/kiosk/board'
import type { BookingStage } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export const STAGE_ACCENT: Record<
  BookingStage,
  { label: string; dot: string; border: string; bar: string }
> = {
  to_weigh: {
    label: 'To weigh',
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    bar: '[&_[data-slot=progress-indicator]]:bg-amber-500',
  },
  washing: {
    label: 'Washing',
    dot: 'bg-blue-600',
    border: 'border-l-blue-600',
    bar: '[&_[data-slot=progress-indicator]]:bg-blue-600',
  },
  drying: {
    label: 'Drying',
    dot: 'bg-orange-500',
    border: 'border-l-orange-500',
    bar: '[&_[data-slot=progress-indicator]]:bg-orange-500',
  },
  finishing: {
    label: 'Finishing',
    dot: 'bg-violet-600',
    border: 'border-l-violet-600',
    bar: '[&_[data-slot=progress-indicator]]:bg-violet-600',
  },
  ready: {
    label: 'Ready',
    dot: 'bg-emerald-600',
    border: 'border-l-emerald-600',
    bar: '[&_[data-slot=progress-indicator]]:bg-emerald-600',
  },
}

export const STAGE_ACTION = {
  drying: 'bg-orange-500 text-white hover:bg-orange-600',
  finishing: 'bg-violet-600 text-white hover:bg-violet-700',
  ready: 'bg-emerald-600 text-white hover:bg-emerald-700',
} as const

export function serviceMarks(serviceName: string): { label: string; colourSep: boolean } {
  const detail = serviceDetail(serviceName)
  const iron = serviceUsesIron(serviceName)
  const fold = /\bfold\b/i.test(serviceName) || /fold/i.test(detail.work)
  const label = iron ? 'Iron' : fold ? 'Fold' : detail.work || 'Service'
  return { label, colourSep: detail.colours === 'Colour separated' }
}

export function machineCode(kind: MachineKind, number: number): string {
  return `${kind === 'dryer' ? 'D' : 'W'}${number}`
}

export function timerProgress(endsAt: number, now: number, kind: MachineKind): number {
  const total = machineTimerMs(kind)
  if (total <= 0) return 0
  const remaining = endsAt - now
  if (remaining <= 0) return 100
  return Math.min(100, Math.max(0, ((total - remaining) / total) * 100))
}

export function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function KioskWordmark({ className }: { className?: string }) {
  return (
    <p className={cn('truncate text-base font-semibold tracking-tight text-neutral-950 md:text-lg', className)}>
      RSL Express
    </p>
  )
}

export function KioskEmpty({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center text-neutral-500">
      <Icon className="size-8" aria-hidden="true" />
      <p className="text-base md:text-lg">{message}</p>
    </div>
  )
}
