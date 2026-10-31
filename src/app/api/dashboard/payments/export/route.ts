import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/roles'
import {
  isLedgerSort,
  isLedgerState,
  isPaymentMethod,
  ledgerCsv,
  loadLedgerExport,
  loadTransactionExport,
  staffEmailMap,
  transactionsCsv,
} from '@/lib/payments/ledger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RANGE_MS = 800 * 24 * 60 * 60 * 1000

async function sessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured')
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Middleware refreshes the session cookie.
      },
    },
  })
}

function csvResponse(body: string, filename: string, truncated: boolean) {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Export-Truncated': truncated ? '1' : '0',
    },
  })
}

export async function GET(request: Request) {
  const supabase = await sessionClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !isAdmin(data.user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const url = new URL(request.url)
  const start = new Date(url.searchParams.get('start') ?? '')
  const end = new Date(url.searchParams.get('end') ?? '')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'Date range is not valid' }, { status: 400 })
  }
  if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: 'Choose a shorter date range' }, { status: 400 })
  }

  const property = url.searchParams.get('property')
  const propertyId = property && /^[0-9a-f-]{36}$/i.test(property) ? property : null
  const search = url.searchParams.get('q') ?? ''
  const tab = url.searchParams.get('tab') === 'transactions' ? 'transactions' : 'ledger'
  const stamp = start.toISOString().slice(0, 10)

  try {
    if (tab === 'transactions') {
      const rows = await loadTransactionExport(supabase, {
        start: start.toISOString(),
        end: end.toISOString(),
        propertyId,
        search,
      })
      const emails = await staffEmailMap(supabase, rows.map((row) => row.recordedBy))
      return csvResponse(transactionsCsv(rows, emails), `payments-transactions-${stamp}.csv`, rows.length >= 5000)
    }

    const stateParam = url.searchParams.get('state') ?? 'all'
    const methodParam = url.searchParams.get('method') ?? 'all'
    const sortParam = url.searchParams.get('sort') ?? 'created_at'
    const rows = await loadLedgerExport(supabase, {
      start: start.toISOString(),
      end: end.toISOString(),
      propertyId,
      state: isLedgerState(stateParam) ? stateParam : 'all',
      method: methodParam === 'card' || isPaymentMethod(methodParam) ? methodParam : 'all',
      search,
      sort: isLedgerSort(sortParam) ? sortParam : 'created_at',
      ascending: url.searchParams.get('dir') === 'asc',
    })
    return csvResponse(ledgerCsv(rows), `payments-ledger-${stamp}.csv`, rows.length >= 5000)
  } catch (exportError) {
    console.error('Payment export failed', exportError)
    return NextResponse.json({ error: 'Could not export payments' }, { status: 500 })
  }
}
