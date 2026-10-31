import type { SupabaseClient } from '@supabase/supabase-js'
import { centsToDecimal, formatRand } from '@/lib/payments/money'

export const LEDGER_PAGE_SIZE = 50
export const EXPORT_ROW_CAP = 5000

export const PAYMENT_METHODS = ['yoco', 'card_machine', 'cash', 'eft', 'account'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const LEDGER_STATES = [
  'paid',
  'partial',
  'outstanding',
  'not_priced',
  'on_account',
  'cancelled',
] as const
export type LedgerState = (typeof LEDGER_STATES)[number]

export const LEDGER_SORTS = [
  'created_at',
  'guest_name',
  'property_name',
  'service_name',
  'weight_kg',
  'total_due_cents',
  'total_paid_cents',
  'balance_cents',
  'payment_state',
] as const
export type LedgerSort = (typeof LEDGER_SORTS)[number]

export const METHOD_LABEL: Record<PaymentMethod | 'card', string> = {
  yoco: 'Yoco',
  card_machine: 'Card machine',
  cash: 'Cash',
  eft: 'EFT',
  account: 'On account',
  card: 'Card',
}

export const METHOD_COLOR: Record<PaymentMethod, string> = {
  yoco: '#a855f7',
  card_machine: '#38bdf8',
  cash: '#4ade80',
  eft: '#fbbf24',
  account: '#94a3b8',
}

export type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom'

export type CalendarDate = { year: number; month: number; day: number }

export type DateRangeBounds = { start: Date; end: Date; label: string }

export type LedgerRow = {
  bookingId: string
  createdAt: string
  guestName: string
  roomNumber: string | null
  propertyId: string
  propertyName: string
  propertyColor: string | null
  serviceName: string
  weightKg: number | null
  stage: string
  bookingStatus: string
  paymentMethod: string | null
  paymentStatus: string | null
  deliveredAt: string | null
  readyAt: string | null
  totalDueCents: number | null
  totalPaidCents: number
  balanceCents: number | null
  lastPaymentAt: string | null
  methods: string[]
  referenceText: string | null
  paymentState: LedgerState | string
}

export type TransactionRow = {
  id: string
  bookingId: string
  createdAt: string
  paidAt: string | null
  guestName: string
  roomNumber: string | null
  propertyName: string
  propertyColor: string | null
  kind: string
  amountCents: number
  method: string
  reference: string | null
  note: string | null
  yocoPaymentId: string | null
  recordedBy: string | null
  status: string
}

export type PaymentKpis = {
  collectedCents: number
  outstandingCents: number
  topupDueCents: number
  avgDaysToPay: number | null
  methods: Record<PaymentMethod, number>
}

export type PropertyTotal = {
  propertyId: string
  propertyName: string
  propertyColor: string | null
  bookings: number
  weightKg: number
  billedCents: number
  collectedCents: number
  outstandingCents: number
}

export type LedgerQuery = {
  start: string
  end: string
  propertyId: string | null
  state: LedgerState | 'all'
  method: string | 'all'
  search: string
  sort: LedgerSort
  ascending: boolean
  from: number
  to: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const OVERDUE_MS = 3 * 24 * 60 * 60 * 1000

export function isLedgerState(value: string): value is LedgerState {
  return (LEDGER_STATES as readonly string[]).includes(value)
}

export function isLedgerSort(value: string): value is LedgerSort {
  return (LEDGER_SORTS as readonly string[]).includes(value)
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value)
}

export function ledgerStateLabel(state: string, paidCents: number): string {
  if (state === 'partial' && paidCents <= 0) return 'Unpaid'
  if (state === 'paid') return 'Paid'
  if (state === 'partial') return 'Partial'
  if (state === 'outstanding') return 'Outstanding'
  if (state === 'not_priced') return 'Not priced'
  if (state === 'on_account') return 'On account'
  if (state === 'cancelled') return 'Cancelled'
  return state
}

export function methodLabel(method: string): string {
  if (method in METHOD_LABEL) return METHOD_LABEL[method as PaymentMethod | 'card']
  return method
}

export function paidToastMessage(cents: number, room: string | null | undefined, property: string | null | undefined): string {
  const place = [room?.trim() ? `Room ${room.trim()}` : null, property?.trim() || null].filter(Boolean).join(', ')
  return place ? `${formatRand(cents)} paid – ${place}` : `${formatRand(cents)} paid`
}

export function isOverdue(row: Pick<LedgerRow, 'paymentState' | 'deliveredAt'>, now = Date.now()): boolean {
  if (row.paymentState !== 'outstanding' || !row.deliveredAt) return false
  const delivered = new Date(row.deliveredAt).getTime()
  return Number.isFinite(delivered) && now - delivered > OVERDUE_MS
}

export function sanitizeSearch(value: string): string {
  return value.replace(/[%_*,.()\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

function ilikeFilter(column: string, term: string): string {
  return `${column}.ilike."%${term}%"`
}

export function johannesburgToday(now = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: read('year'), month: read('month'), day: read('day') }
}

export function formatYmd(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

export function formatDay(date: CalendarDate): string {
  return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

export function johannesburgStart(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, -2, 0, 0, 0))
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDays(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text} ${rounded === 1 ? 'day' : 'days'}`
}

function formatRangeLabel(start: CalendarDate, endInclusive: CalendarDate): string {
  if (start.year === endInclusive.year && start.month === endInclusive.month && start.day === endInclusive.day) {
    return formatDay(start)
  }
  if (start.year === endInclusive.year && start.month === endInclusive.month) {
    return `${start.day}–${endInclusive.day} ${MONTHS[start.month - 1]} ${start.year}`
  }
  if (start.year === endInclusive.year) {
    return `${start.day} ${MONTHS[start.month - 1]} – ${endInclusive.day} ${MONTHS[endInclusive.month - 1]} ${start.year}`
  }
  return `${formatDay(start)} – ${formatDay(endInclusive)}`
}

function span(start: CalendarDate, endExclusive: CalendarDate): DateRangeBounds {
  return {
    start: johannesburgStart(start),
    end: johannesburgStart(endExclusive),
    label: formatRangeLabel(start, addCalendarDays(endExclusive, -1)),
  }
}

function startOfIsoWeek(date: CalendarDate): CalendarDate {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
  const delta = weekday === 0 ? 6 : weekday - 1
  return addCalendarDays(date, -delta)
}

function monthStart(date: CalendarDate): CalendarDate {
  return { year: date.year, month: date.month, day: 1 }
}

function nextMonth(date: CalendarDate): CalendarDate {
  if (date.month === 12) return { year: date.year + 1, month: 1, day: 1 }
  return { year: date.year, month: date.month + 1, day: 1 }
}

function previousMonth(date: CalendarDate): CalendarDate {
  if (date.month === 1) return { year: date.year - 1, month: 12, day: 1 }
  return { year: date.year, month: date.month - 1, day: 1 }
}

export function presetRange(preset: Exclude<RangePreset, 'custom'>, now = new Date()): DateRangeBounds {
  const today = johannesburgToday(now)
  if (preset === 'today') return span(today, addCalendarDays(today, 1))
  if (preset === 'yesterday') return span(addCalendarDays(today, -1), today)
  if (preset === 'week') {
    const start = startOfIsoWeek(today)
    return span(start, addCalendarDays(start, 7))
  }
  if (preset === 'last_month') return span(previousMonth(today), monthStart(today))
  return span(monthStart(today), nextMonth(today))
}

export function customRange(from: Date, to: Date): DateRangeBounds {
  let start = { year: from.getFullYear(), month: from.getMonth() + 1, day: from.getDate() }
  let end = { year: to.getFullYear(), month: to.getMonth() + 1, day: to.getDate() }
  if (formatYmd(end) < formatYmd(start)) {
    const swap = start
    start = end
    end = swap
  }
  return span(start, addCalendarDays(end, 1))
}

export function dayBounds(ymd: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return null
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return null
  return { start: johannesburgStart(date), end: johannesburgStart(addCalendarDays(date, 1)) }
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function parseLedgerRow(value: unknown): LedgerRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const bookingId = asString(row.booking_id)
  const createdAt = asString(row.created_at)
  if (!bookingId || !createdAt) return null
  const paid = asInt(row.total_paid_cents) ?? 0
  return {
    bookingId,
    createdAt,
    guestName: asString(row.guest_name) ?? 'Guest',
    roomNumber: asString(row.room_number),
    propertyId: asString(row.property_id) ?? '',
    propertyName: asString(row.property_name) ?? 'Property',
    propertyColor: asString(row.property_color),
    serviceName: asString(row.service_name) ?? 'Service',
    weightKg: asNumber(row.weight_kg),
    stage: asString(row.stage) ?? '',
    bookingStatus: asString(row.booking_status) ?? '',
    paymentMethod: asString(row.payment_method),
    paymentStatus: asString(row.payment_status),
    deliveredAt: asString(row.delivered_at),
    readyAt: asString(row.ready_at),
    totalDueCents: asInt(row.total_due_cents),
    totalPaidCents: paid,
    balanceCents: asInt(row.balance_cents),
    lastPaymentAt: asString(row.last_payment_at),
    methods: asStringArray(row.methods),
    referenceText: asString(row.reference_text),
    paymentState: asString(row.payment_state) ?? 'partial',
  }
}

type LedgerFilter = {
  gte: (column: string, value: string) => LedgerFilter
  lt: (column: string, value: string) => LedgerFilter
  eq: (column: string, value: string) => LedgerFilter
  contains: (column: string, value: string[]) => LedgerFilter
  or: (filters: string) => LedgerFilter
  order: (column: string, options: { ascending: boolean; nullsFirst: boolean }) => LedgerFilter
  range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null; count: number | null }>
}

function applyLedgerFilters(query: LedgerFilter, args: Omit<LedgerQuery, 'from' | 'to'>): LedgerFilter {
  let next = query.gte('created_at', args.start).lt('created_at', args.end)
  if (args.propertyId) next = next.eq('property_id', args.propertyId)
  if (args.state !== 'all') next = next.eq('payment_state', args.state)
  if (args.method !== 'all') next = next.contains('methods', [args.method])
  const term = sanitizeSearch(args.search)
  if (term) {
    next = next.or([ilikeFilter('guest_name', term), ilikeFilter('room_number', term), ilikeFilter('reference_text', term)].join(','))
  }
  return next.order(args.sort, { ascending: args.ascending, nullsFirst: false })
}

export async function loadLedger(
  supabase: SupabaseClient,
  args: LedgerQuery
): Promise<{ rows: LedgerRow[]; total: number }> {
  const base = supabase.from('admin_payment_ledger').select('*', { count: 'exact' }) as unknown as LedgerFilter
  const { data, error, count } = await applyLedgerFilters(base, args).range(args.from, args.to)
  if (error) throw new Error(error.message)
  const rows = (data ?? []).map(parseLedgerRow).filter((row): row is LedgerRow => row !== null)
  return { rows, total: count ?? rows.length }
}

export async function loadLedgerExport(supabase: SupabaseClient, args: Omit<LedgerQuery, 'from' | 'to'>): Promise<LedgerRow[]> {
  const rows: LedgerRow[] = []
  for (let from = 0; from < EXPORT_ROW_CAP; from += 1000) {
    const page = await loadLedger(supabase, { ...args, from, to: from + 999 })
    rows.push(...page.rows)
    if (rows.length >= page.total || page.rows.length === 0) break
  }
  return rows.slice(0, EXPORT_ROW_CAP)
}

type BookingEmbed = {
  first_name?: string | null
  last_name?: string | null
  room_number?: string | null
  property_id?: string | null
  properties?: { name?: string | null; primary_color?: string | null } | { name?: string | null; primary_color?: string | null }[] | null
}

function parseTransaction(value: unknown): TransactionRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = asString(row.id)
  const bookingId = asString(row.booking_id)
  const createdAt = asString(row.created_at)
  const amount = asInt(row.amount_cents)
  if (!id || !bookingId || !createdAt || amount == null) return null
  const booking = one(row.bookings as BookingEmbed | BookingEmbed[] | null)
  const property = one(booking?.properties ?? null)
  const first = booking?.first_name?.trim() ?? ''
  const last = booking?.last_name?.trim() ?? ''
  return {
    id,
    bookingId,
    createdAt,
    paidAt: asString(row.paid_at),
    guestName: `${first} ${last}`.trim() || 'Guest',
    roomNumber: asString(booking?.room_number),
    propertyName: asString(property?.name) ?? 'Property',
    propertyColor: asString(property?.primary_color),
    kind: asString(row.kind) ?? 'booking',
    amountCents: amount,
    method: asString(row.method) ?? 'yoco',
    reference: asString(row.reference),
    note: asString(row.note),
    yocoPaymentId: asString(row.yoco_payment_id),
    recordedBy: asString(row.recorded_by),
    status: asString(row.status) ?? 'pending',
  }
}

const TRANSACTION_SELECT = `
  id, booking_id, created_at, paid_at, kind, amount_cents, method, reference, note,
  yoco_payment_id, recorded_by, status,
  bookings!inner(first_name, last_name, room_number, property_id, properties(name, primary_color))
`

export async function loadTransactions(
  supabase: SupabaseClient,
  args: { start: string; end: string; propertyId: string | null; search: string; from: number; to: number }
): Promise<{ rows: TransactionRow[]; total: number }> {
  let query = supabase
    .from('payments')
    .select(TRANSACTION_SELECT, { count: 'exact' })
    .gte('created_at', args.start)
    .lt('created_at', args.end)
  if (args.propertyId) query = query.eq('bookings.property_id', args.propertyId)
  const term = sanitizeSearch(args.search)
  if (term) query = query.or([ilikeFilter('reference', term), ilikeFilter('yoco_payment_id', term)].join(','))
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(args.from, args.to)
  if (error) throw new Error(error.message)
  const rows = (data ?? []).map(parseTransaction).filter((row): row is TransactionRow => row !== null)
  return { rows, total: count ?? rows.length }
}

export async function loadTransactionExport(
  supabase: SupabaseClient,
  args: { start: string; end: string; propertyId: string | null; search: string }
): Promise<TransactionRow[]> {
  const rows: TransactionRow[] = []
  for (let from = 0; from < EXPORT_ROW_CAP; from += 1000) {
    const page = await loadTransactions(supabase, { ...args, from, to: from + 999 })
    rows.push(...page.rows)
    if (rows.length >= page.total || page.rows.length === 0) break
  }
  return rows.slice(0, EXPORT_ROW_CAP)
}

export async function staffEmailMap(supabase: SupabaseClient, ids: Array<string | null>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  const map = new Map<string, string>()
  for (let index = 0; index < unique.length; index += 200) {
    const slice = unique.slice(index, index + 200)
    const { data, error } = await supabase.rpc('admin_staff_labels', { p_ids: slice })
    if (error) throw new Error(error.message)
    const rows = Array.isArray(data) ? data : []
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const record = row as { user_id?: unknown; email?: unknown }
      if (typeof record.user_id === 'string' && typeof record.email === 'string') {
        map.set(record.user_id, record.email)
      }
    }
  }
  return map
}

export function emptyMethodTotals(): Record<PaymentMethod, number> {
  return { yoco: 0, card_machine: 0, cash: 0, eft: 0, account: 0 }
}

export function parseKpis(value: unknown): PaymentKpis {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const methods = row.methods && typeof row.methods === 'object' ? (row.methods as Record<string, unknown>) : {}
  const totals = emptyMethodTotals()
  for (const method of PAYMENT_METHODS) totals[method] = asInt(methods[method]) ?? 0
  return {
    collectedCents: asInt(row.collected_cents) ?? 0,
    outstandingCents: asInt(row.outstanding_cents) ?? 0,
    topupDueCents: asInt(row.topup_due_cents) ?? 0,
    avgDaysToPay: asNumber(row.avg_days_to_pay),
    methods: totals,
  }
}

export function parsePropertyTotal(value: unknown): PropertyTotal | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const propertyId = asString(row.property_id)
  if (!propertyId) return null
  return {
    propertyId,
    propertyName: asString(row.property_name) ?? 'Property',
    propertyColor: asString(row.property_color),
    bookings: asInt(row.bookings) ?? 0,
    weightKg: asNumber(row.weight_kg) ?? 0,
    billedCents: asInt(row.billed_cents) ?? 0,
    collectedCents: asInt(row.collected_cents) ?? 0,
    outstandingCents: asInt(row.outstanding_cents) ?? 0,
  }
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function csvLine(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(',')
}

function moneyCell(cents: number | null): string {
  return cents == null ? '' : centsToDecimal(cents)
}

export function ledgerCsv(rows: LedgerRow[]): string {
  const lines = [
    csvLine(['Date', 'Guest', 'Room', 'Property', 'Service', 'Kg', 'Due (ZAR)', 'Paid (ZAR)', 'Balance (ZAR)', 'Status', 'Methods', 'Last payment', 'References']),
    ...rows.map((row) =>
      csvLine([
        formatWhen(row.createdAt),
        row.guestName,
        row.roomNumber,
        row.propertyName,
        row.serviceName,
        row.weightKg == null ? '' : String(row.weightKg),
        moneyCell(row.totalDueCents),
        moneyCell(row.totalPaidCents),
        moneyCell(row.balanceCents),
        ledgerStateLabel(row.paymentState, row.totalPaidCents),
        row.methods.map(methodLabel).join(', '),
        formatWhen(row.lastPaymentAt),
        row.referenceText,
      ])
    ),
  ]
  return `\uFEFF${lines.join('\n')}\n`
}

export function transactionsCsv(rows: TransactionRow[], emails: Map<string, string>): string {
  const lines = [
    csvLine(['Time', 'Guest', 'Room', 'Property', 'Kind', 'Amount (ZAR)', 'Method', 'Reference', 'Yoco payment id', 'Recorded by', 'Status', 'Note']),
    ...rows.map((row) =>
      csvLine([
        formatWhen(row.paidAt ?? row.createdAt),
        row.guestName,
        row.roomNumber,
        row.propertyName,
        row.kind,
        moneyCell(row.amountCents),
        methodLabel(row.method),
        row.reference,
        row.yocoPaymentId,
        row.recordedBy ? emails.get(row.recordedBy) ?? '' : '',
        row.status,
        row.note,
      ])
    ),
  ]
  return `\uFEFF${lines.join('\n')}\n`
}
