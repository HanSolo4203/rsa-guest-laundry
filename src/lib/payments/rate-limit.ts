type Bucket = number[]

type RateLimitGlobal = typeof globalThis & { __paymentRateLimit?: Map<string, Bucket> }

function rateLimitBuckets(): Map<string, Bucket> {
  const holder = globalThis as RateLimitGlobal
  if (!holder.__paymentRateLimit) holder.__paymentRateLimit = new Map()
  return holder.__paymentRateLimit
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 80)
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  return realIp ? realIp.slice(0, 80) : 'unknown'
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const buckets = rateLimitBuckets()
  const recent = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 5000) {
    const oldest = buckets.keys().next().value
    if (oldest) buckets.delete(oldest)
  }
  return true
}
