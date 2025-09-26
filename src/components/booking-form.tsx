'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { bookingSchema, type BookingFormData } from '@/lib/schemas/booking'
import { createBooking } from '@/lib/supabase/services'
import { Service } from '@/lib/types/database'

interface BookingFormProps {
  services: Service[]
}

// Custom Calendar Component using react-day-picker
function CustomCalendarPicker({ 
  selected, 
  onSelect, 
  placeholder 
}: { 
  selected?: Date
  onSelect: (date: Date | undefined) => void
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Get today's date at midnight for comparison
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleDateSelect = (date: Date | undefined) => {
    // Prevent selection of past dates
    if (date && date < today) {
      return
    }
    console.log('Date selected:', date)
    onSelect(date)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-start text-left font-normal bg-transparent border-0 border-b border-white/30 text-white hover:bg-transparent hover:text-white focus:border-white focus:outline-none py-3 sm:py-4 text-lg sm:text-xl rounded-none h-auto p-0"
        >
          <CalendarIcon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" />
          {selected ? format(selected, "dd/MM/yyyy") : placeholder}
        </Button>
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/30"></div>
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <>
          <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 w-72 sm:w-80">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleDateSelect}
              disabled={(date) => date < today}
              className="bg-gray-800 text-white p-4"
              classNames={{
                root: "bg-gray-800",
                months: "bg-gray-800",
                month: "bg-gray-800",
                caption: "bg-gray-800 flex justify-center pt-1 relative items-center",
                caption_label: "text-white text-sm font-medium",
                nav: "flex items-center",
                nav_button: "bg-gray-700 hover:bg-gray-600 text-white rounded-md p-1",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse mt-4",
                head_row: "flex",
                head_cell: "text-gray-400 text-sm font-normal w-8 flex-1",
                row: "flex w-full mt-2",
                cell: "text-white text-sm p-0 relative w-8 h-8 flex items-center justify-center",
                day: "w-8 h-8 p-0 text-sm hover:bg-gray-700 rounded-md transition-colors cursor-pointer",
                day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                day_today: "bg-gray-600 text-white font-semibold",
                day_outside: "text-gray-500 opacity-50",
                day_disabled: "text-gray-600 opacity-50 cursor-not-allowed hover:bg-transparent",
                day_hidden: "invisible",
              }}
              components={{
                Chevron: ({ orientation, ...props }) => {
                  if (orientation === 'left') {
                    return <ChevronLeft className="h-4 w-4" {...props} />
                  }
                  return <ChevronRight className="h-4 w-4" {...props} />
                },
              }}
            />
          </div>
          
          {/* Overlay to close calendar */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
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
                      <CustomCalendarPicker
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
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
                      <CustomCalendarPicker
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
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
