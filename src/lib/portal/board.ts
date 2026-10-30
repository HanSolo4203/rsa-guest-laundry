import { parseHex, readableTextColor } from '@/lib/contrast'
import { formatPrice } from '@/lib/pricing'
import type { BookingStage, PortalBooking, PortalProperty } from '@/lib/types/database'

export const HISTORY_MS = 30 * 24 * 60 * 60 * 1000
export const PORTAL_TITLE = 'Laundry Portal'
const FALLBACK_PRIMARY = '#2B5F44'
const CLOCK_SKEW_MS = 5 * 60 * 1000

const STAGES: readonly BookingStage[] = ['to_weigh', 'washing', 'drying', 'finishing', 'ready']
const STATUSES: readonly PortalBooking['status'][] = [
  'pending',
  'confirmed',
  'collected',
  'processing',
  'completed',
  'cancelled',
  'delivered',
]

export const PORTAL_STEPS = [
  { id: 'booked', label: 'Booked' },
  { id: 'washing', label: 'Washing' },
  { id: 'drying', label: 'Drying' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'ready', label: 'Ready' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'delivered', label: 'Delivered' },
] as const

export type PortalTab = 'active' | 'ready' | 'history'

export function portalPrimary(value: string | null | undefined): string {
  if (!value || !parseHex(value)) return FALLBACK_PRIMARY
  return value.trim()
}

export function portalOnPrimary(value: string | null | undefined): string {
  return readableTextColor(portalPrimary(value))
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.href
  } catch {
    return null
  }
}

export function isBookingStage(value: unknown): value is BookingStage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value)
}

export function isPortalStatus(value: unknown): value is PortalBooking['status'] {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function integerOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value)
  if (parsed == null) return null
  return Math.trunc(parsed)
}

const PROPERTY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parsePortalProperty(value: unknown): PortalProperty | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || row.name.trim() === '') return null
  if (typeof row.slug !== 'string' || !PROPERTY_SLUG.test(row.slug)) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name.trim(),
    logo_url: text(row.logo_url),
    primary_color: text(row.primary_color),
    show_prices: row.show_prices === true,
  }
}

export function parsePortalBooking(value: unknown): PortalBooking | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.property_id !== 'string') return null
  if (!isBookingStage(row.stage) || !isPortalStatus(row.status)) return null
  const createdAt = text(row.created_at)
  if (!createdAt) return null
  const payment = row.payment_method
  return {
    id: row.id,
    property_id: row.property_id,
    first_name: text(row.first_name)?.trim() ?? '',
    last_name: text(row.last_name)?.trim() ?? '',
    phone: text(row.phone)?.trim() ?? '',
    room_number: text(row.room_number)?.trim() || null,
    service_id: text(row.service_id) ?? '',
    service_name: text(row.service_name)?.trim() || 'Service',
    collection_date: text(row.collection_date) ?? '',
    departure_date: text(row.departure_date) ?? '',
    status: row.status,
    stage: row.stage,
    total_price: numberOrNull(row.total_price),
    payment_method: payment === 'card' || payment === 'cash' ? payment : null,
    weight_kg: numberOrNull(row.weight_kg),
    machine_number: integerOrNull(row.machine_number),
    dryer_number: integerOrNull(row.dryer_number),
    additional_details: text(row.additional_details)?.trim() || null,
    created_at: createdAt,
    completed_at: text(row.completed_at),
    weighed_at: text(row.weighed_at),
    washing_at: text(row.washing_at),
    drying_at: text(row.drying_at),
    finishing_at: text(row.finishing_at),
    ready_at: text(row.ready_at),
    out_for_delivery_at: text(row.out_for_delivery_at),
    delivered_at: text(row.delivered_at),
    received_at: text(row.received_at),
  }
}

export function guestName(booking: Pick<PortalBooking, 'first_name' | 'last_name'>): string {
  const name = `${booking.first_name} ${booking.last_name}`.replace(/\s+/g, ' ').trim()
  return name || 'Guest'
}

export function readyAnnouncement(
  roomNumber: string | null | undefined,
  lastName: string | null | undefined
): string {
  const room = roomNumber?.trim()
  const name = lastName?.trim() || 'Guest'
  return room ? `Laundry ready: Room ${room}, ${name}` : `Laundry ready: ${name}`
}

export function deliveryAnnouncement(
  roomNumber: string | null | undefined,
  lastName: string | null | undefined
): string {
  const room = roomNumber?.trim()
  const name = lastName?.trim() || 'Guest'
  return room ? `Out for delivery: Room ${room}, ${name}` : `Out for delivery: ${name}`
}

type PortalStepBooking = Pick<
  PortalBooking,
  'stage' | 'status' | 'out_for_delivery_at' | 'delivered_at' | 'received_at'
>

export function portalStepIndex(booking: PortalStepBooking): number {
  if (
    booking.status === 'delivered' ||
    booking.status === 'completed' ||
    booking.delivered_at ||
    booking.received_at
  ) {
    return PORTAL_STEPS.length - 1
  }
  if (booking.out_for_delivery_at) {
    return PORTAL_STEPS.findIndex((step) => step.id === 'out_for_delivery')
  }
  switch (booking.stage) {
    case 'washing':
      return 1
    case 'drying':
      return 2
    case 'finishing':
      return 3
    case 'ready':
      return 4
    default:
      return 0
  }
}

export function portalStepLabel(booking: PortalStepBooking): string {
  return PORTAL_STEPS[portalStepIndex(booking)].label
}

export function canConfirmReceived(booking: Pick<PortalBooking, 'status' | 'received_at'>): boolean {
  return booking.status === 'delivered' && !booking.received_at
}

export function isActive(booking: PortalBooking): boolean {
  if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'delivered') return false
  if (booking.out_for_delivery_at || booking.delivered_at || booking.received_at) return false
  return booking.stage !== 'ready'
}

export function isReady(booking: PortalBooking): boolean {
  if (booking.status === 'cancelled' || booking.status === 'completed' || booking.received_at) return false
  if (booking.status === 'delivered' || booking.delivered_at) return true
  return booking.stage === 'ready'
}

export function isInHistory(booking: PortalBooking, now: number): boolean {
  const received = Boolean(booking.received_at)
  const completed = booking.status === 'completed'
  if (!received && !completed) return false
  const stamp = booking.received_at ?? booking.completed_at ?? booking.delivered_at ?? booking.created_at
  const time = new Date(stamp).getTime()
  if (Number.isNaN(time)) return false
  return time <= now + CLOCK_SKEW_MS && now - time <= HISTORY_MS
}

export function isDeliveredToday(booking: PortalBooking, now: number): boolean {
  const stamp = booking.delivered_at ?? (booking.status === 'completed' ? booking.completed_at : null)
  if (!stamp) return false
  const completed = new Date(stamp)
  if (Number.isNaN(completed.getTime())) return false
  const today = new Date(now)
  return (
    completed.getFullYear() === today.getFullYear() &&
    completed.getMonth() === today.getMonth() &&
    completed.getDate() === today.getDate()
  )
}

export function portalCounts(bookings: PortalBooking[], now: number) {
  let inProgress = 0
  let ready = 0
  let deliveredToday = 0
  for (const booking of bookings) {
    if (isActive(booking)) inProgress += 1
    if (isReady(booking)) ready += 1
    if (isDeliveredToday(booking, now)) deliveredToday += 1
  }
  return { inProgress, ready, deliveredToday }
}

export function matchesGuestOrRoom(
  booking: Pick<PortalBooking, 'first_name' | 'last_name' | 'room_number'>,
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const name = `${booking.first_name} ${booking.last_name}`.toLowerCase()
  const room = (booking.room_number ?? '').trim().toLowerCase()
  const roomQuery = q.replace(/^room\s+/, '')
  return name.includes(q) || (room !== '' && (room.includes(roomQuery) || `room ${room}`.includes(q)))
}

function timeValue(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

export function visibleBookings(
  bookings: PortalBooking[],
  tab: PortalTab,
  query: string,
  now: number
): PortalBooking[] {
  const matched = bookings.filter((booking) => {
    const inTab =
      tab === 'active' ? isActive(booking) : tab === 'ready' ? isReady(booking) : isInHistory(booking, now)
    return inTab && matchesGuestOrRoom(booking, query)
  })

  if (tab === 'history') {
    matched.sort(
      (a, b) => timeValue(b.received_at ?? b.completed_at) - timeValue(a.received_at ?? a.completed_at)
    )
    return matched
  }
  if (tab === 'ready') {
    matched.sort((a, b) => timeValue(a.ready_at) - timeValue(b.ready_at))
    return matched
  }
  matched.sort((a, b) => {
    const stageDelta = portalStepIndex(b) - portalStepIndex(a)
    if (stageDelta !== 0) return stageDelta
    return timeValue(a.created_at) - timeValue(b.created_at)
  })
  return matched
}

function formatClock(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function formatPoint(prefix: string, iso: string | null, now: number): string | null {
  if (!iso) return null
  const date = new Date(iso)
  const clock = formatClock(date)
  if (!clock) return null
  const today = date.toDateString() === new Date(now).toDateString()
  const when = today
    ? clock
    : `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${clock}`
  return prefix ? `${prefix} ${when}` : when
}

export function formatStayDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function displayPrice(
  booking: Pick<PortalBooking, 'total_price'>,
  showPrices: boolean
): string | null {
  if (!showPrices || booking.total_price == null) return null
  return formatPrice(booking.total_price)
}

export function displayPayment(
  booking: Pick<PortalBooking, 'payment_method'>,
  showPrices: boolean
): string | null {
  if (!showPrices) return null
  if (booking.payment_method === 'card') return 'Card'
  if (booking.payment_method === 'cash') return 'Cash'
  return null
}

export function portalTitle(unread: number): string {
  if (unread <= 0) return PORTAL_TITLE
  return `(${unread}) ${PORTAL_TITLE}`
}

export function emptyTabCopy(tab: PortalTab, searching: boolean): string {
  if (searching) return 'No guests or rooms match that search.'
  if (tab === 'active') return 'No laundry in progress.'
  if (tab === 'ready') return 'Nothing is waiting for collection.'
  return 'No deliveries in the last 30 days.'
}
