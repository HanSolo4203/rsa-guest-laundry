'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Search, X } from 'lucide-react'
import { BookingCard } from '@/components/portal/booking-card'
import { BookingSheet } from '@/components/portal/booking-sheet'
import { NewBookingSheet } from '@/components/portal/new-booking-sheet'
import { usePortalProperty } from '@/components/portal/portal-shell'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePortalBookings } from '@/hooks/use-portal-bookings'
import { portalOnPrimary, portalCounts, emptyTabCopy, visibleBookings, type PortalTab } from '@/lib/portal/board'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const TABS: { id: PortalTab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'ready', label: 'Ready' },
  { id: 'history', label: 'History (30 days)' },
]

function useNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}

function SummaryCard({
  label,
  count,
  selected,
  emphasize,
  onSelect,
}: {
  label: string
  count: number
  selected: boolean
  emphasize?: boolean
  onSelect: () => void
}) {
  return (
    <Card
      className="gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white py-0 shadow-sm"
      style={selected ? { boxShadow: 'inset 0 0 0 2px var(--portal-primary)' } : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-h-[4.75rem] w-full cursor-pointer flex-col items-start justify-center px-2.5 py-3 text-left sm:px-4"
      >
        <span
          className="text-2xl font-semibold tabular-nums tracking-tight text-slate-950 sm:text-3xl"
          style={selected || emphasize ? { color: 'var(--portal-primary)' } : undefined}
        >
          {count}
        </span>
        <span className="mt-1 text-[11px] leading-tight font-medium text-slate-500 sm:text-xs">{label}</span>
      </button>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Skeleton className="h-36 rounded-2xl bg-slate-200" />
      <Skeleton className="h-36 rounded-2xl bg-slate-200" />
      <Skeleton className="h-36 rounded-2xl bg-slate-200" />
    </div>
  )
}

export default function PortalPage() {
  const { property, loading: propertyLoading, setHeaderAction } = usePortalProperty()
  const [tab, setTab] = useState<PortalTab>('active')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const now = useNow()
  const { bookings, loading, error, unread, retry, prependBooking, markCancelled } = usePortalBookings(
    property?.id ?? null,
    tab === 'ready'
  )
  const counts = portalCounts(bookings, now)
  const selected = bookings.find((booking) => booking.id === selectedId) ?? null
  const showSkeleton = propertyLoading || loading
  const searching = query.trim() !== ''
  const onPrimary = portalOnPrimary(property?.primary_color)
  const openNewBooking = useCallback(() => setCreating(true), [])

  useEffect(() => {
    setSelectedId(null)
    setQuery('')
    setCreating(false)
  }, [property?.id])

  useEffect(() => {
    if (!property) {
      setHeaderAction(null)
      return
    }
    setHeaderAction(
      <button
        type="button"
        onClick={openNewBooking}
        className="hidden h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold md:inline-flex"
        style={{ backgroundColor: 'var(--portal-primary)', color: onPrimary }}
      >
        <Plus className="size-4" aria-hidden="true" />
        New booking
      </button>
    )
    return () => setHeaderAction(null)
  }, [property, onPrimary, openNewBooking, setHeaderAction])

  useEffect(() => {
    if (!selectedId || loading) return
    if (!bookings.some((booking) => booking.id === selectedId)) setSelectedId(null)
  }, [bookings, selectedId, loading])

  async function confirmReceived(bookingId: string) {
    if (confirmingId) return
    setConfirmingId(bookingId)
    try {
      const supabase = createClient('portal')
      const { error } = await supabase.rpc('portal_confirm_received', { booking_id: bookingId })
      if (error) throw new Error(error.message)
      toast.success('Marked as received')
    } catch (confirmError) {
      console.error(confirmError)
      toast.error(confirmError instanceof Error ? confirmError.message : 'Could not confirm')
    } finally {
      setConfirmingId(null)
    }
  }

  async function cancelBooking(bookingId: string) {
    if (cancellingId) return
    setCancellingId(bookingId)
    try {
      const supabase = createClient('portal')
      const { error } = await supabase.rpc('portal_cancel_booking', { p_booking_id: bookingId })
      if (error) throw new Error(error.message)
      markCancelled(bookingId)
      toast.success('Booking cancelled')
      setSelectedId(null)
    } catch (cancelError) {
      console.error(cancelError)
      toast.error(cancelError instanceof Error ? cancelError.message : 'Could not cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-24 sm:px-6 md:pt-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-medium text-slate-500">{format(now, 'EEEE d MMM')}</p>
      <p className="sr-only" aria-live="polite">
        {counts.inProgress} in progress, {counts.ready} ready, {counts.deliveredToday} delivered today
        {unread > 0 ? `, ${unread} new` : ''}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {showSkeleton ? (
          <>
            <Skeleton className="h-[4.75rem] rounded-2xl bg-slate-200" />
            <Skeleton className="h-[4.75rem] rounded-2xl bg-slate-200" />
            <Skeleton className="h-[4.75rem] rounded-2xl bg-slate-200" />
          </>
        ) : (
          <>
            <SummaryCard
              label="In progress"
              count={counts.inProgress}
              selected={tab === 'active'}
              onSelect={() => setTab('active')}
            />
            <SummaryCard
              label="Ready"
              count={counts.ready}
              selected={tab === 'ready'}
              emphasize
              onSelect={() => setTab('ready')}
            />
            <SummaryCard
              label="Delivered today"
              count={counts.deliveredToday}
              selected={tab === 'history'}
              onSelect={() => setTab('history')}
            />
          </>
        )}
      </div>

      <div className="relative mt-4">
        <label htmlFor="portal-search" className="sr-only">
          Search by guest name or room number
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          id="portal-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guest or room"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-11 rounded-xl border-slate-200 bg-white pr-12 pl-9 text-base text-slate-900 shadow-sm placeholder:text-slate-400"
        />
        {query ? (
          <button
            type="button"
            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center text-slate-400"
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'active' || value === 'ready' || value === 'history') setTab(value)
        }}
        className="mt-4 gap-3"
      >
        <TabsList className="h-11 w-full justify-stretch gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="min-h-9 min-w-fit flex-1 rounded-lg px-2 text-xs whitespace-nowrap text-slate-600 data-[state=active]:bg-white data-[state=active]:shadow-sm sm:text-sm"
              style={tab === item.id ? { color: 'var(--portal-primary)' } : undefined}
            >
              {item.label}
              {item.id === 'ready' && unread > 0 ? (
                <Badge
                  className="h-5 min-w-5 border-transparent px-1 text-[11px]"
                  style={{ backgroundColor: 'var(--portal-primary)', color: onPrimary }}
                >
                  <span className="sr-only">{unread} new</span>
                  <span aria-hidden="true">{unread}</span>
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((item) => {
          const rows = visibleBookings(bookings, item.id, query, now)
          return (
            <TabsContent key={item.id} value={item.id} className="outline-none">
              {showSkeleton ? (
                <ListSkeleton />
              ) : error && bookings.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
                  <p className="text-sm text-slate-600">{error}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold"
                    style={{ backgroundColor: 'var(--portal-primary)', color: onPrimary }}
                  >
                    Try again
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <p className="px-2 py-16 text-center text-sm text-slate-500">{emptyTabCopy(item.id, searching)}</p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {rows.map((booking) => (
                    <li key={booking.id} className="min-w-0">
                      <BookingCard
                        booking={booking}
                        showPrices={property?.show_prices === true}
                        now={now}
                        onPrimary={onPrimary}
                        confirming={confirmingId === booking.id}
                        onOpen={() => setSelectedId(booking.id)}
                        onConfirm={() => {
                          void confirmReceived(booking.id)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      <BookingSheet
        booking={selected}
        showPrices={property?.show_prices === true}
        primaryColor={property?.primary_color ?? null}
        now={now}
        confirming={selected != null && confirmingId === selected.id}
        cancelling={selected != null && cancellingId === selected.id}
        onConfirm={() => {
          if (selected) void confirmReceived(selected.id)
        }}
        onCancel={() => {
          if (selected) void cancelBooking(selected.id)
        }}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />

      {property ? (
        <NewBookingSheet
          open={creating}
          onOpenChange={setCreating}
          propertyId={property.id}
          primaryColor={property.primary_color}
          bookings={bookings}
          onCreated={(booking) => {
            prependBooking(booking)
            setTab('active')
            setQuery('')
          }}
        />
      ) : null}

      {property ? (
        <button
          type="button"
          onClick={openNewBooking}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex size-14 cursor-pointer items-center justify-center rounded-full shadow-lg md:hidden"
          style={{ backgroundColor: 'var(--portal-primary)', color: onPrimary }}
          aria-label="New booking"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      ) : null}
    </main>
  )
}
