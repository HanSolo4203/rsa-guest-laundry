/**
 * Automated pricing function for laundry services
 * Calculates total_price based on weight input and service type selection
 */

export interface PricingTier {
  minWeight: number;
  maxWeight: number;
  price: number;
}

export interface ServicePricing {
  serviceName: string;
  tiers: PricingTier[];
}

// Pricing structure as specified
export const PRICING_STRUCTURE: ServicePricing[] = [
  {
    serviceName: "Mixed Wash Dry Fold",
    tiers: [
      { minWeight: 0, maxWeight: 5, price: 170 },
      { minWeight: 6, maxWeight: 10, price: 300 },
      { minWeight: 11, maxWeight: 15, price: 470 }
    ]
  },
  {
    serviceName: "Colour Separated Wash Dry Fold",
    tiers: [
      { minWeight: 0, maxWeight: 5, price: 230 },
      { minWeight: 6, maxWeight: 10, price: 360 },
      { minWeight: 11, maxWeight: 15, price: 530 }
    ]
  },
  {
    serviceName: "Mixed Wash Dry Iron",
    tiers: [
      { minWeight: 0, maxWeight: 5, price: 230 },
      { minWeight: 6, maxWeight: 10, price: 380 },
      { minWeight: 11, maxWeight: 15, price: 600 }
    ]
  },
  {
    serviceName: "Colour Separated Wash Dry Iron",
    tiers: [
      { minWeight: 0, maxWeight: 5, price: 280 },
      { minWeight: 6, maxWeight: 10, price: 440 },
      { minWeight: 11, maxWeight: 15, price: 660 }
    ]
  }
];

/**
 * Calculate price based on service name and weight
 * @param serviceName - The name of the service
 * @param weightKg - Weight in kilograms
 * @returns The calculated price or 0 if no match found
 */
export function calculatePrice(serviceName: string, weightKg: number): number {
  // Find the service in the pricing structure
  const service = PRICING_STRUCTURE.find(s => 
    s.serviceName.toLowerCase() === serviceName.toLowerCase()
  );

  if (!service) {
    console.warn(`Service "${serviceName}" not found in pricing structure`);
    return 0;
  }

  // Find the appropriate tier based on weight
  const tier = service.tiers.find(t => 
    weightKg >= t.minWeight && weightKg <= t.maxWeight
  );

  if (!tier) {
    console.warn(`No pricing tier found for weight ${weightKg}kg in service "${serviceName}"`);
    return 0;
  }

  return tier.price;
}

/**
 * Get all available services with their pricing tiers
 * @returns Array of service names
 */
export function getAvailableServices(): string[] {
  return PRICING_STRUCTURE.map(service => service.serviceName);
}

/**
 * Get pricing tiers for a specific service
 * @param serviceName - The name of the service
 * @returns Array of pricing tiers or empty array if service not found
 */
export function getServicePricingTiers(serviceName: string): PricingTier[] {
  const service = PRICING_STRUCTURE.find(s => 
    s.serviceName.toLowerCase() === serviceName.toLowerCase()
  );
  
  return service ? service.tiers : [];
}

/**
 * Format price for display
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return `R${price.toFixed(2)}`;
}

/**
 * Get price range for a service (min-max)
 * @param serviceName - The name of the service
 * @returns Object with min and max prices
 */
export function getServicePriceRange(serviceName: string): { min: number; max: number } | null {
  const tiers = getServicePricingTiers(serviceName);
  
  if (tiers.length === 0) {
    return null;
  }

  const prices = tiers.map(tier => tier.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}
