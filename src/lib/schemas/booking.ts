import { z } from 'zod'

export const bookingSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  room_number: z.string().max(40, 'Room number is too long').optional(),
  service_id: z.string().min(1, 'Please select a service'),
  collection_date: z.string().min(1, 'Please select a collection date'),
  departure_date: z.string().min(1, 'Please select a departure date'),
  additional_details: z.string().max(1000, 'Please keep notes under 1000 characters').optional(),
}).refine(
  (data) => !data.collection_date || !data.departure_date || data.departure_date >= data.collection_date,
  {
    message: 'Departure date must be on or after the collection date',
    path: ['departure_date'],
  }
)

export type BookingFormData = z.infer<typeof bookingSchema>
