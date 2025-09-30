'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookingWithService } from '@/lib/types/database'
import { updateBookingStatus } from '@/lib/supabase/services'
import { calculatePrice, formatPrice } from '@/lib/pricing'
import { toast } from 'sonner'

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  total_price: z.number().min(0, 'Total price must be greater than or equal to 0').optional(),
  weight_kg: z.number().min(0.1, 'Weight must be greater than 0').optional(),
})

// Function to calculate price based on weight and service name using the new pricing structure
const calculatePriceFromWeight = (weightKg: number, serviceName: string): number => {
  return calculatePrice(serviceName, weightKg)
}

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>

interface BookingStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: BookingWithService | null
  onSuccess: () => void
}

const statusOptions = [
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function BookingStatusDialog({ open, onOpenChange, booking, onSuccess }: BookingStatusDialogProps) {
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      status: booking?.status || '',
      total_price: booking?.total_price || 0,
      weight_kg: booking?.weight_kg || 0,
    },
  })

  const selectedStatus = form.watch('status')
  const selectedWeight = form.watch('weight_kg')
  const showPriceField = selectedStatus === 'completed'
  const showWeightField = selectedStatus === 'processing'

  // Auto-calculate price when weight is entered for processing status
  useEffect(() => {
    if (selectedStatus === 'processing' && selectedWeight && selectedWeight > 0 && booking) {
      const calculatedPrice = calculatePriceFromWeight(selectedWeight, booking.service.name)
      form.setValue('total_price', calculatedPrice)
    }
  }, [selectedStatus, selectedWeight, booking, form])

  // Update form values when booking changes
  useEffect(() => {
    if (booking) {
      form.reset({
        status: booking.status,
        total_price: booking.total_price || 0,
        weight_kg: booking.weight_kg || 0,
      })
    }
  }, [booking, form])

  const onSubmit = async (data: StatusUpdateFormData) => {
    if (!booking) return

    try {
      setSubmitting(true)
      
      // Calculate price if status is processing and weight is provided
      let finalPrice = data.total_price
      if (data.status === 'processing' && data.weight_kg && data.weight_kg > 0) {
        finalPrice = calculatePriceFromWeight(data.weight_kg, booking.service.name)
      }
      
      await updateBookingStatus(
        booking.id,
        data.status,
        finalPrice,
        data.weight_kg
      )
      
      // Dispatch event to notify dashboard of update
      window.dispatchEvent(new Event('bookingUpdated'))
      
      toast.success('Booking status updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDialogClose = () => {
    form.reset()
    onOpenChange(false)
  }

  if (!booking) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 sm:mx-auto sm:max-w-[600px] md:max-w-[700px] max-h-[85vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-purple-500/30 shadow-2xl text-white">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            Update Booking Status
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-base">
            Update the status for <span className="font-semibold text-white">{booking.first_name} {booking.last_name}</span>&apos;s booking
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
              <h4 className="font-bold text-lg text-white flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <Settings className="h-3 w-3 text-white" />
                </div>
                Service Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-300"><strong>Service:</strong></p>
                  <p className="text-white font-semibold bg-gray-600 px-3 py-2 rounded-lg">{booking.service.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-300"><strong>Price Range:</strong></p>
                  <p className="text-white font-semibold bg-gray-600 px-3 py-2 rounded-lg">{booking.service.price}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-300"><strong>Collection:</strong></p>
                  <p className="text-white font-semibold bg-gray-600 px-3 py-2 rounded-lg">{new Date(booking.collection_date).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-300"><strong>Departure:</strong></p>
                  <p className="text-white font-semibold bg-gray-600 px-3 py-2 rounded-lg">{new Date(booking.departure_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-semibold text-base">Booking Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-600 text-white border-gray-500 hover:bg-gray-500 focus:ring-2 focus:ring-purple-500 h-12">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 text-white border border-gray-700">
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="hover:bg-gray-700">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              {showWeightField && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
                  <FormField
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-semibold text-base">Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            placeholder="0.0"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 0 : parseFloat(value) || 0)
                            }}
                            className="bg-gray-600 text-white border-gray-500 hover:bg-gray-500 focus:ring-2 focus:ring-purple-500 h-12"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-300">
                          Enter the weight of the laundry in kilograms
                        </p>
                        {selectedWeight && selectedWeight > 0 && booking && (
                          <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                            <p className="text-green-300 font-semibold text-lg">
                              <strong>Calculated Price:</strong> {formatPrice(calculatePriceFromWeight(selectedWeight, booking.service.name))}
                            </p>
                            <p className="text-green-200/80 text-sm mt-2">
                              Based on {selectedWeight}kg and service: {booking.service.name}
                            </p>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {showPriceField && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
                  <FormField
                    control={form.control}
                    name="total_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-semibold text-base">Total Price (R)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 0 : parseFloat(value) || 0)
                            }}
                            className="bg-gray-600 text-white border-gray-500 hover:bg-gray-500 focus:ring-2 focus:ring-purple-500 h-12"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-300">
                          Enter the final amount the customer will be charged
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              )}

                <DialogFooter className="flex-col sm:flex-row gap-4 sm:gap-0 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    disabled={submitting}
                    className="w-full sm:w-auto order-2 sm:order-1 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500 h-12 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Status'
                    )}
                  </Button>
                </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
