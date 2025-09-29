'use client'

import { useState, useEffect } from 'react'
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
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'collected', label: 'Collected' },
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
      <DialogContent className="mx-4 sm:mx-auto sm:max-w-[560px] md:max-w-[640px] max-h-[80vh] overflow-y-auto bg-slate-900/90 backdrop-blur border border-white/10 shadow-xl text-white">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Update Booking Status</DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-white/80">
            Update the status for {booking.first_name} {booking.last_name}&apos;s booking
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium text-sm text-white/80">Service Details</h4>
                <div className="text-xs sm:text-sm space-y-1 mt-1">
                  <p><strong>Service:</strong> {booking.service.name}</p>
                  <p><strong>Price Range:</strong> {booking.service.price}</p>
                  <p><strong>Collection:</strong> {new Date(booking.collection_date).toLocaleDateString()}</p>
                  <p><strong>Departure:</strong> {new Date(booking.departure_date).toLocaleDateString()}</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/90">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 text-white border-gray-700">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 text-white border border-gray-700">
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showWeightField && (
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Weight (kg)</FormLabel>
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
                          className="bg-gray-800 text-white border-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-white/70">
                        Enter the weight of the laundry in kilograms
                      </p>
                      {selectedWeight && selectedWeight > 0 && booking && (
                        <div className="mt-2 p-2 bg-green-900/30 border border-green-700 rounded text-sm">
                          <p className="text-green-300">
                            <strong>Calculated Price:</strong> {formatPrice(calculatePriceFromWeight(selectedWeight, booking.service.name))}
                          </p>
                          <p className="text-green-200/80 text-xs mt-1">
                            Based on {selectedWeight}kg and service: {booking.service.name}
                          </p>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              )}

              {showPriceField && (
                <FormField
                  control={form.control}
                  name="total_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Total Price (R)</FormLabel>
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
                          className="bg-gray-800 text-white border-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-white/70">
                        Enter the final amount the customer will be charged
                      </p>
                    </FormItem>
                  )}
                />
              )}
            </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    disabled={submitting}
                    className="w-full sm:w-auto order-2 sm:order-1 text-white border-gray-700 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white">
                    {submitting ? 'Updating...' : 'Update Status'}
                  </Button>
                </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
