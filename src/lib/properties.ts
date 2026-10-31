import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Property, Service } from '@/lib/types/database'

export interface GuestService extends Service {
  tiers: Array<{
    id: string
    min_weight: number
    max_weight: number
    price: number
  }>
}

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

function asTier(value: unknown): GuestService['tiers'][number] | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string') return null
  const minWeight = Number(row.min_weight)
  const maxWeight = Number(row.max_weight)
  const price = Number(row.price)
  if (!Number.isFinite(minWeight) || !Number.isFinite(maxWeight) || !Number.isFinite(price)) return null
  return { id: row.id, min_weight: minWeight, max_weight: maxWeight, price }
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

export async function getPropertyServices(propertyId: string): Promise<GuestService[]> {
  const supabase = publicClient()
  const { data, error } = await supabase
    .from('property_services')
    .select('services(id, name, price, created_at)')
    .eq('property_id', propertyId)

  if (error) {
    console.error('Failed to load property services:', error)
    throw new Error('Failed to load property services')
  }

  const services: GuestService[] = []
  for (const row of data ?? []) {
    const service = asService(row.services as Service | Service[] | null)
    if (service) services.push({ ...service, tiers: [] })
  }

  if (services.length > 0) {
    const { data: tiers, error: tierError } = await supabase
      .from('service_pricing_tiers')
      .select('id, service_id, min_weight, max_weight, price')
      .in('service_id', services.map((service) => service.id))

    if (tierError) {
      console.error('Failed to load pricing tiers:', tierError)
      throw new Error('Failed to load pricing tiers')
    }

    for (const row of tiers ?? []) {
      const tier = asTier(row)
      const service = services.find((item) => item.id === row.service_id)
      if (tier && service) service.tiers.push(tier)
    }
    for (const service of services) {
      service.tiers.sort((a, b) => a.min_weight - b.min_weight || a.max_weight - b.max_weight)
    }
  }

  services.sort((a, b) => a.name.localeCompare(b.name))
  return services
}
