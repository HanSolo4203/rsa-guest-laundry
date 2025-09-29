'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, User as UserIcon, Phone as PhoneIcon, ArrowRight as ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { bookingSchema, type BookingFormData } from '@/lib/schemas/booking'
import { createBooking } from '@/lib/supabase/services'
import { Service } from '@/lib/types/database'
import { calculatePrice, formatPrice } from '@/lib/pricing'

interface BookingFormProps {
  services: Service[]
}

// Default Date Picker Component
function DefaultDatePicker({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value?: string
  onChange: (value: string) => void
  placeholder: string
}) {
  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          min={todayString}
          className="w-full bg-transparent border-0 border-b border-white/30 text-white focus:border-white focus:outline-none py-3 sm:py-4 text-lg sm:text-xl rounded-none h-auto p-0 [color-scheme:dark]"
          placeholder={placeholder}
        />
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
        <CalendarIcon className="absolute right-0 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white pointer-events-none" />
      </div>
    </div>
  )
}

export function BookingForm({ services }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [weight, setWeight] = useState<number | undefined>(undefined)
  const [selectedService, setSelectedService] = useState<string>('')
  
  // Set default dates
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      service_id: '',
      collection_date: format(today, 'yyyy-MM-dd'),
      departure_date: format(tomorrow, 'yyyy-MM-dd'),
      additional_details: '',
    },
  })

  // Calculate price when weight or service changes
  const calculatedPrice = weight && selectedService ? calculatePrice(selectedService, weight) : 0

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    
    try {
      await createBooking(data)
      toast.success('Booking created successfully!')
      form.reset()
      setWeight(undefined) // Reset weight field
      setSelectedService('') // Reset selected service
      
      // Trigger a custom event to refresh the sidebar
      window.dispatchEvent(new CustomEvent('bookingAdded'))
    } catch (error) {
      toast.error('Failed to create booking. Please try again.')
      console.error('Booking error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6" onKeyDown={(e) => {
          // Prevent form submission on Enter key press in input fields
          if (e.key === 'Enter') {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
              e.preventDefault()
            }
          }
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Row 1: First Name | Last Name */}
            <div className="space-y-3 sm:space-y-5">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Name</FormLabel>
                    <FormControl>
                      <div className="relative hide-autofill-icons">
                        <UserIcon className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        <input
                          type="text"
                          placeholder=""
                          autoComplete="off"
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-2 sm:py-3 text-lg sm:text-xl pl-8 sm:pl-9"
                          {...field}
                        />
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
                      </div>
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 sm:space-y-5">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Last Name</FormLabel>
                    <FormControl>
                      <div className="relative hide-autofill-icons">
                        <UserIcon className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        <input
                          type="text"
                          placeholder=""
                          autoComplete="off"
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-2 sm:py-3 text-lg sm:text-xl pl-8 sm:pl-9"
                          {...field}
                        />
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
                      </div>
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Phone | Service Type */}
            <div className="space-y-3 sm:space-y-5">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Phone</FormLabel>
                    <FormControl>
                      <div className="relative hide-autofill-icons">
                        <PhoneIcon className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        <input
                          type="tel"
                          placeholder=""
                          autoComplete="off"
                          inputMode="tel"
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-2 sm:py-3 text-lg sm:text-xl pl-8 sm:pl-9"
                          {...field}
                        />
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
                      </div>
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 sm:space-y-5">
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Service Type</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <select
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white focus:border-white focus:outline-none py-2 sm:py-3 text-base sm:text-lg appearance-none cursor-pointer pr-8"
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e)
                            const service = services.find(s => s.id === e.target.value)
                            setSelectedService(service?.name || '')
                          }}
                        >
                          <option value="" className="bg-slate-900 text-white">Laundry Service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id} className="bg-slate-900 text-white">
                              {service.name} - {service.price}
                            </option>
                          ))}
                        </select>
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Collection Date | Departure Date */}
            <div className="space-y-3 sm:space-y-5">
              <FormField
                control={form.control}
                name="collection_date"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Collection Date</FormLabel>
                    <FormControl>
                      <DefaultDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select collection date"
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 sm:space-y-5">
              <FormField
                control={form.control}
                name="departure_date"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Departure Date</FormLabel>
                    <FormControl>
                      <DefaultDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select departure date"
                      />
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Weight Input Field - Full Width */}
          <div className="pt-2 sm:pt-3">
            <div className="min-h-[72px] sm:min-h-[84px]">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-white text-base sm:text-lg font-normal block mb-2">Weight (kg)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="0.0"
                      value={weight || ''}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || undefined)}
                      className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-white/60 focus:border-white focus:outline-none py-2 sm:py-3 text-lg sm:text-xl"
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    Enter the estimated weight of your laundry
                  </p>
                </div>
                {weight && weight > 0 && selectedService && calculatedPrice > 0 && (
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-green-900/30 border border-green-700 rounded text-sm min-w-[200px]">
                      <p className="text-green-300 font-semibold">
                        {formatPrice(calculatedPrice)}
                      </p>
                      <p className="text-green-200/80 text-xs mt-1">
                        Based on {weight}kg
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-2 sm:pt-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] md:items-start gap-2.5 sm:gap-3.5">
              <FormField
                control={form.control}
                name="additional_details"
                render={({ field }) => (
                  <FormItem className="min-h-[72px] sm:min-h-[84px] md:mb-0">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Additional Details</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <textarea
                          placeholder="Any special requests or notes"
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-white/60 focus:border-white focus:outline-none py-2 sm:py-3 text-lg sm:text-xl min-h-[72px] overflow-hidden resize-none"
                          rows={2}
                          onInput={(e) => {
                            const el = e.currentTarget
                            el.style.height = 'auto'
                            el.style.height = `${el.scrollHeight}px`
                          }}
                          {...field}
                        />
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
                      </div>
                    </FormControl>
                    <div className="min-h-[20px]">
                      <FormMessage className="text-red-400" />
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex md:self-start">
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 sm:px-7 py-4 sm:py-5 rounded-none text-sm sm:text-base w-full md:w-full md:h-16 btn-arrow-right"
                  disabled={isSubmitting}
                >
                  <span className="inline-flex items-center justify-center gap-2 w-full">
                    <span>{isSubmitting ? 'Creating Booking...' : 'Submit Request'}</span>
                    <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white/90" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
