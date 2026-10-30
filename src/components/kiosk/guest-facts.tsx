import {
  formatStayDate,
  guestGivenName,
  guestSurname,
  hasGuestNotes,
  serviceDetail,
  serviceUsesIron,
} from '@/lib/kiosk/board'
import { cn } from '@/lib/utils'

function FoldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 10h32a2 2 0 0 1 2 2v6H6v-6a2 2 0 0 1 2-2zm-2 12h36v6H6v-6zm4 10h28a2 2 0 0 1 2 2v4H8v-4a2 2 0 0 1 2-2z"
      />
    </svg>
  )
}

function IronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 6h10a8 8 0 0 1 8 8v6H16V6zM6 22h38L38 40H8L6 22z"
      />
    </svg>
  )
}

export function GuestName({
  lastName,
  firstName,
  initial = '',
  id,
  heading = 'h2',
  className,
  surnameClassName,
  givenClassName,
}: {
  lastName: string
  firstName: string
  initial?: string
  id?: string
  heading?: 'h2' | 'h3'
  className?: string
  surnameClassName?: string
  givenClassName?: string
}) {
  const surname = guestSurname(lastName)
  const given = guestGivenName(firstName, initial)
  const Tag = heading

  return (
    <div className={cn('min-w-0', className)}>
      <Tag
        id={id}
        title={surname}
        className={cn(
          'truncate font-semibold leading-tight tracking-tight text-neutral-950',
          surnameClassName
        )}
      >
        {surname}
      </Tag>
      {given ? (
        <p
          title={given}
          className={cn('mt-0.5 truncate text-base leading-tight text-neutral-500 md:text-lg', givenClassName)}
        >
          {given}
        </p>
      ) : null}
    </div>
  )
}

export function ServiceDetail({
  serviceName,
  className,
  size = 'board',
}: {
  serviceName: string
  className?: string
  size?: 'board' | 'sheet'
}) {
  const detail = serviceDetail(serviceName)
  const Icon = serviceUsesIron(serviceName) ? IronIcon : FoldIcon

  return (
    <div className={cn('flex min-w-0 items-start gap-2 text-neutral-800', className)}>
      <Icon className={cn('mt-0.5 shrink-0', size === 'sheet' ? 'size-6' : 'size-5')} />
      <div className="min-w-0">
        {detail.colours ? (
          <p className="text-base font-medium leading-snug md:text-lg">{detail.colours}</p>
        ) : null}
        <p className={cn('text-base font-medium leading-snug md:text-lg', detail.colours && 'mt-0.5')}>
          {detail.work}
        </p>
      </div>
    </div>
  )
}

export function StayDates({
  collectionDate,
  departureDate,
  className,
  size = 'board',
}: {
  collectionDate: string
  departureDate: string
  className?: string
  size?: 'board' | 'sheet'
}) {
  const collection = formatStayDate(collectionDate)
  const departure = formatStayDate(departureDate)
  if (!collection && !departure) return null

  return (
    <p
      className={cn(
        'flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-sm font-medium leading-snug text-neutral-500 md:text-base',
        size === 'sheet' && 'md:text-lg',
        className
      )}
    >
      {collection ? <span className="truncate">Collection {collection}</span> : null}
      {departure ? <span className="truncate">Departure {departure}</span> : null}
    </p>
  )
}

export function GuestNotes({
  notes,
  mode = 'full',
  className,
}: {
  notes: string | null
  mode?: 'full' | 'clamp' | 'scroll' | 'band'
  className?: string
}) {
  if (!hasGuestNotes(notes)) return null
  const text = notes.trim()

  return (
    <div
      className={cn(
        'text-neutral-950',
        mode === 'band'
          ? 'border-b border-amber-200 bg-amber-50 px-4 py-3'
          : 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2',
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Notes</p>
      <p
        className={cn(
          'mt-1 whitespace-pre-wrap break-words text-base font-medium leading-snug text-neutral-900 md:text-lg',
          mode === 'scroll' && 'max-h-40 overflow-y-auto',
          mode === 'clamp' && 'line-clamp-4',
          mode === 'full' && 'text-base md:text-lg'
        )}
      >
        {text}
      </p>
    </div>
  )
}
