'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { bookingSchema, type BookingFormData } from '@/lib/schemas/booking'
import { createBooking } from '@/lib/supabase/services'
import type { Property, Service } from '@/lib/types/database'

interface BookingFormProps {
  property: Property
  services: Service[]
}

function safeAssetUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed.href
  } catch {
    return null
  }
}

function todayString() {
  return format(new Date(), 'yyyy-MM-dd')
}

function tomorrowString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return format(tomorrow, 'yyyy-MM-dd')
}

function FieldLabel({ children, optional = false }: { children: string; optional?: boolean }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <FormLabel className="guest-label text-sm font-medium">{children}</FormLabel>
      {optional ? <span className="guest-hint text-xs">Optional</span> : null}
    </div>
  )
}

export function BookingForm({ property, services }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      room_number: '',
      service_id: '',
      collection_date: todayString(),
      departure_date: tomorrowString(),
      additional_details: '',
    },
  })

  const collectionDate = form.watch('collection_date')
  const logoUrl = safeAssetUrl(property.logo_url)
  const backgroundUrl = safeAssetUrl(property.background_url)
  const showImage = property.background_type === 'image' && Boolean(backgroundUrl)
  const showVideo = property.background_type === 'video' && Boolean(backgroundUrl)
  const showLogo = Boolean(logoUrl) && !logoFailed

  async function onSubmit(data: BookingFormData) {
    setIsSubmitting(true)
    try {
      await createBooking({
        ...data,
        property_id: property.id,
        room_number: property.ask_room_number ? data.room_number : '',
      })
      setSubmittedName(data.first_name.trim())
      form.reset({
        first_name: '',
        last_name: '',
        phone: '',
        room_number: '',
        service_id: '',
        collection_date: todayString(),
        departure_date: tomorrowString(),
        additional_details: '',
      })
      toast.success('Request sent')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error('Could not send your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="guest-booking relative min-h-dvh overflow-x-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        {showVideo ? (
          <video
            className="h-full w-full object-cover"
            src={backgroundUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : null}
        {showImage ? (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: backgroundUrl ? `url(${JSON.stringify(backgroundUrl)})` : undefined }}
          />
        ) : null}
        {showImage || showVideo ? <div className="guest-scrim absolute inset-0" /> : null}
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="pt-4 text-center">
          {showLogo ? (
            // Property logos are uploaded assets of unknown size. A plain img keeps any public URL working.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl ?? undefined}
              alt={property.name}
              className="mx-auto mb-4 h-16 w-auto max-w-[70%] object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <p className="mb-2 text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
              {property.name}
            </p>
          )}
          <h1 className="text-2xl font-semibold leading-tight tracking-tight" style={{ color: 'var(--brand-primary)' }}>
            {property.heading}
          </h1>
          {property.welcome_message ? (
            <p className="guest-hint mx-auto mt-2 max-w-sm whitespace-pre-line text-base leading-relaxed">
              {property.welcome_message}
            </p>
          ) : null}
        </header>

        <div className="guest-card mt-6 rounded-2xl p-5 shadow-lg">
          {submittedName ? (
            <div className="py-6 text-center">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--brand-primary)' }}>
                Request sent
              </h2>
              <p className="mt-2 text-base leading-relaxed">
                Thanks, {submittedName}. We have your laundry request.
              </p>
              <button
                type="button"
                className="guest-submit mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-medium"
                onClick={() => setSubmittedName(null)}
              >
                Book another
              </button>
            </div>
          ) : services.length === 0 ? (
            <p className="py-6 text-center text-base leading-relaxed">
              Laundry booking isn&apos;t available right now. Please ask reception.
            </p>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>First name</FieldLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            autoComplete="given-name"
                            enterKeyHint="next"
                            className="guest-field"
                          />
                        </FormControl>
                        <FormMessage className="guest-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>Last name</FieldLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            autoComplete="family-name"
                            enterKeyHint="next"
                            className="guest-field"
                          />
                        </FormControl>
                        <FormMessage className="guest-error" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={`grid grid-cols-1 gap-4 ${property.ask_room_number ? 'sm:grid-cols-2' : ''}`}>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>Phone</FieldLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            enterKeyHint="next"
                            className="guest-field"
                          />
                        </FormControl>
                        <FormMessage className="guest-error" />
                      </FormItem>
                    )}
                  />
                  {property.ask_room_number ? (
                    <FormField
                      control={form.control}
                      name="room_number"
                      render={({ field }) => (
                        <FormItem>
                          <FieldLabel optional>Room number</FieldLabel>
                          <FormControl>
                            <input
                              {...field}
                              type="text"
                              inputMode="text"
                              autoComplete="off"
                              maxLength={40}
                              enterKeyHint="next"
                              className="guest-field"
                            />
                          </FormControl>
                          <FormMessage className="guest-error" />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>

                <FormField
                  control={form.control}
                  name="service_id"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel>Service</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <select {...field} className="guest-field appearance-none pr-10">
                            <option value="">Select a service</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} · {service.price}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                            aria-hidden="true"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="guest-error" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="collection_date"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>Collection date</FieldLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="date"
                            min={todayString()}
                            className="guest-field"
                          />
                        </FormControl>
                        <FormMessage className="guest-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="departure_date"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>Departure date</FieldLabel>
                        <FormControl>
                          <input
                            {...field}
                            type="date"
                            min={collectionDate || todayString()}
                            className="guest-field"
                          />
                        </FormControl>
                        <FormMessage className="guest-error" />
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
                          className="guest-field min-h-24 resize-y"
                        />
                      </FormControl>
                      <FormMessage className="guest-error" />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  className="guest-submit inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-medium disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? 'Sending…' : 'Submit request'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </Form>
          )}
        </div>

        {property.contact_info ? (
          <p className="guest-hint mx-auto mt-4 max-w-sm whitespace-pre-line text-center text-sm leading-relaxed">
            {property.contact_info}
          </p>
        ) : null}
      </div>
    </section>
  )
}
