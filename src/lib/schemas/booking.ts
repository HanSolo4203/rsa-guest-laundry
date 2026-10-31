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

const bookingUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  'Choose a valid option'
)

export const createGuestBookingSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  room_number: z.string().max(40, 'Room number is too long').optional(),
  service_id: z.string().min(1, 'Please select a service'),
  collection_date: z.string().min(1, 'Please select a collection date'),
  departure_date: z.string().min(1, 'Please select a departure date'),
  additional_details: z.string().max(1000, 'Please keep notes under 1000 characters').optional(),
  property_id: bookingUuid,
  payment_choice: z.enum(['pay_now', 'pay_on_delivery']),
  tier_id: z.string().optional(),
}).refine(
  (data) => !data.collection_date || !data.departure_date || data.departure_date >= data.collection_date,
  {
    message: 'Departure date must be on or after the collection date',
    path: ['departure_date'],
  }
).refine(
  (data) => data.payment_choice !== 'pay_now' || bookingUuid.safeParse(data.tier_id).success,
  {
    message: 'Choose a bag size',
    path: ['tier_id'],
  }
)

export type GuestBookingRequest = z.infer<typeof createGuestBookingSchema>

function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const portalBookingSchema = z.object({
  room_number: z.string().trim().min(1, 'Room number is required').max(40, 'Room number is too long'),
  first_name: z.string().trim().min(1, 'First name is required').max(100, 'First name is too long'),
  last_name: z.string().trim().max(100, 'Last name is too long'),
  phone: z.string().trim().max(20, 'Phone number is too long'),
  service_id: z.string().min(1, 'Select a service'),
  collection_date: z.string().min(1, 'Please select a collection date'),
  departure_date: z.string().min(1, 'Please select a departure date'),
  additional_details: z.string().max(1000, 'Please keep notes under 1000 characters'),
}).refine(
  (data) => !data.collection_date || data.collection_date >= localToday(),
  {
    message: 'Collection date cannot be in the past',
    path: ['collection_date'],
  }
).refine(
  (data) => !data.collection_date || !data.departure_date || data.departure_date >= data.collection_date,
  {
    message: 'Departure date must be on or after the collection date',
    path: ['departure_date'],
  }
)

export type PortalBookingFormData = z.infer<typeof portalBookingSchema>
