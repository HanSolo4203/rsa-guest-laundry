import { NextResponse } from 'next/server'
import { Webhook, WebhookVerificationError } from 'standardwebhooks'
import { recordAndApplyYocoEvent } from '@/lib/payments/apply-event'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 64_000
const MAX_AGE_SECONDS = 5 * 60

export async function POST(request: Request) {
  const secret = process.env.YOCO_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('YOCO_WEBHOOK_SECRET is not configured')
    return new NextResponse('Webhook is not configured', { status: 500 })
  }

  const webhookId = request.headers.get('webhook-id')
  const webhookTimestamp = request.headers.get('webhook-timestamp')
  const webhookSignature = request.headers.get('webhook-signature')
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const timestamp = Number(webhookTimestamp)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(timestamp) || now - timestamp > MAX_AGE_SECONDS || timestamp - now > MAX_AGE_SECONDS) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const rawBody = await request.text()
  if (rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  let event: unknown
  try {
    event = new Webhook(secret).verify(rawBody, {
      'webhook-id': webhookId,
      'webhook-timestamp': webhookTimestamp,
      'webhook-signature': webhookSignature,
    })
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new NextResponse('Invalid signature', { status: 401 })
    }
    console.error('Yoco webhook verification failed', error)
    return new NextResponse('Invalid signature', { status: 401 })
  }

  if (!event || typeof event !== 'object') {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  try {
    await recordAndApplyYocoEvent(event as { id?: unknown; type?: unknown; payload?: { id?: unknown; amount?: unknown; currency?: unknown; metadata?: unknown } })
  } catch (error) {
    console.error('Yoco webhook processing failed', error)
    return new NextResponse('Could not process the event', { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
