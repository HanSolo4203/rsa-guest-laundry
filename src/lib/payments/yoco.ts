import { isYocoRedirect } from '@/lib/payments/redirect'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CheckoutKind = 'booking' | 'topup'

export function appBaseUrl(): string {
  const raw = process.env.APP_URL?.trim()
  if (!raw) throw new Error('APP_URL is not configured')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('APP_URL is not a valid URL')
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !local) {
    throw new Error('APP_URL must use https')
  }
  return raw.replace(/\/$/, '')
}

export function yocoSecretKey(): string {
  const secret = process.env.YOCO_SECRET_KEY?.trim()
  if (!secret) throw new Error('Yoco is not configured')
  if (process.env.NODE_ENV !== 'production' && !secret.startsWith('sk_test_')) {
    throw new Error('Development must use a Yoco test secret key')
  }
  return secret
}

export function bookingPaymentPage(slug: string, bookingId: string): string {
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) {
    throw new Error('Property address is not valid')
  }
  return `${appBaseUrl()}/${slug}/booking/${bookingId}`
}

export async function createYocoCheckout(input: {
  amountCents: number
  successUrl: string
  cancelUrl: string
  failureUrl: string
  metadata: { bookingId: string; paymentId: string; kind: CheckoutKind }
  idempotencyKey: string
}): Promise<{ id: string; redirectUrl: string }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 200) {
    throw new Error('Payment amount is below the Yoco minimum')
  }

  const response = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${yocoSecretKey()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: 'ZAR',
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      failureUrl: input.failureUrl,
      metadata: input.metadata,
    }),
  })

  const body = (await response.json().catch(() => null)) as {
    id?: unknown
    redirectUrl?: unknown
  } | null

  if (!response.ok || !body || typeof body.id !== 'string' || typeof body.redirectUrl !== 'string') {
    throw new Error('Yoco checkout could not be created')
  }
  if (!isYocoRedirect(body.redirectUrl)) {
    throw new Error('Yoco checkout could not be created')
  }

  return { id: body.id, redirectUrl: body.redirectUrl }
}

export async function openYocoCheckout(input: {
  slug: string
  bookingId: string
  paymentId: string
  kind: CheckoutKind
  amountCents: number
}): Promise<{ id: string; redirectUrl: string }> {
  const page = bookingPaymentPage(input.slug, input.bookingId)
  return createYocoCheckout({
    amountCents: input.amountCents,
    successUrl: `${page}?payment=success`,
    cancelUrl: `${page}?payment=cancelled`,
    failureUrl: `${page}?payment=failed`,
    metadata: {
      bookingId: input.bookingId,
      paymentId: input.paymentId,
      kind: input.kind,
    },
    idempotencyKey: crypto.randomUUID(),
  })
}
