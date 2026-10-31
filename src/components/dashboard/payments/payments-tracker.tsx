'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Download, Filter, SlidersHorizontal } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertyBadge } from '@/components/property-badge'
import { PropertyFilter, usePropertyOptions } from '@/components/dashboard/property-filter'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { formatKg, formatRand } from '@/lib/payments/money'
import { PaymentDetailSheet } from '@/components/dashboard/payments/payment-detail-sheet'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  LEDGER_PAGE_SIZE,
  LEDGER_SORTS,
  LEDGER_STATES,
  METHOD_COLOR,
  PAYMENT_METHODS,
  customRange,
  dayBounds,
  emptyMethodTotals,
  formatDays,
  formatWhen,
  formatYmd,
  isOverdue,
  johannesburgToday,
  ledgerStateLabel,
  loadLedger,
  loadTransactions,
  methodLabel,
  parseKpis,
  parsePropertyTotal,
  presetRange,
  staffEmailMap,
  type LedgerRow,
  type LedgerSort,
  type LedgerState,
  type PaymentKpis,
  type PaymentMethod,
  type PropertyTotal,
  type RangePreset,
  type TransactionRow,
} from '@/lib/payments/ledger'
import { cn } from '@/lib/utils'

const PRESETS: { id: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
]

const SORT_LABEL: Record<LedgerSort, string> = {
  created_at: 'Date',
  guest_name: 'Guest',
  property_name: 'Property',
  service_name: 'Service',
  weight_kg: 'Kg',
  total_due_cents: 'Due',
  total_paid_cents: 'Paid',
  balance_cents: 'Balance',
  payment_state: 'Status',
}

const selectTriggerClass = 'w-full border-gray-600 bg-gray-700 text-white'
const selectContentClass = 'border-gray-700 bg-gray-800 text-white'
const fieldClass = 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400'

function stateClass(state: string): string {
  if (state === 'paid') return 'bg-green-600 text-white'
  if (state === 'outstanding') return 'bg-red-600 text-white'
  if (state === 'partial') return 'bg-amber-400 text-amber-950'
  if (state === 'on_account') return 'bg-sky-700 text-white'
  if (state === 'cancelled') return 'bg-gray-600 text-white'
  return 'bg-gray-500 text-white'
}

function StatusBadge({ state, paidCents }: { state: string; paidCents: number }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', stateClass(state))}>
      {ledgerStateLabel(state, paidCents)}
    </span>
  )
}

function moneyOrDash(cents: number | null): string {
  return cents == null ? '—' : formatRand(cents)
}

export function PaymentsTracker() {
  const properties = usePropertyOptions()
  const [preset, setPreset] = useState<RangePreset>('month')
  const [custom, setCustom] = useState<DateRange | undefined>()
  const [propertyId, setPropertyId] = useState('all')
  const [state, setState] = useState<LedgerState | 'all'>('all')
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<LedgerSort>('created_at')
  const [ascending, setAscending] = useState(false)
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState('ledger')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [kpis, setKpis] = useState<PaymentKpis | null>(null)
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [transactionTotal, setTransactionTotal] = useState(0)
  const [transactionPage, setTransactionPage] = useState(0)
  const [emails, setEmails] = useState<Map<string, string>>(new Map())
  const [propertyTotals, setPropertyTotals] = useState<PropertyTotal[]>([])
  const [exporting, setExporting] = useState(false)

  const range = useMemo(() => {
    if (preset === 'custom' && custom?.from && custom.to) return customRange(custom.from, custom.to)
    if (preset === 'custom' && custom?.from) return customRange(custom.from, custom.from)
    if (preset === 'custom') return presetRange('month')
    return presetRange(preset)
  }, [preset, custom])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(0)
    setTransactionPage(0)
  }, [preset, custom, propertyId, state, method, search, sort, ascending])

  useEffect(() => {
    const supabase = createClient()
    let timer: number | null = null
    const bump = () => {
      if (timer != null) window.clearTimeout(timer)
      timer = window.setTimeout(() => setRefreshKey((value) => value + 1), 300)
    }
    const channel = supabase
      .channel('dashboard-payments-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_ups' }, bump)
      .subscribe()
    return () => {
      if (timer != null) window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const property = propertyId === 'all' ? null : propertyId
    const start = range.start.toISOString()
    const end = range.end.toISOString()

    const load = async () => {
      setLoading(true)
      try {
        const kpiResult = await supabase.rpc('admin_payment_kpis', {
          p_start: start,
          p_end: end,
          p_property_id: property,
        })
        if (kpiResult.error) throw new Error(kpiResult.error.message)
        if (!cancelled) setKpis(parseKpis(kpiResult.data))

        if (tab === 'transactions') {
          const pageResult = await loadTransactions(supabase, {
            start,
            end,
            propertyId: property,
            search,
            from: transactionPage * LEDGER_PAGE_SIZE,
            to: transactionPage * LEDGER_PAGE_SIZE + LEDGER_PAGE_SIZE - 1,
          })
          const labels = await staffEmailMap(supabase, pageResult.rows.map((row) => row.recordedBy))
          if (cancelled) return
          setTransactions(pageResult.rows)
          setTransactionTotal(pageResult.total)
          setEmails(labels)
        } else if (tab === 'property') {
          const { data, error } = await supabase.rpc('admin_payment_property_totals', { p_start: start, p_end: end })
          if (error) throw new Error(error.message)
          if (cancelled) return
          const parsed = (Array.isArray(data) ? data : []).map(parsePropertyTotal).filter((row): row is PropertyTotal => row !== null)
          setPropertyTotals(parsed)
        } else if (tab === 'ledger') {
          const pageResult = await loadLedger(supabase, {
            start,
            end,
            propertyId: property,
            state,
            method,
            search,
            sort,
            ascending,
            from: page * LEDGER_PAGE_SIZE,
            to: page * LEDGER_PAGE_SIZE + LEDGER_PAGE_SIZE - 1,
          })
          if (cancelled) return
          setRows(pageResult.rows)
          setTotal(pageResult.total)
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Could not load payments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [range.start, range.end, propertyId, state, method, search, sort, ascending, page, transactionPage, tab, refreshKey])

  function toggleSort(column: LedgerSort) {
    if (sort === column) setAscending((value) => !value)
    else {
      setSort(column)
      setAscending(column === 'guest_name' || column === 'property_name' || column === 'service_name')
    }
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        tab: tab === 'transactions' ? 'transactions' : 'ledger',
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        q: search,
      })
      if (propertyId !== 'all') params.set('property', propertyId)
      if (tab !== 'transactions') {
        if (state !== 'all') params.set('state', state)
        if (method !== 'all') params.set('method', method)
        params.set('sort', sort)
        params.set('dir', ascending ? 'asc' : 'desc')
      }
      const response = await fetch(`/api/dashboard/payments/export?${params.toString()}`)
      if (!response.ok) {
        toast.error('Could not export')
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers.get('Content-Disposition') ?? ''
      const match = /filename="([^"]+)"/.exec(disposition)
      link.href = url
      link.download = match?.[1] ?? 'payments.csv'
      link.click()
      URL.revokeObjectURL(url)
      if (response.headers.get('X-Export-Truncated') === '1') {
        toast.message('Export includes the first 5,000 rows')
      }
    } catch {
      toast.error('Could not export')
    } finally {
      setExporting(false)
    }
  }

  const renderFilters = (scope: string) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={preset === item.id ? 'default' : 'outline'}
            className={preset === item.id ? 'bg-purple-600 text-white hover:bg-purple-500' : 'border-gray-600 text-white hover:bg-gray-800'}
            onClick={() => {
              setPreset(item.id)
              setCustom(undefined)
            }}
          >
            {item.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className={cn('border-gray-600 text-white hover:bg-gray-800', preset === 'custom' && 'bg-purple-600 hover:bg-purple-500')}>
              Custom
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto bg-white p-0 text-gray-900" align="start">
            <Calendar
              mode="range"
              selected={custom}
              onSelect={(next) => {
                setCustom(next)
                setPreset('custom')
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PropertyFilter properties={properties} value={propertyId} onValueChange={setPropertyId} id={`property-filter-${scope}`} />
        {tab === 'ledger' ? (
          <>
            <div>
              <p className="mb-2 block text-sm font-medium text-gray-300">Status</p>
              <Select value={state} onValueChange={(value) => setState(value as LedgerState | 'all')}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="all">All statuses</SelectItem>
                  {LEDGER_STATES.map((item) => (
                    <SelectItem key={item} value={item}>{ledgerStateLabel(item, 1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-2 block text-sm font-medium text-gray-300">Method</p>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod | 'all')}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="all">All methods</SelectItem>
                  {PAYMENT_METHODS.map((item) => (
                    <SelectItem key={item} value={item}>{methodLabel(item)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
        <div className={tab === 'ledger' ? '' : 'md:col-span-1'}>
          <p className="mb-2 block text-sm font-medium text-gray-300">
            {tab === 'transactions' ? 'Reference or Yoco id' : 'Guest, room, or reference'}
          </p>
          <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className={fieldClass} placeholder="Search" aria-label={tab === 'transactions' ? 'Reference or Yoco id' : 'Guest, room, or reference'} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Payments</h1>
          <p className="mt-1 text-sm text-gray-400">{range.label}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="border-gray-600 text-white hover:bg-gray-800 md:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button type="button" className="bg-purple-600 text-white hover:bg-purple-500" disabled={exporting} onClick={() => void exportCsv()}>
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <div className="hidden md:block">{renderFilters('desktop')}</div>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto border-gray-700 bg-gray-900 text-white">
          <SheetHeader>
            <SheetTitle className="text-white">Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{renderFilters('mobile')}</div>
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Collected" value={kpis ? formatRand(kpis.collectedCents) : '—'} hint={range.label} />
        <Kpi label="Outstanding" value={kpis ? formatRand(kpis.outstandingCents) : '—'} hint="All time" />
        <Kpi label="Top-ups due" value={kpis ? formatRand(kpis.topupDueCents) : '—'} hint="All time" />
        <Kpi label="Avg days to pay" value={kpis ? formatDays(kpis.avgDaysToPay) : '—'} hint="Paid in this range" />
      </div>
      <MethodBreakdown methods={kpis?.methods ?? emptyMethodTotals()} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start bg-gray-800 p-1 text-gray-300">
          <TabsTrigger value="ledger" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">Ledger</TabsTrigger>
          <TabsTrigger value="transactions" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">Transactions</TabsTrigger>
          <TabsTrigger value="cashup" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">Cash-up</TabsTrigger>
          <TabsTrigger value="property" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white">By property</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-3">
          <div className="hidden md:block">
            <Card className="border-gray-700 bg-gray-800 text-white">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      {LEDGER_SORTS.map((column) => (
                        <TableHead key={column} className="text-gray-300">
                          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column)}>
                            {SORT_LABEL[column]}
                            {sort === column ? (ascending ? '↑' : '↓') : ''}
                          </button>
                        </TableHead>
                      ))}
                      <TableHead className="text-gray-300">Methods</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-gray-700"><TableCell colSpan={10} className="py-10 text-center text-gray-400">Loading…</TableCell></TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow className="border-gray-700"><TableCell colSpan={10} className="py-10 text-center text-gray-400">No bookings in this range</TableCell></TableRow>
                    ) : rows.map((row) => {
                      const overdue = isOverdue(row)
                      return (
                        <TableRow
                          key={row.bookingId}
                          className={cn('cursor-pointer border-gray-700', overdue ? 'bg-red-950/50 hover:bg-red-950/70' : 'hover:bg-gray-700/40')}
                          onClick={() => setSelectedId(row.bookingId)}
                        >
                          <TableCell className="whitespace-nowrap text-gray-200">{formatWhen(row.createdAt)}</TableCell>
                          <TableCell>
                            <div className="font-medium text-white">{row.guestName}</div>
                            <div className="text-xs text-gray-400">{row.roomNumber ? `Room ${row.roomNumber}` : 'No room'}</div>
                            {overdue ? <div className="text-xs font-semibold text-red-300">Overdue</div> : null}
                          </TableCell>
                          <TableCell><PropertyBadge name={row.propertyName} color={row.propertyColor} /></TableCell>
                          <TableCell className="text-gray-200">{row.serviceName}</TableCell>
                          <TableCell className="text-gray-200">{row.weightKg == null ? '—' : formatKg(row.weightKg)}</TableCell>
                          <TableCell className="whitespace-nowrap text-gray-200">{moneyOrDash(row.totalDueCents)}</TableCell>
                          <TableCell className="whitespace-nowrap text-gray-200">{formatRand(row.totalPaidCents)}</TableCell>
                          <TableCell className="whitespace-nowrap text-gray-200">{moneyOrDash(row.balanceCents)}</TableCell>
                          <TableCell>
                            <StatusBadge state={row.paymentState} paidCents={row.totalPaidCents} />
                          </TableCell>
                          <TableCell className="text-xs text-gray-300">{row.methods.map(methodLabel).join(', ') || '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-3 md:hidden">
            {loading ? <p className="text-sm text-gray-400">Loading…</p> : null}
            {!loading && rows.length === 0 ? <p className="text-sm text-gray-400">No bookings in this range</p> : null}
            {rows.map((row) => {
              const overdue = isOverdue(row)
              return (
                <button
                  key={row.bookingId}
                  type="button"
                  onClick={() => setSelectedId(row.bookingId)}
                  className={cn('w-full rounded-xl border p-4 text-left', overdue ? 'border-red-500 bg-red-950/40' : 'border-gray-700 bg-gray-800')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{row.guestName}</p>
                      <p className="text-sm text-gray-400">{row.roomNumber ? `Room ${row.roomNumber}` : 'No room'} · {formatWhen(row.createdAt)}</p>
                    </div>
                    <StatusBadge state={row.paymentState} paidCents={row.totalPaidCents} />
                  </div>
                  <div className="mt-2"><PropertyBadge name={row.propertyName} color={row.propertyColor} /></div>
                  <p className="mt-2 text-sm text-gray-300">{row.serviceName}{row.weightKg == null ? '' : ` · ${formatKg(row.weightKg)} kg`}</p>
                  <p className="mt-2 text-sm text-gray-200">Due {moneyOrDash(row.totalDueCents)} · Paid {formatRand(row.totalPaidCents)} · Balance {moneyOrDash(row.balanceCents)}</p>
                  <p className="mt-1 text-xs text-gray-400">{row.methods.map(methodLabel).join(', ') || 'No method'}</p>
                  {overdue ? <p className="mt-1 text-xs font-semibold text-red-300">Overdue</p> : null}
                </button>
              )
            })}
          </div>
          <Pager page={page} total={total} onPage={setPage} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-3">
          <div className="hidden md:block">
            <Card className="border-gray-700 bg-gray-800 text-white">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      {['Time', 'Guest', 'Amount', 'Method', 'Reference', 'Yoco id', 'Recorded by', 'Status'].map((label) => (
                        <TableHead key={label} className="text-gray-300">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-gray-700"><TableCell colSpan={8} className="py-10 text-center text-gray-400">Loading…</TableCell></TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow className="border-gray-700"><TableCell colSpan={8} className="py-10 text-center text-gray-400">No payments in this range</TableCell></TableRow>
                    ) : transactions.map((row) => (
                      <TableRow key={row.id} className="cursor-pointer border-gray-700 hover:bg-gray-700/40" onClick={() => setSelectedId(row.bookingId)}>
                        <TableCell className="whitespace-nowrap text-gray-200">{formatWhen(row.paidAt ?? row.createdAt)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-white">{row.guestName}</div>
                          <div className="text-xs text-gray-400">{row.roomNumber ? `Room ${row.roomNumber}` : row.propertyName}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-200">{formatRand(row.amountCents)}</TableCell>
                        <TableCell className="text-gray-200">{methodLabel(row.method)}</TableCell>
                        <TableCell className="text-gray-300">{row.reference || '—'}</TableCell>
                        <TableCell>
                          {row.yocoPaymentId ? (
                            <button type="button" className="inline-flex items-center gap-1 text-xs text-purple-300" onClick={(event) => { event.stopPropagation(); void copyText(row.yocoPaymentId!) }}>
                              <Copy className="h-3 w-3" />
                              Copy
                            </button>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-gray-300">{row.recordedBy ? emails.get(row.recordedBy) ?? 'Staff' : '—'}</TableCell>
                        <TableCell className="capitalize text-gray-200">{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-3 md:hidden">
            {transactions.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.bookingId)} className="w-full rounded-xl border border-gray-700 bg-gray-800 p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{formatRand(row.amountCents)}</p>
                    <p className="text-sm text-gray-300">{row.guestName}{row.roomNumber ? ` · Room ${row.roomNumber}` : ''}</p>
                  </div>
                  <span className="text-xs capitalize text-gray-300">{row.status}</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">{formatWhen(row.paidAt ?? row.createdAt)} · {methodLabel(row.method)}</p>
                {row.reference ? <p className="text-sm text-gray-300">Ref {row.reference}</p> : null}
                <p className="text-xs text-gray-400">{row.recordedBy ? emails.get(row.recordedBy) ?? 'Staff' : 'Online'}</p>
              </button>
            ))}
            {!loading && transactions.length === 0 ? <p className="text-sm text-gray-400">No payments in this range</p> : null}
          </div>
          <Pager page={transactionPage} total={transactionTotal} onPage={setTransactionPage} />
        </TabsContent>

        <TabsContent value="cashup">
          <CashUpPanel refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="property" className="space-y-3">
          {loading ? <p className="text-sm text-gray-400">Loading…</p> : null}
          {!loading && propertyTotals.length === 0 ? <p className="text-sm text-gray-400">No property totals in this range</p> : null}
          <div className="hidden md:block">
            <Card className="border-gray-700 bg-gray-800 text-white">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      {['Property', 'Bookings', 'Kg', 'Billed', 'Collected', 'Outstanding', ''].map((label) => (
                        <TableHead key={label || 'link'} className="text-gray-300">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyTotals.map((row) => (
                      <TableRow key={row.propertyId} className="border-gray-700">
                        <TableCell><PropertyBadge name={row.propertyName} color={row.propertyColor} /></TableCell>
                        <TableCell>{row.bookings}</TableCell>
                        <TableCell>{formatKg(row.weightKg)}</TableCell>
                        <TableCell>{formatRand(row.billedCents)}</TableCell>
                        <TableCell>{formatRand(row.collectedCents)}</TableCell>
                        <TableCell>{formatRand(row.outstandingCents)}</TableCell>
                        <TableCell>
                          <Button type="button" size="sm" variant="ghost" className="text-purple-300 hover:bg-gray-700 hover:text-white" onClick={() => { setPropertyId(row.propertyId); setTab('ledger') }}>
                            <Filter className="h-4 w-4" />
                            Ledger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-3 md:hidden">
            {propertyTotals.map((row) => (
              <div key={row.propertyId} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <PropertyBadge name={row.propertyName} color={row.propertyColor} />
                <p className="mt-2 text-sm text-gray-300">{row.bookings} bookings · {formatKg(row.weightKg)} kg</p>
                <p className="text-sm text-gray-200">Billed {formatRand(row.billedCents)} · Collected {formatRand(row.collectedCents)}</p>
                <p className="text-sm text-gray-200">Outstanding {formatRand(row.outstandingCents)}</p>
                <Button type="button" size="sm" variant="ghost" className="mt-2 px-0 text-purple-300" onClick={() => { setPropertyId(row.propertyId); setTab('ledger') }}>
                  View ledger
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <PaymentDetailSheet
        bookingId={selectedId}
        refreshKey={refreshKey}
        onClose={() => setSelectedId(null)}
        onChanged={() => setRefreshKey((value) => value + 1)}
      />
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-gray-700 bg-gray-800 text-white">
      <CardContent className="space-y-1 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-xl font-semibold sm:text-2xl">{value}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </CardContent>
    </Card>
  )
}

function MethodBreakdown({ methods }: { methods: Record<PaymentMethod, number> }) {
  const positive = PAYMENT_METHODS.reduce((sum, item) => sum + Math.max(methods[item], 0), 0)
  return (
    <Card className="border-gray-700 bg-gray-800 text-white">
      <CardContent className="space-y-3 px-4 py-4">
        <p className="text-sm font-medium text-gray-300">By method</p>
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-700">
          {PAYMENT_METHODS.map((item) => {
            const value = Math.max(methods[item], 0)
            if (value === 0 || positive === 0) return null
            return <div key={item} style={{ width: `${(value / positive) * 100}%`, backgroundColor: METHOD_COLOR[item] }} />
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full bg-gray-900/70 px-2.5 py-1 text-xs text-gray-200">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: METHOD_COLOR[item] }} />
              {methodLabel(item)}
              <span className="font-semibold text-white">{formatRand(methods[item])}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const from = total === 0 ? 0 : page * LEDGER_PAGE_SIZE + 1
  const to = Math.min(total, (page + 1) * LEDGER_PAGE_SIZE)
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-400">{total === 0 ? '0 rows' : `${from}–${to} of ${total}`}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="border-gray-600 text-white hover:bg-gray-800" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button type="button" size="sm" variant="outline" className="border-gray-600 text-white hover:bg-gray-800" disabled={to >= total} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  )
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success('Yoco id copied')
  } catch {
    toast.error('Could not copy')
  }
}

type CashLine = {
  id: string
  amountCents: number
  method: 'cash' | 'card_machine'
  recordedBy: string | null
  paidAt: string | null
  reference: string | null
  guestName: string
  roomNumber: string | null
}

function CashUpPanel({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const [day, setDay] = useState(() => formatYmd(johannesburgToday()))
  const [lines, setLines] = useState<CashLine[]>([])
  const [emails, setEmails] = useState<Map<string, string>>(new Map())
  const [saved, setSaved] = useState<{ recordedBy: string | null; cashCents: number; cardCents: number; note: string | null; createdAt: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const bounds = dayBounds(day)
    if (!bounds) return
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      setLoading(true)
      const [paymentsResult, cashUpResult] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount_cents, method, recorded_by, paid_at, reference, bookings(first_name, last_name, room_number)')
          .eq('status', 'succeeded')
          .in('method', ['cash', 'card_machine'])
          .gte('paid_at', bounds.start.toISOString())
          .lt('paid_at', bounds.end.toISOString())
          .order('paid_at', { ascending: true }),
        supabase.from('cash_ups').select('recorded_by, cash_cents, card_cents, note, created_at').eq('date', day).maybeSingle(),
      ])
      if (cancelled) return
      if (paymentsResult.error) {
        toast.error(paymentsResult.error.message)
        setLoading(false)
        return
      }
      const parsed: CashLine[] = (paymentsResult.data ?? []).flatMap((payment) => {
        const method = payment.method === 'cash' || payment.method === 'card_machine' ? payment.method : null
        if (!method) return []
        const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings
        const guest = booking ? `${booking.first_name ?? ''} ${booking.last_name ?? ''}`.trim() : 'Guest'
        return [{
          id: payment.id as string,
          amountCents: Number(payment.amount_cents),
          method,
          recordedBy: (payment.recorded_by as string | null) ?? null,
          paidAt: (payment.paid_at as string | null) ?? null,
          reference: (payment.reference as string | null) ?? null,
          guestName: guest || 'Guest',
          roomNumber: (booking?.room_number as string | null) ?? null,
        }]
      })
      setLines(parsed)
      const labels = await staffEmailMap(supabase, [
        ...parsed.map((line) => line.recordedBy),
        (cashUpResult.data?.recorded_by as string | null) ?? null,
      ])
      if (cancelled) return
      setEmails(labels)
      setSaved(cashUpResult.data ? {
        recordedBy: (cashUpResult.data.recorded_by as string | null) ?? null,
        cashCents: Number(cashUpResult.data.cash_cents),
        cardCents: Number(cashUpResult.data.card_cents),
        note: (cashUpResult.data.note as string | null) ?? null,
        createdAt: cashUpResult.data.created_at as string,
      } : null)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [day, refreshKey])

  const cashCents = lines.filter((line) => line.method === 'cash').reduce((sum, line) => sum + line.amountCents, 0)
  const cardCents = lines.filter((line) => line.method === 'card_machine').reduce((sum, line) => sum + line.amountCents, 0)
  const groups = new Map<string, CashLine[]>()
  for (const line of lines) {
    const key = line.recordedBy ?? 'unassigned'
    groups.set(key, [...(groups.get(key) ?? []), line])
  }

  async function markCashedUp() {
    if (!user) {
      toast.error('Sign in again to cash up')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('cash_ups').upsert({
      date: day,
      recorded_by: user.id,
      cash_cents: cashCents,
      card_cents: cardCents,
      note: note.trim() || null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'date' })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Marked cashed up')
    setConfirm(false)
    setNote('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="cash-up-day" className="mb-2 block text-sm font-medium text-gray-300">Day</label>
          <Input id="cash-up-day" type="date" value={day} onChange={(event) => setDay(event.target.value)} className={cn(fieldClass, 'w-full sm:w-48')} />
        </div>
        <Button type="button" className="bg-purple-600 text-white hover:bg-purple-500" onClick={() => setConfirm(true)}>
          Mark cashed up
        </Button>
      </div>
      {saved ? (
        <p className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200">
          Cashed up by {saved.recordedBy ? emails.get(saved.recordedBy) ?? 'staff' : 'staff'} {formatWhen(saved.createdAt)} · Cash {formatRand(saved.cashCents)} · Card machine {formatRand(saved.cardCents)}
          {saved.note ? ` · ${saved.note}` : ''}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-gray-400">Loading…</p> : null}
      {!loading && lines.length === 0 ? <p className="text-sm text-gray-400">No cash or card-machine payments on this day</p> : null}
      {[...groups.entries()].map(([key, group]) => {
        const groupCash = group.filter((line) => line.method === 'cash').reduce((sum, line) => sum + line.amountCents, 0)
        const groupCard = group.filter((line) => line.method === 'card_machine').reduce((sum, line) => sum + line.amountCents, 0)
        return (
          <Card key={key} className="border-gray-700 bg-gray-800 text-white">
            <CardContent className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{key === 'unassigned' ? 'Not recorded by a person' : emails.get(key) ?? 'Staff'}</h3>
                <p className="text-sm text-gray-300">Cash {formatRand(groupCash)} · Card {formatRand(groupCard)}</p>
              </div>
              <ul className="space-y-2">
                {group.map((line) => (
                  <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-gray-700 pt-2 text-sm">
                    <span>{formatWhen(line.paidAt)} · {line.guestName}{line.roomNumber ? ` · Room ${line.roomNumber}` : ''}</span>
                    <span>{methodLabel(line.method)} {formatRand(line.amountCents)}{line.reference ? ` · ${line.reference}` : ''}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
      <div className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-200">
        Day total · Cash {formatRand(cashCents)} · Card machine {formatRand(cardCents)}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="border-gray-700 bg-gray-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {day} cashed up?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This stores who confirmed the day and when. Cash {formatRand(cashCents)}. Card machine {formatRand(cardCents)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Note (optional)" className={`${fieldClass} min-h-20 w-full rounded-md border px-3 py-2 text-sm`} />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-transparent text-white hover:bg-gray-800">Cancel</AlertDialogCancel>
            <Button className="bg-purple-600 text-white hover:bg-purple-500" disabled={saving} onClick={() => void markCashedUp()}>
              {saving ? 'Saving…' : 'Mark cashed up'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
