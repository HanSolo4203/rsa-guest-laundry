import { parseHex, readableTextColor } from '@/lib/contrast'
import { cn } from '@/lib/utils'

const FALLBACK_BADGE = '#4b5563'

export function PropertyBadge({
  name,
  color,
  className,
}: {
  name: string
  color?: string | null
  className?: string
}) {
  const background = parseHex(color ?? '') ? color!.trim() : FALLBACK_BADGE
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-semibold leading-tight',
        className
      )}
      style={{ backgroundColor: background, color: readableTextColor(background) }}
    >
      {name}
    </span>
  )
}

export function BookingPropertyMeta({
  name,
  color,
  roomNumber,
  className,
  badgeClassName,
  roomClassName,
}: {
  name?: string | null
  color?: string | null
  roomNumber?: string | null
  className?: string
  badgeClassName?: string
  roomClassName?: string
}) {
  const room = roomNumber?.trim()
  if (!name && !room) return null

  return (
    <div className={cn('mt-1 flex flex-wrap items-center gap-1.5', className)}>
      {name ? <PropertyBadge name={name} color={color} className={badgeClassName} /> : null}
      {room ? <span className={cn('text-xs text-gray-400', roomClassName)}>Room {room}</span> : null}
    </div>
  )
}
