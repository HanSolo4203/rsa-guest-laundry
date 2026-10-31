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

function splitCents(cents: number): { negative: boolean; whole: number; fraction: number } {
  const negative = cents < 0
  const abs = Math.abs(Math.trunc(cents))
  return {
    negative,
    whole: Math.floor(abs / 100),
    fraction: abs % 100,
  }
}

/** Display cents as rands, for example `R 1 234.50`. */
export function formatRand(cents: number): string {
  const { negative, whole, fraction } = splitCents(cents)
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${negative ? '-' : ''}R ${grouped}.${String(fraction).padStart(2, '0')}`
}

/** CSV amounts in rands with two decimals and no thousands separator. */
export function centsToDecimal(cents: number): string {
  const { negative, whole, fraction } = splitCents(cents)
  return `${negative ? '-' : ''}${whole}.${String(fraction).padStart(2, '0')}`
}

export function centsToRandInput(cents: number): string {
  const { whole, fraction } = splitCents(cents)
  if (fraction === 0) return String(whole)
  return `${whole}.${String(fraction).padStart(2, '0')}`
}

/** Parse a rand input into integer cents. Rejects anything that is not 1 cent to R1 000 000.00. */
export function randsInputToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s+/g, '').replace(/^R/i, '')
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const [whole, fraction = ''] = trimmed.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 100_000_000) return null
  return cents
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
