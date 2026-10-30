import { createClient } from './client'
import type { BookingFormData } from '@/lib/schemas/booking'
import { Service, BookingWithService, BookingPropertyTag, ServicePricingTier, Staff, Machine, MachineType } from '@/lib/types/database'
import { clearPricingCache } from '@/lib/pricing'

export type PricingTierInput = {
  min_weight: number
  max_weight: number
  price: number
}

function formatTierAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

export function formatServicePriceRange(tiers: PricingTierInput[]): string {
  const prices = tiers.map((tier) => tier.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `R${formatTierAmount(min)}`
  return `R${formatTierAmount(min)}-R${formatTierAmount(max)}`
}

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

export async function getPricingTiers(serviceId: string): Promise<ServicePricingTier[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('service_pricing_tiers')
    .select('*')
    .eq('service_id', serviceId)
    .order('min_weight')

  if (error) {
    console.error('Error fetching pricing tiers:', error)
    throw new Error('Failed to fetch pricing tiers')
  }

  return (data || []).map((tier) => ({
    ...tier,
    min_weight: Number(tier.min_weight),
    max_weight: Number(tier.max_weight),
    price: Number(tier.price),
  }))
}

export async function saveServicePricing(serviceId: string, tiers: PricingTierInput[]): Promise<void> {
  if (tiers.length === 0) {
    throw new Error('At least one pricing tier is required')
  }

  const supabase = createClient()

  const { error: deleteError } = await supabase
    .from('service_pricing_tiers')
    .delete()
    .eq('service_id', serviceId)

  if (deleteError) {
    console.error('Error replacing pricing tiers:', deleteError)
    throw new Error('Failed to save pricing')
  }

  const { error: insertError } = await supabase
    .from('service_pricing_tiers')
    .insert(tiers.map((tier) => ({
      service_id: serviceId,
      min_weight: tier.min_weight,
      max_weight: tier.max_weight,
      price: tier.price,
    })))

  if (insertError) {
    console.error('Error inserting pricing tiers:', insertError)
    throw new Error('Failed to save pricing')
  }

  const { error: updateError } = await supabase
    .from('services')
    .update({ price: formatServicePriceRange(tiers) })
    .eq('id', serviceId)

  if (updateError) {
    console.error('Error updating service price range:', updateError)
    throw new Error('Failed to update service price')
  }

  clearPricingCache()
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

function asPropertyTag(value: unknown): BookingPropertyTag | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null
  return {
    id: record.id,
    name: record.name,
    primary_color: typeof record.primary_color === 'string' ? record.primary_color : null,
  }
}

export async function getBookings(): Promise<BookingWithService[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      property:properties(id, name, primary_color)
    `)
    .order('collection_date')
  
  if (error) {
    console.error('Error fetching bookings:', error)
    throw new Error('Failed to fetch bookings')
  }

  const bookings = data || []
  const staffIds = [...new Set(bookings.map((booking) => booking.weighed_by).filter((id): id is string => Boolean(id)))]
  const weigherNames = new Map<string, string>()

  if (staffIds.length > 0) {
    const { data: staffRows, error: staffError } = await supabase
      .from('staff')
      .select('id, name')
      .in('id', staffIds)

    if (staffError) {
      console.error('Error fetching staff names:', staffError)
    } else {
      for (const row of staffRows ?? []) {
        weigherNames.set(row.id, row.name)
      }
    }
  }

  return bookings.map((booking) => ({
    ...booking,
    property: asPropertyTag(booking.property),
    weigher_name: booking.weighed_by ? weigherNames.get(booking.weighed_by) ?? null : null,
  }))
}

export async function acknowledgeReadyBookings(): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ ready_acknowledged_at: new Date().toISOString() })
    .eq('stage', 'ready')
    .is('ready_acknowledged_at', null)

  if (error) {
    console.error('Error acknowledging ready bookings:', error)
    throw new Error('Failed to acknowledge ready bookings')
  }
}

export type StaffMember = Pick<Staff, 'id' | 'name' | 'active' | 'created_at'>

export async function getStaff(): Promise<StaffMember[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('staff')
    .select('id, name, active, created_at')
    .order('name')

  if (error) {
    console.error('Error fetching staff:', error)
    throw new Error('Failed to fetch staff')
  }

  return data ?? []
}

export async function createStaff(name: string, pin: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('admin_create_staff', {
    staff_name: name,
    pin,
  })

  if (error) {
    console.error('Error creating staff:', error)
    throw new Error(error.message || 'Failed to add staff')
  }
}

export async function setStaffPin(staffId: string, pin: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('admin_set_staff_pin', {
    staff_id: staffId,
    pin,
  })

  if (error) {
    console.error('Error setting staff PIN:', error)
    throw new Error(error.message || 'Failed to set PIN')
  }
}

export async function setStaffActive(staffId: string, active: boolean): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('staff')
    .update({ active })
    .eq('id', staffId)

  if (error) {
    console.error('Error updating staff:', error)
    throw new Error('Failed to update staff')
  }
}

export async function getMachines(): Promise<Machine[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('machines')
    .select('id, number, name, type, active, created_at')
    .order('type')
    .order('number')

  if (error) {
    console.error('Error fetching machines:', error)
    throw new Error('Failed to fetch machines')
  }

  return (data ?? []).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'washer' ? -1 : 1
    return a.number - b.number
  })
}

export async function createMachine(input: {
  number: number
  type: MachineType
  name?: string
}): Promise<void> {
  const supabase = createClient()
  const label = input.type === 'washer' ? 'Washer' : 'Dryer'
  const name = input.name?.trim() || `${label} ${input.number}`

  const { error } = await supabase
    .from('machines')
    .insert({
      number: input.number,
      type: input.type,
      name,
      active: true,
    })

  if (error) {
    console.error('Error creating machine:', error)
    if (error.code === '23505') {
      throw new Error(`${label} ${input.number} already exists`)
    }
    throw new Error('Failed to add machine')
  }
}

export async function setMachineActive(machineId: string, active: boolean): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('machines')
    .update({ active })
    .eq('id', machineId)

  if (error) {
    console.error('Error updating machine:', error)
    throw new Error('Failed to update machine')
  }
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

export async function createBooking(bookingData: BookingFormData & { property_id: string }) {
  const supabase = createClient()
  const roomNumber = bookingData.room_number?.trim() || null

  // Anon can insert a booking but cannot read the table back, so do not select the new row.
  const { error } = await supabase
    .from('bookings')
    .insert([{
      property_id: bookingData.property_id,
      first_name: bookingData.first_name.trim(),
      last_name: bookingData.last_name.trim(),
      phone: bookingData.phone.trim(),
      room_number: roomNumber,
      service_id: bookingData.service_id,
      collection_date: bookingData.collection_date,
      departure_date: bookingData.departure_date,
      additional_details: bookingData.additional_details?.trim() || null,
      status: 'pending',
      stage: 'to_weigh',
    }])
  
  if (error) {
    console.error('Error creating booking:', error)
    throw new Error('Failed to create booking')
  }
}
