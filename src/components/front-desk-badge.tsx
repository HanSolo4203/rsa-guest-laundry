import { Badge } from '@/components/ui/badge'
import type { BookingSource } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export function FrontDeskBadge({
  source,
  tone = 'light',
  className,
}: {
  source: BookingSource | null | undefined
  tone?: 'light' | 'dark'
  className?: string
}) {
  if (source !== 'portal') return null
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-sky-200 bg-sky-50 font-medium text-sky-800',
        tone === 'dark' && 'border-sky-400/40 bg-sky-500/15 text-sky-200',
        className
      )}
    >
      Front desk
    </Badge>
  )
}
