'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { bookingSchema, type BookingFormData } from '@/lib/schemas/booking'
import { createBooking } from '@/lib/supabase/services'
import { Service } from '@/lib/types/database'

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
    },
  })

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    
    try {
      await createBooking(data)
      toast.success('Booking created successfully!')
      form.reset()
    } catch (error) {
      toast.error('Failed to create booking. Please try again.')
      console.error('Booking error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8" onKeyDown={(e) => {
          // Prevent form submission on Enter key press in input fields
          if (e.key === 'Enter') {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
              e.preventDefault()
            }
          }
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem className="min-h-[80px] sm:min-h-[90px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder=""
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-3 sm:py-4 text-lg sm:text-xl"
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

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="min-h-[80px] sm:min-h-[90px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Phone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder=""
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-3 sm:py-4 text-lg sm:text-xl"
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

              <FormField
                control={form.control}
                name="collection_date"
                render={({ field }) => (
                  <FormItem className="min-h-[80px] sm:min-h-[90px]">
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

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem className="min-h-[80px] sm:min-h-[90px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Last Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder=""
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-3 sm:py-4 text-lg sm:text-xl"
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

              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem className="min-h-[80px] sm:min-h-[90px]">
                    <FormLabel className="text-white text-base sm:text-lg font-normal">Service Type</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <select
                          className="w-full bg-transparent border-0 border-b border-white/30 text-white focus:border-white focus:outline-none py-3 sm:py-4 text-lg sm:text-xl appearance-none cursor-pointer"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="" className="bg-slate-900 text-white">Laundry Service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id} className="bg-slate-900 text-white">
                              {service.name} - ${service.price}
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

              <FormField
                control={form.control}
                name="departure_date"
                render={({ field }) => (
                  <FormItem className="min-h-[80px] sm:min-h-[90px]">
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

          {/* Bottom Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 pt-6 sm:pt-8">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="privacy"
                className="mt-1 w-4 h-4 text-blue-600 bg-transparent border-white rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="privacy" className="text-white text-xs sm:text-sm leading-relaxed">
                My information will not be shared with outside parties.
              </label>
            </div>

            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 sm:px-8 py-3 sm:py-3 rounded-none text-sm sm:text-base w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Booking...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
