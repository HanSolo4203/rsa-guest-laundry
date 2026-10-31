const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function randsToCents(price: number): number | null {
  if (!Number.isFinite(price) || price <= 0) return null
  const cents = Math.round(price * 100)
  if (!Number.isInteger(cents) || cents < 200) return null
  return cents
}

export function formatCents(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`
}

export function formatTierPrice(price: number): string {
  const rounded = Math.round(price * 100) / 100
  if (!Number.isFinite(rounded)) return 'R0'
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
  return `R${text}`
}

export function formatKg(value: number): string {
  const rounded = Math.round(Number(value) * 10) / 10
  if (!Number.isFinite(rounded)) return '0'
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function tierChoiceLabel(tier: {
  min_weight: number
  max_weight: number
  price: number
}): string {
  const price = formatTierPrice(Number(tier.price))
  const max = formatKg(tier.max_weight)
  if (Number(tier.min_weight) <= 0) return `Up to ${max} kg – ${price}`
  return `${formatKg(tier.min_weight)}–${max} kg – ${price}`
}

export function topupDueCents(
  totalPrice: number | null | undefined,
  prepaidAmountCents: number | null | undefined
): number | null {
  if (totalPrice == null || prepaidAmountCents == null) return null
  const totalCents = Math.round(Number(totalPrice) * 100)
  if (!Number.isFinite(totalCents)) return null
  const difference = totalCents - prepaidAmountCents
  return difference >= 200 ? difference : null
}

export function isPrepaidNoChange(booking: {
  payment_status?: string | null
  prepaid_amount_cents?: number | null
  total_price?: number | null
}): boolean {
  if (booking.payment_status !== 'paid') return false
  if (booking.prepaid_amount_cents == null || booking.total_price == null) return false
  const totalCents = Math.round(Number(booking.total_price) * 100)
  return Number.isFinite(totalCents) && totalCents < booking.prepaid_amount_cents
}

export function withoutUnpaidNote(notes: string | null): string | null {
  if (!notes) return notes
  const next = notes
    .split('\n')
    .filter((line) => line.trim() !== 'Unpaid')
    .join('\n')
    .trim()
  return next.length > 0 ? next : null
}
