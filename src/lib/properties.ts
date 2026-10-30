import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Property, Service } from '@/lib/types/database'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase URL and anon key are required to load a property')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function asService(value: Service | Service[] | null): Service | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export const getActiveProperty = cache(async (slug: string): Promise<Property | null> => {
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) return null

  const supabase = publicClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error('Failed to load property:', error)
    throw new Error('Failed to load property')
  }

  return data
})

export async function getPropertyServices(propertyId: string): Promise<Service[]> {
  const supabase = publicClient()
  const { data, error } = await supabase
    .from('property_services')
    .select('services(id, name, price, created_at)')
    .eq('property_id', propertyId)

  if (error) {
    console.error('Failed to load property services:', error)
    throw new Error('Failed to load property services')
  }

  const services: Service[] = []
  for (const row of data ?? []) {
    const service = asService(row.services as Service | Service[] | null)
    if (service) services.push(service)
  }

  services.sort((a, b) => a.name.localeCompare(b.name))
  return services
}
