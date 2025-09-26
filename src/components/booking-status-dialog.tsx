'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  total_price: z.number().min(0, 'Total price must be greater than or equal to 0').optional(),
})

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
    },
  })

  const selectedStatus = form.watch('status')
  const showPriceField = selectedStatus === 'completed'

  const onSubmit = async (data: StatusUpdateFormData) => {
    if (!booking) return

    try {
      setSubmitting(true)
      
      await updateBookingStatus(
        booking.id,
        data.status,
        data.total_price
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
      <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Update Booking Status</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Update the status for {booking.first_name} {booking.last_name}&apos;s booking
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Service Details</h4>
                <div className="text-xs sm:text-sm space-y-1 mt-1">
                  <p><strong>Service:</strong> {booking.service.name}</p>
                  <p><strong>Original Price:</strong> ${booking.service.price.toFixed(2)}</p>
                  <p><strong>Collection:</strong> {new Date(booking.collection_date).toLocaleDateString()}</p>
                  <p><strong>Departure:</strong> {new Date(booking.departure_date).toLocaleDateString()}</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              {showPriceField && (
                <FormField
                  control={form.control}
                  name="total_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
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
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto order-1 sm:order-2">
                    {submitting ? 'Updating...' : 'Update Status'}
                  </Button>
                </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
