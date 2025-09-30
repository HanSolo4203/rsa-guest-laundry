'use client'

import { ArrowRight as ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Service } from '@/lib/types/database'
import { formatPrice } from '@/lib/pricing'
import { useHomePage } from '@/hooks/useHomePage'
import { useThemeStyles } from '@/components/ThemeProvider'

type BookingFormVariant = 'default' | 'modern' | 'minimal'

interface BookingFormProps {
  services: Service[]
  variant?: BookingFormVariant
}

// Default Date Picker Component
function DefaultDatePicker({ 
  value, 
  onChange, 
  placeholder,
  variant = 'default'
}: { 
  value?: string
  onChange: (value: string) => void
  placeholder: string
  variant?: BookingFormVariant
}) {
  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'modern':
        return {
          inputClass: "w-full bg-slate-800/50 border border-slate-600 text-white focus:border-blue-500 focus:outline-none py-3 sm:py-4 text-lg sm:text-xl rounded-lg h-auto px-4 [color-scheme:dark] focus:ring-2 focus:ring-blue-500/20",
          bottomBorder: "hidden",
          iconClass: "absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 pointer-events-none"
        }
      case 'minimal':
        return {
          inputClass: "w-full bg-transparent border-0 border-b border-gray-300 text-gray-900 focus:outline-none py-3 sm:py-4 text-base sm:text-lg rounded-none h-auto p-0 [color-scheme:light] transition-colors duration-200",
          bottomBorder: "hidden",
          iconClass: "absolute right-0 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500 pointer-events-none"
        }
      default:
        return {
          inputClass: "w-full bg-transparent border-0 border-b border-white/30 text-white focus:border-white focus:outline-none py-3 sm:py-4 px-3 sm:px-4 text-lg sm:text-xl rounded-lg h-auto [color-scheme:dark]",
          bottomBorder: "absolute bottom-0 left-0 w-full h-[2px] bg-white/30",
          iconClass: "absolute right-0 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white pointer-events-none"
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          min={todayString}
          className={styles.inputClass}
          placeholder={placeholder}
          style={{
            backgroundColor: '#6B2F2F',
            color: 'white'
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#8B4A4A'
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = '#6B2F2F'
          }}
        />
        {styles.bottomBorder && <div className={styles.bottomBorder}></div>}
      </div>
    </div>
  )
}

export function BookingForm({ services, variant = 'default' }: BookingFormProps) {
  const {
    bookingForm,
    isSubmittingBooking,
    weight,
    setWeight,
    selectedService,
    setSelectedService,
    calculatedPrice,
    onSubmitBooking,
    theme,
  } = useHomePage()
  
  const themeStyles = useThemeStyles(theme)

  // Variant-specific styling for form
  const getFormVariantStyles = () => {
    switch (variant) {
      case 'modern':
        return {
          containerClass: "w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8",
          formClass: "space-y-3 sm:space-y-4",
          gridClass: "grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6",
          fieldClass: "min-h-[60px] sm:min-h-[68px]",
          labelClass: "text-white text-base sm:text-lg font-normal",
          inputClass: "w-full bg-slate-800/50 border border-slate-600 text-white placeholder-transparent focus:border-blue-500 focus:outline-none py-2 sm:py-3 text-lg sm:text-xl focus:ring-2 focus:ring-blue-500/20",
          iconClass: "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400",
          bottomBorderClass: "absolute bottom-0 left-0 w-full h-[2px] bg-slate-600",
          selectClass: "w-full bg-slate-800/50 border border-slate-600 text-white focus:border-blue-500 focus:outline-none py-2 sm:py-3 text-base sm:text-lg appearance-none cursor-pointer pr-8 focus:ring-2 focus:ring-blue-500/20",
          buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-6 sm:px-7 py-6 sm:py-7 rounded-xl text-sm sm:text-base w-full md:w-full md:h-20",
          weightInputClass: "w-full bg-slate-800/50 border border-slate-600 text-white placeholder-white/60 focus:border-blue-500 focus:outline-none py-2 sm:py-3 text-lg sm:text-xl focus:ring-2 focus:ring-blue-500/20",
          textareaClass: "w-full bg-slate-800/50 border border-slate-600 text-white placeholder-white/60 focus:border-blue-500 focus:outline-none py-2 sm:py-3 text-lg sm:text-xl min-h-[72px] overflow-hidden resize-none focus:ring-2 focus:ring-blue-500/20"
        }
      case 'minimal':
        return {
          containerClass: "w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8",
          formClass: "space-y-4 sm:space-y-6",
          gridClass: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
          fieldClass: "min-h-[50px] sm:min-h-[60px]",
          labelClass: "text-sm sm:text-base font-medium mb-3",
          inputClass: "w-full border-0 text-white placeholder-white/70 focus:outline-none py-4 sm:py-5 text-base sm:text-lg px-4 sm:px-5 transition-colors duration-200 rounded-none",
          iconClass: "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white/70",
          bottomBorderClass: "hidden",
          selectClass: "w-full border-0 text-white focus:outline-none py-4 sm:py-5 text-sm sm:text-base appearance-none cursor-pointer px-4 sm:px-5 transition-colors duration-200 rounded-none",
          buttonClass: "text-sm sm:text-base w-full md:w-auto transition-all duration-200 flex items-center justify-center gap-2 border-2 px-8 py-6 rounded-xl",
          weightInputClass: "w-full border-0 text-white placeholder-white/70 focus:outline-none py-4 sm:py-5 text-base sm:text-lg px-4 sm:px-5 transition-colors duration-200 rounded-none",
          textareaClass: "w-full border-0 text-white placeholder-white/70 focus:outline-none py-4 sm:py-5 text-base sm:text-lg min-h-[80px] overflow-hidden resize-none transition-colors duration-200 px-4 sm:px-5 rounded-none"
        }
      default:
        return {
          containerClass: "w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8",
          formClass: "space-y-3 sm:space-y-4",
          gridClass: "grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6",
          fieldClass: "min-h-[60px] sm:min-h-[68px]",
          labelClass: "text-white text-base sm:text-lg font-normal",
          inputClass: "w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-transparent focus:border-white focus:outline-none py-1 sm:py-2 px-3 sm:px-4 text-base sm:text-lg rounded-lg",
          iconClass: "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white",
          bottomBorderClass: "absolute bottom-0 left-0 w-full h-[2px] bg-white/30",
          selectClass: "w-full bg-transparent border-0 border-b border-white/30 text-white focus:border-white focus:outline-none py-1 sm:py-2 px-3 sm:px-4 text-base sm:text-lg appearance-none cursor-pointer pr-8 rounded-lg",
          buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-6 sm:px-7 py-6 sm:py-7 rounded-xl text-sm sm:text-base w-full md:w-full btn-arrow-right",
          weightInputClass: "w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-white/60 focus:border-white focus:outline-none py-1 sm:py-2 px-3 sm:px-4 text-base sm:text-lg rounded-lg",
          textareaClass: "w-full bg-transparent border-0 border-b border-white/30 text-white placeholder-white/60 focus:border-white focus:outline-none py-1 sm:py-2 px-3 sm:px-4 text-base sm:text-lg min-h-[60px] overflow-hidden resize-none rounded-lg"
        }
    }
  }

  const formStyles = getFormVariantStyles()

  return (
    <div className={formStyles.containerClass}>
      <div 
        className="rounded-3xl shadow-2xl backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(248, 246, 243, 0.65)',
          boxShadow: '0 25px 50px rgba(107, 47, 47, 0.15)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
      >
        {/* Elegant Title */}
        <div className="text-center mb-4 sm:mb-6 px-8 sm:px-12 md:px-16 pt-4 sm:pt-6 md:pt-8">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-serif italic font-bold mb-3"
            style={{ color: '#6B2F2F' }}
          >
            Book Guest Laundry Service
          </h2>
        </div>

        <div className="px-8 sm:px-12 md:px-16 pb-4 sm:pb-6 md:pb-8">
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit(onSubmitBooking)} className={formStyles.formClass} onKeyDown={(e) => {
              // Prevent form submission on Enter key press in input fields
              if (e.key === 'Enter') {
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                  e.preventDefault()
                }
              }
            }}>
          <div className={formStyles.gridClass}>
            {/* Row 1: First Name | Last Name */}
            <FormField
              control={bookingForm.control}
              name="first_name"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Name (required)</FormLabel>
                  <FormControl>
                    <div className="relative hide-autofill-icons">
                      <input
                        type="text"
                        placeholder=""
                        autoComplete="off"
                        className={formStyles.inputClass}
                        style={{
                          backgroundColor: '#6B2F2F',
                          color: 'white'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = '#8B4A4A'
                        }}
                        onBlur={(e) => {
                          field.onBlur()
                          e.target.style.backgroundColor = '#6B2F2F'
                        }}
                        value={field.value}
                        onChange={field.onChange}
                        name={field.name}
                        ref={field.ref}
                      />
                      {formStyles.bottomBorderClass !== "hidden" && <div className={formStyles.bottomBorderClass}></div>}
                    </div>
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={bookingForm.control}
              name="last_name"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Last Name</FormLabel>
                  <FormControl>
                    <div className="relative hide-autofill-icons">
                      <input
                        type="text"
                        placeholder=""
                        autoComplete="off"
                        className={formStyles.inputClass}
                        style={{
                          backgroundColor: '#6B2F2F',
                          color: 'white'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = '#8B4A4A'
                        }}
                        onBlur={(e) => {
                          field.onBlur()
                          e.target.style.backgroundColor = '#6B2F2F'
                        }}
                        value={field.value}
                        onChange={field.onChange}
                        name={field.name}
                        ref={field.ref}
                      />
                      {formStyles.bottomBorderClass !== "hidden" && <div className={formStyles.bottomBorderClass}></div>}
                    </div>
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />

            {/* Row 2: Phone | Service Type */}
            <FormField
              control={bookingForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Phone (required)</FormLabel>
                  <FormControl>
                    <div className="relative hide-autofill-icons">
                      <input
                        type="tel"
                        placeholder=""
                        autoComplete="off"
                        inputMode="tel"
                        className={formStyles.inputClass}
                        style={{
                          backgroundColor: '#6B2F2F',
                          color: 'white'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = '#8B4A4A'
                        }}
                        onBlur={(e) => {
                          field.onBlur()
                          e.target.style.backgroundColor = '#6B2F2F'
                        }}
                        value={field.value}
                        onChange={field.onChange}
                        name={field.name}
                        ref={field.ref}
                      />
                      {formStyles.bottomBorderClass !== "hidden" && <div className={formStyles.bottomBorderClass}></div>}
                    </div>
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={bookingForm.control}
              name="service_id"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Service Type</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <select
                        className={formStyles.selectClass}
                        style={{
                          backgroundColor: '#6B2F2F',
                          color: 'white'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = '#8B4A4A'
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = '#6B2F2F'
                        }}
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e)
                          const service = services.find(s => s.id === e.target.value)
                          setSelectedService(service?.name || '')
                        }}
                      >
                        <option value="" style={{ backgroundColor: '#6B2F2F', color: 'white' }}>Laundry Service</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id} style={{ backgroundColor: '#6B2F2F', color: 'white' }}>
                            {service.name} - {service.price}
                          </option>
                        ))}
                      </select>
                      {formStyles.bottomBorderClass !== "hidden" && <div className={formStyles.bottomBorderClass}></div>}
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Row 3: Collection Date | Departure Date */}
            <FormField
              control={bookingForm.control}
              name="collection_date"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Collection Date</FormLabel>
                  <FormControl>
                    <DefaultDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select collection date"
                      variant={variant}
                    />
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={bookingForm.control}
              name="departure_date"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Departure Date</FormLabel>
                  <FormControl>
                    <DefaultDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select departure date"
                      variant={variant}
                    />
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Weight Input Field - Full Width */}
          <div className="pt-2 sm:pt-3">
            <div className={formStyles.fieldClass}>
              <label className={`${formStyles.labelClass} block mb-2`} style={{ color: '#6B2F2F' }}>Weight (kg)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="0.0"
                  value={weight || ''}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || undefined)}
                  className={formStyles.weightInputClass}
                  style={{
                    backgroundColor: '#6B2F2F',
                    color: 'white'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = '#8B4A4A'
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#6B2F2F'
                  }}
                />
                {formStyles.bottomBorderClass !== "hidden" && <div className={formStyles.bottomBorderClass}></div>}
              </div>
              <p className="text-xs mt-1" style={{ color: '#6B2F2F' }}>
                Enter the estimated weight of your laundry
              </p>
            </div>
          </div>

          {/* Additional Details - Full Width */}
          <div className="pt-2 sm:pt-3">
            <FormField
              control={bookingForm.control}
              name="additional_details"
              render={({ field }) => (
                <FormItem className={formStyles.fieldClass}>
                  <FormLabel className={formStyles.labelClass} style={{ color: '#6B2F2F' }}>Additional Details</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <textarea
                        placeholder="Any special requests or notes"
                        className={formStyles.textareaClass}
                        rows={2}
                        style={{
                          backgroundColor: '#6B2F2F',
                          color: 'white'
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = '#8B4A4A'
                        }}
                        onBlur={(e) => {
                          field.onBlur()
                          e.target.style.backgroundColor = '#6B2F2F'
                        }}
                        onInput={(e) => {
                          const el = e.currentTarget
                          el.style.height = 'auto'
                          el.style.height = `${el.scrollHeight}px`
                        }}
                        value={field.value}
                        onChange={field.onChange}
                        name={field.name}
                        ref={field.ref}
                      />
                      {formStyles.bottomBorderClass !== "hidden" && <div className={formStyles.bottomBorderClass}></div>}
                    </div>
                  </FormControl>
                  <div className="min-h-[20px]">
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Submit Button - Full Width */}
          <div className="pt-2 sm:pt-3">
            <Button 
              type="submit" 
              className={`${formStyles.buttonClass} w-full`}
              disabled={isSubmittingBooking}
              style={{
                backgroundColor: 'white',
                borderColor: 'transparent',
                color: '#6B2F2F',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F29F05'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#6B2F2F'
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <span className="inline-flex items-center justify-center gap-2" style={{ color: 'inherit' }}>
                <span>{isSubmittingBooking ? 'Creating Booking...' : 'Submit Request'}</span>
                <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'inherit' }} />
              </span>
            </Button>
          </div>
        </form>
      </Form>
        </div>
      </div>
    </div>
  )
}
