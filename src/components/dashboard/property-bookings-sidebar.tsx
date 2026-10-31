'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Phone, Scale, Search, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeliveryActions, type DeliveryPatch } from '@/components/dashboard/delivery-actions'
import { FrontDeskBadge } from '@/components/front-desk-badge'
import { PaymentStatusBadge } from '@/components/payments/payment-status-badge'
import { PropertyBadge } from '@/components/property-badge'
import { createClient } from '@/lib/supabase/client'
import { getBookings } from '@/lib/supabase/services'
import type { BookingStage, BookingWithService } from '@/lib/types/database'

const STAGE_ORDER: BookingStage[] = ['to_weigh', 'washing', 'drying', 'finishing', 'ready']

const stageMeta: Record<BookingStage, { label: string; className: string }> = {
  to_weigh: { label: 'To weigh', className: 'border-amber-300 bg-amber-100 text-amber-950' },
  washing: { label: 'Washing', className: 'border-blue-800 bg-blue-700 text-white' },
  drying: { label: 'Drying', className: 'border-orange-700 bg-orange-600 text-white' },
  finishing: { label: 'Finishing', className: 'border-purple-800 bg-purple-700 text-white' },
  ready: { label: 'Ready', className: 'border-emerald-800 bg-emerald-700 text-white' },
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function sameMonth(collectionDate: string, month: Date) {
  const match = /^(\d{4})-(\d{2})/.exec(collectionDate)
  if (!match) return false
  return Number(match[1]) === month.getFullYear() && Number(match[2]) === month.getMonth() + 1
}

function stayLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  return format(parseISO(`${match[1]}-${match[2]}-${match[3]}`), 'MMM d')
}

export function PropertyBookingsSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(() => monthStart(new Date()))

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const rows = await getBookings()
        if (!cancelled) setBookings(rows)
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const supabase = createClient()
    const channel = supabase
      .channel('property-page-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        load()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return bookings
      .filter((booking) => booking.status !== 'cancelled')
      .filter((booking) => sameMonth(booking.collection_date, month))
      .filter((booking) => {
        if (!needle) return true
        const name = `${booking.first_name} ${booking.last_name}`.toLowerCase()
        return name.includes(needle) || (booking.phone ?? '').toLowerCase().includes(needle)
      })
      .sort((a, b) => {
        const stageDelta = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
        if (stageDelta !== 0) return stageDelta
        return a.collection_date.localeCompare(b.collection_date)
      })
  }, [bookings, month, query])

  const groups = useMemo(() => {
    const byProperty = new Map<string, { id: string; name: string; color: string | null; bookings: BookingWithService[] }>()
    for (const booking of visible) {
      const key = booking.property?.id ?? booking.property_id ?? 'unassigned'
      const current = byProperty.get(key) ?? {
        id: key,
        name: booking.property?.name ?? 'Unassigned',
        color: booking.property?.primary_color ?? null,
        bookings: [],
      }
      current.bookings.push(booking)
      byProperty.set(key, current)
    }
    return [...byProperty.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [visible])

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close guest laundry"
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col rounded-l-3xl border-l shadow-2xl transition-transform duration-500 ease-in-out ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        style={{ backgroundColor: 'rgba(248, 246, 243, 0.97)', borderColor: '#6B2F2F' }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-6">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: '#2F2F2F' }}>
              Guest laundry
            </h2>
            <p className="text-sm" style={{ color: '#6B6B6B' }}>
              {visible.length} guest{visible.length === 1 ? '' : 's'} in {format(month, 'MMMM yyyy')}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-[#6B2F2F] hover:bg-[#6B2F2F]/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mx-5 mb-3 flex items-center justify-between rounded-xl border px-2 py-2" style={{ borderColor: '#6B2F2F' }}>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-black/5"
            style={{ color: '#6B2F2F' }}
            onClick={() => setMonth((current) => monthStart(new Date(current.getFullYear(), current.getMonth() - 1, 1)))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold" style={{ color: '#2F2F2F' }}>
            {format(month, 'MMMM yyyy')}
          </p>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-black/5"
            style={{ color: '#6B2F2F' }}
            onClick={() => setMonth((current) => monthStart(new Date(current.getFullYear(), current.getMonth() + 1, 1)))}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mx-5 mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or phone"
            className="w-full rounded-xl border py-2.5 pl-9 pr-9 text-sm outline-none focus:ring-2"
            style={{ backgroundColor: '#F8F6F3', color: '#2F2F2F', borderColor: '#6B2F2F' }}
          />
          {query ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="sidebar-scroll flex-1 space-y-5 overflow-y-auto px-5 pb-6">
          {loading ? (
            <p className="py-8 text-center text-sm" style={{ color: '#6B6B6B' }}>
              Loading guests…
            </p>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: '#6B6B6B' }}>
              {query ? `No guests match “${query}”` : `No guest laundry in ${format(month, 'MMMM yyyy')}`}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="space-y-2">
                <div className="sticky top-0 z-10 flex items-center justify-between py-1" style={{ backgroundColor: 'rgba(248, 246, 243, 0.97)' }}>
                  <PropertyBadge name={group.name} color={group.color} />
                  <span className="text-xs" style={{ color: '#6B6B6B' }}>
                    {group.bookings.length}
                  </span>
                </div>
                {group.bookings.map((booking) => {
                  const stage = stageMeta[booking.stage] ?? stageMeta.to_weigh
                  return (
                    <article
                      key={booking.id}
                      className="rounded-xl border bg-white px-3 py-3 shadow-sm"
                      style={{ borderColor: '#6B2F2F' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <User className="h-4 w-4 shrink-0" style={{ color: '#6B6B6B' }} />
                          <p className="flex min-w-0 items-center gap-1.5 truncate font-semibold" style={{ color: '#2F2F2F' }}>
                            <span className="truncate">{booking.first_name} {booking.last_name}</span>
                            <FrontDeskBadge source={booking.source} />
                            <PaymentStatusBadge status={booking.payment_status} />
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stage.className}`}>
                          {stage.label}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm" style={{ color: '#2F2F2F' }}>
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" style={{ color: '#6B6B6B' }} />
                          {booking.phone?.trim() || 'No phone'}
                          {booking.room_number?.trim() ? (
                            <span style={{ color: '#6B6B6B' }}>· Room {booking.room_number.trim()}</span>
                          ) : null}
                        </p>
                        <p>{booking.service?.name}</p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" style={{ color: '#6B6B6B' }} />
                          {stayLabel(booking.collection_date)} – {stayLabel(booking.departure_date)}
                        </p>
                        {booking.weight_kg != null ? (
                          <p className="flex items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5" style={{ color: '#6B6B6B' }} />
                            {booking.weight_kg} kg
                          </p>
                        ) : null}
                      </div>
                      {booking.additional_details?.trim() ? (
                        <p className="mt-2 rounded-md px-2 py-1.5 text-sm" style={{ backgroundColor: '#F8F6F3', color: '#2F2F2F' }}>
                          {booking.additional_details}
                        </p>
                      ) : null}
                      <DeliveryActions
                        booking={booking}
                        tone="light"
                        onChanged={(patch: DeliveryPatch) => {
                          setBookings((current) =>
                            current.map((row) => (row.id === patch.id ? { ...row, ...patch } : row))
                          )
                        }}
                      />
                    </article>
                  )
                })}
              </section>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
