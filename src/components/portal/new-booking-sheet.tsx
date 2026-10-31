'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { portalFont } from '@/components/portal/font'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/contexts/auth-context'
import { guestName, openBookingForRoom, portalOnPrimary, portalPrimary } from '@/lib/portal/board'
import { portalBookingSchema, type PortalBookingFormData } from '@/lib/schemas/booking'
import { createClient } from '@/lib/supabase/client'
import type { PortalBooking } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type ServiceChoice = { id: string; name: string }
type SubmitIntent = 'close' | 'another'

function todayString() {
  return format(new Date(), 'yyyy-MM-dd')
}

function tomorrowString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return format(tomorrow, 'yyyy-MM-dd')
}

function serviceMemoryKey(propertyId: string) {
  return `portal-booking-service:${propertyId}`
}

function rememberedService(propertyId: string): string {
  try {
    return sessionStorage.getItem(serviceMemoryKey(propertyId)) ?? ''
  } catch {
    return ''
  }
}

function rememberService(propertyId: string, serviceId: string) {
  try {
    sessionStorage.setItem(serviceMemoryKey(propertyId), serviceId)
  } catch {
    // Private mode can reject storage. The in-memory form value still holds the service.
  }
}

function useWideLayout() {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setWide(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return wide
}

function readService(value: unknown): ServiceChoice | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const record = row as { id?: unknown; name?: unknown }
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null
  const name = record.name.trim()
  if (!name) return null
  return { id: record.id, name }
}

function rpcMessage(error: { message: string }, fallback: string): string {
  const message = error.message.replace(/^ERROR:\s*/i, '').trim()
  return message || fallback
}

function blankValues(propertyId: string, keep?: Pick<PortalBookingFormData, 'service_id' | 'collection_date' | 'departure_date'>): PortalBookingFormData {
  return {
    room_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    service_id: keep?.service_id || rememberedService(propertyId),
    collection_date: keep?.collection_date || todayString(),
    departure_date: keep?.departure_date || tomorrowString(),
    additional_details: '',
  }
}

export function NewBookingSheet({
  open,
  onOpenChange,
  propertyId,
  primaryColor,
  bookings,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  primaryColor: string | null
  bookings: PortalBooking[]
  onCreated: (booking: PortalBooking) => void
}) {
  const wide = useWideLayout()
  const primary = portalPrimary(primaryColor)
  const panel = (
    <NewBookingForm
      open={open}
      wide={wide}
      propertyId={propertyId}
      primary={primary}
      bookings={bookings}
      onCreated={onCreated}
      onClose={() => onOpenChange(false)}
    />
  )
  const frameStyle = { '--portal-primary': primary } as CSSProperties

  if (wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn('portal w-full gap-0 overflow-hidden bg-white p-0 text-slate-900 sm:max-w-md', portalFont.className)}
          style={frameStyle}
        >
          {panel}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom" repositionInputs={false}>
      <DrawerContent
        className={cn('portal max-h-[96dvh] bg-white p-0 text-slate-900', portalFont.className)}
        style={frameStyle}
      >
        {panel}
      </DrawerContent>
    </Drawer>
  )
}

function NewBookingForm({
  open,
  wide,
  propertyId,
  primary,
  bookings,
  onCreated,
  onClose,
}: {
  open: boolean
  wide: boolean
  propertyId: string
  primary: string
  bookings: PortalBooking[]
  onCreated: (booking: PortalBooking) => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const roomRef = useRef<HTMLInputElement>(null)
  const wasOpen = useRef(false)
  const intentRef = useRef<SubmitIntent>('close')
  const savingRef = useRef(false)
  const [services, setServices] = useState<ServiceChoice[]>([])
  const [servicesStatus, setServicesStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pending, setPending] = useState<SubmitIntent | null>(null)
  const [allowedRoom, setAllowedRoom] = useState<string | null>(null)
  const onPrimary = portalOnPrimary(primary)

  const form = useForm<PortalBookingFormData>({
    resolver: zodResolver(portalBookingSchema),
    defaultValues: blankValues(propertyId),
  })

  const roomNumber = form.watch('room_number')
  const duplicate = openBookingForRoom(bookings, roomNumber)
  const roomKey = roomNumber.trim().toLowerCase()

  useEffect(() => {
    if (open && !wasOpen.current) {
      form.reset(blankValues(propertyId))
      setAllowedRoom(null)
      setPending(null)
      intentRef.current = 'close'
    }
    wasOpen.current = open
  }, [open, propertyId, form])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => roomRef.current?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [open, wide])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setServicesStatus('loading')
    const supabase = createClient('portal')
    void supabase
      .from('property_services')
      .select('services(id, name)')
      .eq('property_id', propertyId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error(error)
          setServicesStatus('error')
          setServices([])
          return
        }
        const rows = (data ?? [])
          .map((row) => readService((row as { services?: unknown }).services))
          .filter((service): service is ServiceChoice => service != null)
          .sort((a, b) => a.name.localeCompare(b.name))
        setServices(rows)
        setServicesStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [open, propertyId])

  useEffect(() => {
    if (services.length === 0) return
    const current = form.getValues('service_id')
    if (current && services.some((service) => service.id === current)) return
    const remembered = rememberedService(propertyId)
    const next = services.some((service) => service.id === remembered)
      ? remembered
      : services.length === 1
        ? services[0]?.id ?? ''
        : ''
    if (next) form.setValue('service_id', next)
  }, [services, propertyId, form])

  async function persist(values: PortalBookingFormData, intent: SubmitIntent) {
    if (savingRef.current) return
    const service = services.find((item) => item.id === values.service_id)
    if (!service) {
      form.setError('service_id', { message: 'Select a service' })
      return
    }

    savingRef.current = true
    setPending(intent)
    try {
      const supabase = createClient('portal')
      const phone = values.phone.trim()
      const notes = values.additional_details.trim()
      const { data, error } = await supabase.rpc('portal_create_booking', {
        p_property_id: propertyId,
        p_first_name: values.first_name.trim(),
        p_last_name: values.last_name.trim(),
        p_room_number: values.room_number.trim(),
        p_phone: phone || null,
        p_service_id: values.service_id,
        p_collection_date: values.collection_date,
        p_departure_date: values.departure_date,
        p_additional_details: notes || null,
      })
      if (error) throw new Error(rpcMessage(error, 'Could not create booking'))
      if (typeof data !== 'string') throw new Error('Could not create booking')

      rememberService(propertyId, values.service_id)
      const room = values.room_number.trim()
      onCreated({
        id: data,
        property_id: propertyId,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: phone || null,
        room_number: room,
        service_id: service.id,
        service_name: service.name,
        collection_date: values.collection_date,
        departure_date: values.departure_date,
        status: 'pending',
        stage: 'to_weigh',
        total_price: null,
        payment_method: null,
        weight_kg: null,
        machine_number: null,
        dryer_number: null,
        additional_details: notes || null,
        created_at: new Date().toISOString(),
        completed_at: null,
        weighed_at: null,
        washing_at: null,
        drying_at: null,
        finishing_at: null,
        ready_at: null,
        out_for_delivery_at: null,
        delivered_at: null,
        received_at: null,
        source: 'portal',
        created_by: user?.id ?? null,
        payment_status: 'pay_on_delivery',
      })
      toast.success(`Booking created: Room ${room}`)
      setAllowedRoom(null)

      if (intent === 'another') {
        form.reset(
          blankValues(propertyId, {
            service_id: values.service_id,
            collection_date: values.collection_date,
            departure_date: values.departure_date,
          })
        )
        window.setTimeout(() => roomRef.current?.focus(), 30)
        return
      }
      onClose()
    } catch (createError) {
      console.error(createError)
      toast.error(createError instanceof Error ? createError.message : 'Could not create booking')
    } finally {
      savingRef.current = false
      setPending(null)
    }
  }

  function onValid(values: PortalBookingFormData) {
    if (duplicate && allowedRoom !== roomKey) {
      toast.message('This room already has an open booking', {
        description: 'Choose Create anyway to book it.',
      })
      return
    }
    void persist(values, intentRef.current)
  }

  function createAnyway() {
    setAllowedRoom(roomKey)
    void form.handleSubmit((values) => {
      void persist(values, intentRef.current)
    })()
  }

  const title = wide ? (
    <SheetHeader className="gap-1 p-0 pr-8 text-left">
      <SheetTitle className="text-xl text-slate-950">New booking</SheetTitle>
      <SheetDescription className="text-slate-500">Book laundry for a guest at the desk.</SheetDescription>
    </SheetHeader>
  ) : (
    <DrawerHeader className="gap-1 p-0 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
      <DrawerTitle className="text-xl text-slate-950">New booking</DrawerTitle>
      <DrawerDescription className="text-slate-500">Book laundry for a guest at the desk.</DrawerDescription>
    </DrawerHeader>
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="flex max-h-[96dvh] min-h-0 flex-col"
      >
        <div className="overflow-y-auto px-5 pt-3 pb-4">
          {title}
          <div className="mt-5 grid gap-4">
            <FormField
              control={form.control}
              name="room_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Room number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={(node) => {
                        field.ref(node)
                        roomRef.current = node
                      }}
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      enterKeyHint="next"
                      placeholder="12"
                      className="h-12 rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none"
                    />
                  </FormControl>
                  <FormMessage />
                  {duplicate ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950" role="status">
                      <p>
                        Room {duplicate.room_number?.trim() || roomNumber.trim()} already has an open booking
                        {guestName(duplicate) !== 'Guest' ? ` for ${guestName(duplicate)}` : ''}.
                      </p>
                      <button
                        type="button"
                        onClick={createAnyway}
                        disabled={pending != null}
                        className="mt-2 inline-flex min-h-11 cursor-pointer items-center font-semibold text-amber-950 underline disabled:cursor-wait"
                      >
                        Create anyway
                      </button>
                    </div>
                  ) : null}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">First name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        className="h-12 rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel optional>Last name</FieldLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        className="h-12 rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>Phone</FieldLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="082 123 4567"
                      enterKeyHint="next"
                      className="h-12 rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none"
                    />
                  </FormControl>
                  <FormDescription>South African or international, for example 082 123 4567 or +27 82 123 4567.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Service</FormLabel>
                  {servicesStatus === 'error' ? (
                    <p className="text-sm text-red-600">Could not load services</p>
                  ) : servicesStatus === 'loading' ? (
                    <p className="text-sm text-slate-500">Loading services…</p>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-slate-500">No services are offered at this property yet.</p>
                  ) : (
                    <div role="radiogroup" aria-label="Service" className="grid grid-cols-1 gap-2">
                      {services.map((service) => {
                        const selected = field.value === service.id
                        return (
                          <button
                            key={service.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(service.id)}
                            className="min-h-14 cursor-pointer rounded-xl border px-4 text-left text-base font-semibold text-slate-900"
                            style={
                              selected
                                ? { borderColor: primary, backgroundColor: primary, color: onPrimary }
                                : { borderColor: '#e2e8f0', backgroundColor: '#fff' }
                            }
                          >
                            {service.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="collection_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Collection date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        min={todayString()}
                        onChange={(event) => {
                          field.onChange(event.target.value)
                          const departure = form.getValues('departure_date')
                          if (departure && event.target.value && departure < event.target.value) {
                            form.setValue('departure_date', event.target.value, { shouldValidate: true })
                          }
                        }}
                        className="h-12 rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="departure_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Departure date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        min={form.watch('collection_date') || todayString()}
                        className="h-12 rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="additional_details"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>Notes</FieldLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-2">
          <button
            type="submit"
            disabled={pending != null}
            onClick={() => {
              intentRef.current = 'close'
            }}
            className="order-1 flex min-h-12 cursor-pointer items-center justify-center rounded-xl text-base font-semibold disabled:cursor-wait disabled:opacity-70 sm:order-2"
            style={{ backgroundColor: primary, color: onPrimary }}
          >
            {pending === 'close' ? 'Saving…' : 'Create booking'}
          </button>
          <button
            type="submit"
            disabled={pending != null}
            onClick={() => {
              intentRef.current = 'another'
            }}
            className="order-2 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-900 disabled:cursor-wait disabled:opacity-70 sm:order-1"
          >
            {pending === 'another' ? 'Saving…' : 'Save & add another'}
          </button>
        </div>
      </form>
    </Form>
  )
}

function FieldLabel({ children, optional = false }: { children: ReactNode; optional?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <FormLabel className="text-slate-700">{children}</FormLabel>
      {optional ? <span className="text-xs text-slate-400">Optional</span> : null}
    </div>
  )
}
