import type { BookingStage, KioskBooking, MachineType } from '@/lib/types/database'

export const READY_VISIBLE_MS = 24 * 60 * 60 * 1000

const IN_PROGRESS_STAGES = ['washing', 'drying', 'finishing'] as const

export type InProgressStage = (typeof IN_PROGRESS_STAGES)[number]

export type ServiceDetail = {
  colours: 'Colour separated' | 'Mixed' | null
  work: string
}

const STAGES = new Set<BookingStage>([
  'to_weigh',
  'washing',
  'drying',
  'finishing',
  'ready',
])

export function isOnKioskBoard(booking: KioskBooking, now: number): boolean {
  if (booking.status === 'cancelled') return false
  if (booking.stage !== 'ready') return true
  if (!booking.ready_at) return true
  const readyAt = new Date(booking.ready_at).getTime()
  if (Number.isNaN(readyAt)) return true
  return now - readyAt <= READY_VISIBLE_MS
}

export function serviceDetail(serviceName: string): ServiceDetail {
  const name = serviceName.trim()
  const lower = name.toLowerCase()
  const colourSeparated = /colou?r\s*sep/.test(lower)
  const mixed = /\bmixed\b/.test(lower)
  const iron = /\biron/.test(lower)
  const wash = /\bwash\b/.test(lower)
  const dry = /\bdry\b/.test(lower)
  const fold = /\bfold\b/.test(lower)
  const colours = colourSeparated ? 'Colour separated' : mixed ? 'Mixed' : null

  if (wash && dry && (iron || fold)) {
    return {
      colours,
      work: iron ? 'Wash, dry, and iron' : 'Wash, dry, and fold',
    }
  }

  return { colours: null, work: name || 'Service' }
}

export function serviceDetailLine(serviceName: string): string {
  const detail = serviceDetail(serviceName)
  return detail.colours ? `${detail.colours}. ${detail.work}` : detail.work
}

export function serviceUsesIron(serviceName: string): boolean {
  return /\biron/i.test(serviceName)
}

export function stageLabel(stage: BookingStage): string | null {
  switch (stage) {
    case 'washing':
      return 'Washing'
    case 'drying':
      return 'Drying'
    case 'finishing':
      return 'Finishing'
    case 'ready':
      return 'Ready'
    default:
      return null
  }
}

export type ColoredStage = 'washing' | 'drying' | 'finishing' | 'ready'

export type MachineKind = MachineType

export const MACHINE_TIMER_MINUTES: Record<MachineKind, number> = {
  washer: 45,
  dryer: 40,
}

export function machineTimerMs(kind: MachineKind): number {
  return MACHINE_TIMER_MINUTES[kind] * 60_000
}

export const STAGE_STYLES: Record<
  ColoredStage,
  { label: string; card: string; action: string }
> = {
  washing: {
    label: 'Washing',
    card: 'border-neutral-950 bg-blue-700 text-white',
    action: 'border-neutral-950 bg-blue-700 text-white active:bg-blue-800',
  },
  drying: {
    label: 'Drying',
    card: 'border-neutral-950 bg-orange-600 text-white',
    action: 'border-neutral-950 bg-orange-600 text-white active:bg-orange-700',
  },
  finishing: {
    label: 'Finishing',
    card: 'border-neutral-950 bg-purple-700 text-white',
    action: 'border-neutral-950 bg-purple-700 text-white active:bg-purple-800',
  },
  ready: {
    label: 'Ready',
    card: 'border-neutral-950 bg-emerald-700 text-white',
    action: 'border-neutral-950 bg-emerald-600 text-white active:bg-emerald-700',
  },
}

export function stageTone(stage: BookingStage): ColoredStage | null {
  if (
    stage === 'washing' ||
    stage === 'drying' ||
    stage === 'finishing' ||
    stage === 'ready'
  ) {
    return stage
  }
  return null
}

export function nextStage(stage: InProgressStage): 'drying' | 'finishing' | 'ready' {
  switch (stage) {
    case 'washing':
      return 'drying'
    case 'drying':
      return 'finishing'
    case 'finishing':
      return 'ready'
  }
}

export function guestSurname(lastName: string): string {
  const surname = lastName.trim()
  return surname || 'Guest'
}

export function guestGivenName(firstName: string | null | undefined, initial = ''): string {
  const given = typeof firstName === 'string' ? firstName.trim() : ''
  if (given) return given
  return initial.trim().toLocaleUpperCase('en')
}

export function guestDisplayName(
  lastName: string,
  firstName: string | null | undefined,
  initial = ''
): string {
  const surname = guestSurname(lastName)
  const given = guestGivenName(firstName, initial)
  return given ? `${surname} ${given}` : surname
}

const STAY_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STAY_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatStayDate(value: string | null | undefined): string {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return ''
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    month < 1 ||
    month > 12 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return ''
  }
  return `${STAY_WEEKDAYS[date.getDay()]} ${day} ${STAY_MONTHS[month - 1]}`
}

export function machineForStage(
  booking: KioskBooking
): { kind: MachineKind; number: number } | null {
  if (booking.stage === 'washing' && booking.machine_number != null) {
    return { kind: 'washer', number: booking.machine_number }
  }
  if (booking.stage === 'drying' && booking.dryer_number != null) {
    return { kind: 'dryer', number: booking.dryer_number }
  }
  return null
}

export function formatTimerRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function timerReadout(
  endsAt: number,
  now: number
): { text: string; done: boolean } {
  const remaining = endsAt - now
  if (remaining <= 0) return { text: "Time's up", done: true }
  return { text: formatTimerRemaining(remaining), done: false }
}

export function formatArrivedAgo(createdAt: string, now: number): string {
  const then = new Date(createdAt).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.floor(Math.max(0, now - then) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hr ago'
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function hasGuestNotes(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function byCreatedAt(a: KioskBooking, b: KioskBooking): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

export type KioskColumns = {
  toWeigh: KioskBooking[]
  inProgress: KioskBooking[]
  ready: KioskBooking[]
}

export function groupKioskBoard(rows: KioskBooking[], now: number): KioskColumns {
  const visible = rows.filter((row) => isOnKioskBoard(row, now))
  const toWeigh = visible.filter((row) => row.stage === 'to_weigh').sort(byCreatedAt)
  const inProgress = visible
    .filter((row): row is KioskBooking & { stage: InProgressStage } =>
      IN_PROGRESS_STAGES.includes(row.stage as InProgressStage)
    )
    .sort((a, b) => {
      const stageOrder =
        IN_PROGRESS_STAGES.indexOf(a.stage) - IN_PROGRESS_STAGES.indexOf(b.stage)
      if (stageOrder !== 0) return stageOrder
      return byCreatedAt(a, b)
    })
  const ready = visible
    .filter((row) => row.stage === 'ready')
    .sort((a, b) => {
      const aReady = a.ready_at ? new Date(a.ready_at).getTime() : 0
      const bReady = b.ready_at ? new Date(b.ready_at).getTime() : 0
      return bReady - aReady
    })

  return { toWeigh, inProgress, ready }
}

export type MachineAssignment = {
  bookingId: string
  surname: string
  firstName: string
  displayName: string
  serviceName: string
  notes: string | null
  stage: 'washing' | 'drying'
}

export function machineAssignments(rows: KioskBooking[]): {
  washers: Map<number, MachineAssignment>
  dryers: Map<number, MachineAssignment>
} {
  const washers = new Map<number, MachineAssignment>()
  const dryers = new Map<number, MachineAssignment>()
  for (const row of rows) {
    if (row.status === 'cancelled') continue
    const surname = guestSurname(row.last_name)
    const firstName = guestGivenName(row.first_name, row.first_name_initial)
    const assignment = {
      bookingId: row.id,
      surname,
      firstName,
      displayName: guestDisplayName(row.last_name, row.first_name, row.first_name_initial),
      serviceName: row.service_name,
      notes: hasGuestNotes(row.additional_details) ? row.additional_details.trim() : null,
    }
    if (row.stage === 'washing' && row.machine_number != null && !washers.has(row.machine_number)) {
      washers.set(row.machine_number, { ...assignment, stage: 'washing' })
    }
    if (row.stage === 'drying' && row.dryer_number != null && !dryers.has(row.dryer_number)) {
      dryers.set(row.dryer_number, { ...assignment, stage: 'drying' })
    }
  }
  return { washers, dryers }
}

export function washersInUse(rows: KioskBooking[]): Map<number, string> {
  const inUse = new Map<number, string>()
  for (const row of rows) {
    if (row.status === 'cancelled') continue
    if (row.stage !== 'washing' || row.machine_number == null) continue
    if (!inUse.has(row.machine_number)) {
      inUse.set(
        row.machine_number,
        guestDisplayName(row.last_name, row.first_name, row.first_name_initial)
      )
    }
  }
  return inUse
}

export function toWeighIds(rows: KioskBooking[]): string[] {
  return rows
    .filter((row) => row.status !== 'cancelled' && row.stage === 'to_weigh')
    .map((row) => row.id)
}

export function parseWeightEntry(raw: string): number | null {
  const normalized = raw.endsWith('.') ? raw.slice(0, -1) : raw
  if (!/^\d{1,3}(\.\d)?$/.test(normalized)) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export const WEIGHT_TIER_LIMIT_KG = 15

export function weightWarning(raw: string): string | null {
  const value = parseWeightEntry(raw)
  if (value != null && value > WEIGHT_TIER_LIMIT_KG) {
    return 'No price tier – split the bag?'
  }
  return null
}

export function canAdvanceWeight(raw: string): boolean {
  const value = parseWeightEntry(raw)
  return value != null && value <= WEIGHT_TIER_LIMIT_KG
}

export function formatWeightReadout(raw: string): string {
  if (!raw) return '0 kg'
  return `${raw} kg`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalInt(value: unknown): number | null {
  if (value == null || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number)) return null
  return number
}

export function toKioskBooking(value: unknown): KioskBooking | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string') return null
  if (typeof value.stage !== 'string' || !STAGES.has(value.stage as BookingStage)) return null

  const machine = optionalInt(value.machine_number)
  const dryer = optionalInt(value.dryer_number)
  const weight =
    value.weight_kg == null || value.weight_kg === '' ? null : Number(value.weight_kg)

  return {
    id: value.id,
    last_name: typeof value.last_name === 'string' ? value.last_name : '',
    first_name: typeof value.first_name === 'string' ? value.first_name : '',
    first_name_initial:
      typeof value.first_name_initial === 'string' ? value.first_name_initial : '',
    service_name: typeof value.service_name === 'string' ? value.service_name : '',
    stage: value.stage as BookingStage,
    status:
      typeof value.status === 'string'
        ? (value.status as KioskBooking['status'])
        : 'pending',
    machine_number: machine,
    dryer_number: dryer,
    weight_kg: weight != null && Number.isFinite(weight) ? weight : null,
    created_at: typeof value.created_at === 'string' ? value.created_at : '',
    collection_date: typeof value.collection_date === 'string' ? value.collection_date : '',
    departure_date: typeof value.departure_date === 'string' ? value.departure_date : '',
    additional_details:
      typeof value.additional_details === 'string' ? value.additional_details : null,
    ready_at: typeof value.ready_at === 'string' ? value.ready_at : null,
    property_name: typeof value.property_name === 'string' ? value.property_name : '',
    primary_color: typeof value.primary_color === 'string' ? value.primary_color : null,
    room_number:
      typeof value.room_number === 'string' && value.room_number.trim()
        ? value.room_number.trim()
        : null,
    source: value.source === 'portal' || value.source === 'admin' || value.source === 'guest'
      ? value.source
      : 'guest',
    payment_status: paymentStatus(value.payment_status),
  }
}

function paymentStatus(value: unknown): KioskBooking['payment_status'] {
  if (
    value === 'unpaid' ||
    value === 'pending' ||
    value === 'paid' ||
    value === 'topup_due' ||
    value === 'pay_on_delivery'
  ) {
    return value
  }
  return 'pay_on_delivery'
}

export type KioskMachine = {
  id: string
  number: number
  type: MachineKind
}

export function toKioskMachine(value: unknown): KioskMachine | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string') return null
  const number = Number(value.number)
  if (!Number.isInteger(number)) return null
  if (value.type !== 'washer' && value.type !== 'dryer') return null
  return { id: value.id, number, type: value.type }
}
