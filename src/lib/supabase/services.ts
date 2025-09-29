import { createClient } from './client'
import { Service, BookingWithService } from '@/lib/types/database'

export async function getServices(): Promise<Service[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching services:', error)
    throw new Error('Failed to fetch services')
  }
  
  return data || []
}

export async function createService(serviceData: {
  name: string
  price: string
}): Promise<Service> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .insert([serviceData])
    .select()
    .single()
  
  if (error) {
    console.error('Error creating service:', error)
    throw new Error('Failed to create service')
  }
  
  return data
}

export async function updateService(id: string, serviceData: {
  name: string
  price: string
}): Promise<Service> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .update(serviceData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating service:', error)
    throw new Error('Failed to update service')
  }
  
  return data
}

export async function deleteService(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting service:', error)
    throw new Error('Failed to delete service')
  }
}

export async function getBookings(): Promise<BookingWithService[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*)
    `)
    .order('collection_date')
  
  if (error) {
    console.error('Error fetching bookings:', error)
    throw new Error('Failed to fetch bookings')
  }
  
  return data || []
}

export async function getBookingsByCollectionDate(date: string): Promise<BookingWithService[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*)
    `)
    .eq('collection_date', date)
    .order('created_at')
  
  if (error) {
    console.error('Error fetching bookings by collection date:', error)
    throw new Error('Failed to fetch bookings')
  }
  
  return data || []
}

export async function updateBookingStatus(id: string, status: string, totalPrice?: number, weightKg?: number): Promise<BookingWithService> {
  const supabase = createClient()
  
  const updateData: { status: string; total_price?: number; completed_at?: string; weight_kg?: number } = { status }
  
  // Set completed_at timestamp when status is updated to 'completed'
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }
  
  if (totalPrice !== undefined) {
    updateData.total_price = totalPrice
  }
  
  if (weightKg !== undefined) {
    updateData.weight_kg = weightKg
  }
  
  console.log('Updating booking with data:', { id, status, totalPrice, weightKg, updateData })
  
  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      service:services(*)
    `)
    .single()
  
  if (error) {
    console.error('Error updating booking status:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw new Error(`Failed to update booking status: ${error.message}`)
  }
  
  console.log('Successfully updated booking:', data)
  return data
}

export async function updateBookingPaymentMethod(id: string, paymentMethod: 'card' | 'cash'): Promise<BookingWithService> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('bookings')
    .update({ payment_method: paymentMethod })
    .eq('id', id)
    .select(`
      *,
      service:services(*)
    `)
    .single()
  
  if (error) {
    console.error('Error updating booking payment method:', error)
    throw new Error(`Failed to update payment method: ${error.message}`)
  }
  
  return data
}

export async function updateBooking(id: string, bookingData: {
  first_name?: string
  last_name?: string
  phone?: string
  service_id?: string
  collection_date?: string
  departure_date?: string
  additional_details?: string
}): Promise<BookingWithService> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('bookings')
    .update(bookingData)
    .eq('id', id)
    .select(`
      *,
      service:services(*)
    `)
    .single()
  
  if (error) {
    console.error('Error updating booking:', error)
    throw new Error('Failed to update booking')
  }
  
  return data
}

export async function createBooking(bookingData: {
  first_name: string
  last_name: string
  phone: string
  service_id: string
  collection_date: string
  departure_date: string
  additional_details?: string
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single()
  
  if (error) {
    console.error('Error creating booking:', error)
    throw new Error('Failed to create booking')
  }
  
  return data
}
