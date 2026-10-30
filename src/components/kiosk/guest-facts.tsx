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
  surnameClassName,
  givenClassName,
}: {
  lastName: string
  firstName: string
  initial?: string
  id?: string
  heading?: 'h2' | 'h3'
  surnameClassName?: string
  givenClassName?: string
}) {
  const surname = guestSurname(lastName)
  const given = guestGivenName(firstName, initial)
  const Tag = heading

  return (
    <div className="min-w-0">
      <Tag
        id={id}
        className={cn(
          'break-words font-bold uppercase leading-none tracking-tight',
          surnameClassName
        )}
      >
        {surname}
      </Tag>
      {given ? (
        <p className={cn('mt-2 break-words font-semibold leading-none', givenClassName)}>
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
  const text = size === 'sheet' ? 'text-4xl' : 'text-3xl'

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Icon className={cn('mt-0.5 shrink-0', size === 'sheet' ? 'size-14' : 'size-12')} />
      <div className="min-w-0">
        {detail.colours ? (
          <p className={cn(text, 'font-bold leading-none')}>{detail.colours}</p>
        ) : null}
        <p className={cn(text, 'font-bold leading-tight', detail.colours && 'mt-2')}>
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
        'flex flex-wrap gap-x-6 gap-y-1 font-semibold leading-snug',
        size === 'sheet' ? 'text-3xl' : 'text-2xl',
        className
      )}
    >
      {collection ? <span>Collection {collection}</span> : null}
      {departure ? <span>Departure {departure}</span> : null}
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
          ? 'border-b-4 border-amber-800 bg-amber-200 px-6 py-3'
          : 'rounded-2xl border-4 border-amber-800 bg-amber-200 px-4 py-3',
        className
      )}
    >
      <p className="text-xl font-bold uppercase tracking-wide">Notes</p>
      <p
        className={cn(
          'mt-1 whitespace-pre-wrap break-words font-semibold leading-snug',
          mode === 'scroll' && 'max-h-40 overflow-y-auto text-3xl',
          mode === 'band' && 'text-3xl',
          mode === 'clamp' && 'line-clamp-4 text-2xl',
          mode === 'full' && 'text-4xl'
        )}
      >
        {text}
      </p>
    </div>
  )
}
