import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function expire(request: Request) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  const authorization = request.headers.get('authorization')
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('expire_stale_payments')
  if (error) {
    console.error('Payment expiry failed', error)
    return NextResponse.json({ error: 'Could not expire payments' }, { status: 500 })
  }

  return NextResponse.json({ expiredBookings: data ?? 0 })
}

export function GET(request: Request) {
  return expire(request)
}

export function POST(request: Request) {
  return expire(request)
}
