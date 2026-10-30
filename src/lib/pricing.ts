/**
 * Laundry pricing. Weight tiers are stored in service_pricing_tiers.
 */

import { createClient } from '@/lib/supabase/client'

export interface PricingTier {
  minWeight: number
  maxWeight: number
  price: number
}

const tierCache = new Map<string, PricingTier[]>()

export function clearPricingCache(): void {
  tierCache.clear()
}

/**
 * Get all available services
 */
export async function getAvailableServices(): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('name')
    .order('name')

  if (error) {
    console.error('Error fetching services for pricing:', error)
    return []
  }

  return (data || []).map((service) => service.name)
}

/**
 * Get pricing tiers for a specific service
 * @param serviceName - The name of the service
 * @returns Array of pricing tiers or empty array if service not found
 */
export async function getServicePricingTiers(serviceName: string): Promise<PricingTier[]> {
  const cacheKey = serviceName.toLowerCase()
  const cached = tierCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const supabase = createClient()
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id')
    .ilike('name', serviceName)
    .maybeSingle()

  if (serviceError || !service) {
    console.warn(`Service "${serviceName}" not found in pricing structure`)
    return []
  }

  const { data: rows, error: tierError } = await supabase
    .from('service_pricing_tiers')
    .select('min_weight, max_weight, price')
    .eq('service_id', service.id)
    .order('min_weight')

  if (tierError || !rows) {
    console.warn(`No pricing tiers found for service "${serviceName}"`)
    return []
  }

  const tiers: PricingTier[] = rows.map((row) => ({
    minWeight: Number(row.min_weight),
    maxWeight: Number(row.max_weight),
    price: Number(row.price),
  }))

  tierCache.set(cacheKey, tiers)
  return tiers
}

/**
 * Calculate price based on service name and weight
 * @param serviceName - The name of the service
 * @param weightKg - Weight in kilograms
 * @returns The calculated price or 0 if no match found
 */
export async function calculatePrice(serviceName: string, weightKg: number): Promise<number> {
  const tiers = await getServicePricingTiers(serviceName)

  if (tiers.length === 0) {
    console.warn(`Service "${serviceName}" not found in pricing structure`)
    return 0
  }

  const tier = tiers.find((item) => weightKg >= item.minWeight && weightKg <= item.maxWeight)

  if (!tier) {
    console.warn(`No pricing tier found for weight ${weightKg}kg in service "${serviceName}"`)
    return 0
  }

  return tier.price
}

/**
 * Format price for display
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return `R${price.toFixed(2)}`
}

/**
 * Get price range for a service (min-max)
 * @param serviceName - The name of the service
 * @returns Object with min and max prices
 */
export async function getServicePriceRange(serviceName: string): Promise<{ min: number; max: number } | null> {
  const tiers = await getServicePricingTiers(serviceName)

  if (tiers.length === 0) {
    return null
  }

  const prices = tiers.map((tier) => tier.price)
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  }
}
