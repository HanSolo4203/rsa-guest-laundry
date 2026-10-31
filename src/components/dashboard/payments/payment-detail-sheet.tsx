'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, ExternalLink } from 'lucide-react'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PropertyBadge } from '@/components/property-badge'
import { useSearch } from '@/contexts/search-context'
import { createClient } from '@/lib/supabase/client'
import { isYocoRedirect } from '@/lib/payments/redirect'
import { centsToRandInput, formatKg, formatRand, randsInputToCents } from '@/lib/payments/money'
import {
  PAYMENT_METHODS,
  formatWhen,
  ledgerStateLabel,
  methodLabel,
  paidToastMessage,
  staffEmailMap,
  type LedgerRow,
  type PaymentMethod,
} from '@/lib/payments/ledger'

const fieldClass = 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400'
const selectTriggerClass = 'w-full border-gray-600 bg-gray-700 text-white'
const selectContentClass = 'border-gray-700 bg-gray-800 text-white'

const STAGE_LABEL: Record<string, string> = {
  to_weigh: 'To weigh',
  washing: 'Washing',
  drying: 'Drying',
  finishing: 'Finishing',
  ready: 'Ready',
}

type TimelinePayment = {
  id: string
  kind: string
  amountCents: number
  status: string
  method: string
  reference: string | null
  note: string | null
  yocoPaymentId: string | null
  recordedBy: string | null
  paidAt: string | null
  createdAt: string
}

function friendly(error: { message?: string } | null, fallback: string): string {
  const message = error?.message?.trim()
  if (!message || message.length > 180) return fallback
  return message
}

async function copyText(value: string, success: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(success)
  } catch {
    toast.error('Could not copy')
  }
}

export function PaymentDetailSheet({
  bookingId,
  refreshKey,
  onClose,
  onChanged,
}: {
  bookingId: string | null
  refreshKey: number
  onClose: () => void
  onChanged: () => void
}) {
  const router = useRouter()
  const { setSearchQuery } = useSearch()
  const prefilledFor = useRef<string | null>(null)
  const refillAmount = useRef(false)
  const [row, setRow] = useState<LedgerRow | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [payments, setPayments] = useState<TimelinePayment[]>([])
  const [emails, setEmails] = useState<Map<string, string>>(new Map())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [link, setLink] = useState('')
  const [sending, setSending] = useState<'pay' | 'topup' | null>(null)
  const [confirmAccount, setConfirmAccount] = useState(false)
  const [voiding, setVoiding] = useState<TimelinePayment | null>(null)
  const [voidReason, setVoidReason] = useState('')

  useEffect(() => {
    if (!bookingId) {
      prefilledFor.current = null
      return
    }
    let cancelled = false
    const supabase = createClient()

    const load = async () => {
      const [ledgerResult, bookingResult, paymentResult] = await Promise.all([
        supabase.from('admin_payment_ledger').select('*').eq('booking_id', bookingId).maybeSingle(),
        supabase.from('bookings').select('phone, additional_details, payment_method').eq('id', bookingId).maybeSingle(),
        supabase
          .from('payments')
          .select('id, kind, amount_cents, status, method, reference, note, yoco_payment_id, recorded_by, paid_at, created_at')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true }),
      ])
      if (cancelled) return
      if (ledgerResult.error) {
        toast.error(friendly(ledgerResult.error, 'Could not load the booking'))
        return
      }
      const ledger = ledgerResult.data
        ? {
            bookingId: ledgerResult.data.booking_id as string,
            createdAt: ledgerResult.data.created_at as string,
            guestName: (ledgerResult.data.guest_name as string) ?? 'Guest',
            roomNumber: (ledgerResult.data.room_number as string | null) ?? null,
            propertyId: ledgerResult.data.property_id as string,
            propertyName: (ledgerResult.data.property_name as string) ?? 'Property',
            propertyColor: (ledgerResult.data.property_color as string | null) ?? null,
            serviceName: (ledgerResult.data.service_name as string) ?? 'Service',
            weightKg: ledgerResult.data.weight_kg == null ? null : Number(ledgerResult.data.weight_kg),
            stage: (ledgerResult.data.stage as string) ?? '',
            bookingStatus: (ledgerResult.data.booking_status as string) ?? '',
            paymentMethod: (ledgerResult.data.payment_method as string | null) ?? null,
            paymentStatus: (ledgerResult.data.payment_status as string | null) ?? null,
            deliveredAt: (ledgerResult.data.delivered_at as string | null) ?? null,
            readyAt: (ledgerResult.data.ready_at as string | null) ?? null,
            totalDueCents: ledgerResult.data.total_due_cents as number | null,
            totalPaidCents: Number(ledgerResult.data.total_paid_cents ?? 0),
            balanceCents: ledgerResult.data.balance_cents as number | null,
            lastPaymentAt: (ledgerResult.data.last_payment_at as string | null) ?? null,
            methods: Array.isArray(ledgerResult.data.methods) ? (ledgerResult.data.methods as string[]) : [],
            referenceText: (ledgerResult.data.reference_text as string | null) ?? null,
            paymentState: (ledgerResult.data.payment_state as string) ?? 'partial',
          }
        : null
      setRow(ledger)
      setPhone((bookingResult.data?.phone as string | null) ?? null)
      setNotes((bookingResult.data?.additional_details as string | null) ?? null)
      const timeline: TimelinePayment[] = (paymentResult.data ?? []).map((payment) => ({
        id: payment.id as string,
        kind: payment.kind as string,
        amountCents: Number(payment.amount_cents),
        status: payment.status as string,
        method: (payment.method as string) ?? 'yoco',
        reference: (payment.reference as string | null) ?? null,
        note: (payment.note as string | null) ?? null,
        yocoPaymentId: (payment.yoco_payment_id as string | null) ?? null,
        recordedBy: (payment.recorded_by as string | null) ?? null,
        paidAt: (payment.paid_at as string | null) ?? null,
        createdAt: payment.created_at as string,
      }))
      setPayments(timeline)
      if (refillAmount.current && ledger) {
        refillAmount.current = false
        setAmount(ledger.balanceCents != null && ledger.balanceCents > 0 ? centsToRandInput(ledger.balanceCents) : '')
      }
      if (prefilledFor.current !== bookingId) {
        prefilledFor.current = bookingId
        const balance = ledger?.balanceCents
        setAmount(balance != null && balance > 0 ? centsToRandInput(balance) : '')
        const current = bookingResult.data?.payment_method
        if (current === 'cash' || current === 'eft' || current === 'account') setMethod(current)
        else if (current === 'card') setMethod('card_machine')
        else setMethod('cash')
        setReference('')
        setNote('')
        setLink('')
      }
      try {
        setEmails(await staffEmailMap(supabase, timeline.map((payment) => payment.recordedBy)))
      } catch {
        if (!cancelled) setEmails(new Map())
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [bookingId, refreshKey])

  async function recordPayment() {
    if (!row) return
    const cents = randsInputToCents(amount)
    if (cents == null) {
      toast.error('Enter an amount in rands')
      return
    }
    if (method === 'yoco' && cents < 200) {
      toast.error('Yoco payments must be at least R 2.00')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('admin_record_payment', {
      booking_id: row.bookingId,
      amount_cents: cents,
      method,
      reference,
      note,
    })
    setSaving(false)
    if (error) {
      toast.error(friendly(error, 'Could not record the payment'))
      return
    }
    toast.success(paidToastMessage(cents, row.roomNumber, row.propertyName), {
      id: `paid-${typeof data === 'string' ? data : row.bookingId}`,
    })
    setReference('')
    setNote('')
    refillAmount.current = true
    onChanged()
  }

  async function markOnAccount() {
    if (!row) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('bookings').update({ payment_method: 'account' }).eq('id', row.bookingId)
    setSaving(false)
    setConfirmAccount(false)
    if (error) {
      toast.error(friendly(error, 'Could not mark this on account'))
      return
    }
    toast.success('Marked on account')
    onChanged()
  }

  async function sendLink(kind: 'pay' | 'topup') {
    if (!row) return
    setSending(kind)
    try {
      const path = kind === 'pay' ? 'retry' : 'topup'
      const response = await fetch(`/api/bookings/${row.bookingId}/${path}`, { method: 'POST' })
      const body = (await response.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null
      if (!response.ok || !body?.redirectUrl || !isYocoRedirect(body.redirectUrl)) {
        toast.error(body?.error || 'Could not create the link')
        return
      }
      setLink(body.redirectUrl)
      await copyText(body.redirectUrl, kind === 'pay' ? 'Pay link copied' : 'Top-up link copied')
    } catch {
      toast.error('Could not create the link')
    } finally {
      setSending(null)
    }
  }

  async function voidPayment() {
    if (!voiding || !voidReason.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_void_payment', {
      payment_id: voiding.id,
      reason: voidReason.trim(),
    })
    setSaving(false)
    if (error) {
      toast.error(friendly(error, 'Could not void the payment'))
      return
    }
    toast.success('Payment voided')
    setVoiding(null)
    setVoidReason('')
    onChanged()
  }

  const balance = row?.balanceCents
  const canPayLink = row?.paymentStatus === 'pending'
  const canTopup = row?.paymentStatus === 'topup_due'

  return (
    <>
      <Sheet open={bookingId != null} onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent className="w-full overflow-y-auto border-gray-700 bg-gray-900 text-white sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">{row?.guestName ?? 'Payment'}</SheetTitle>
            <SheetDescription className="text-gray-400">
              {row ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <PropertyBadge name={row.propertyName} color={row.propertyColor} />
                  {row.roomNumber ? <span>Room {row.roomNumber}</span> : null}
                </span>
              ) : 'Loading booking'}
            </SheetDescription>
          </SheetHeader>
          {row ? (
            <div className="space-y-6 px-4 pb-6">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-400">Service</dt>
                  <dd>{row.serviceName}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Weight</dt>
                  <dd>{row.weightKg == null ? '—' : `${formatKg(row.weightKg)} kg`}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Stage</dt>
                  <dd>{STAGE_LABEL[row.stage] ?? row.stage}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Status</dt>
                  <dd>{ledgerStateLabel(row.paymentState, row.totalPaidCents)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Due</dt>
                  <dd>{row.totalDueCents == null ? '—' : formatRand(row.totalDueCents)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Paid</dt>
                  <dd>{formatRand(row.totalPaidCents)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Balance</dt>
                  <dd className={balance != null && balance > 0 ? 'font-semibold text-red-300' : ''}>
                    {balance == null ? '—' : formatRand(balance)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Phone</dt>
                  <dd>{phone || '—'}</dd>
                </div>
              </dl>
              {notes ? <p className="rounded-lg bg-gray-800 p-3 text-sm text-gray-300">{notes}</p> : null}

              <form
                className="space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void recordPayment()
                }}
              >
                <h3 className="font-semibold">Record payment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="payment-amount">Amount (R)</Label>
                    <Input id="payment-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={fieldClass} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Method</Label>
                    <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        {PAYMENT_METHODS.map((item) => (
                          <SelectItem key={item} value={item}>{methodLabel(item)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment-reference">Reference</Label>
                  <Input id="payment-reference" value={reference} maxLength={120} onChange={(event) => setReference(event.target.value)} className={fieldClass} placeholder="EFT ref or receipt" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment-note">Note</Label>
                  <textarea id="payment-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className={`${fieldClass} min-h-20 w-full rounded-md border px-3 py-2 text-sm`} />
                </div>
                <Button type="submit" disabled={saving} className="w-full bg-purple-600 text-white hover:bg-purple-500">
                  {saving ? 'Saving…' : 'Record payment'}
                </Button>
              </form>

              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" className="border-gray-600 text-white hover:bg-gray-800" disabled={saving || row.paymentMethod === 'account'} onClick={() => setConfirmAccount(true)}>
                  Mark on account
                </Button>
                {canPayLink ? (
                  <Button type="button" variant="outline" className="border-gray-600 text-white hover:bg-gray-800" disabled={sending != null} onClick={() => void sendLink('pay')}>
                    {sending === 'pay' ? 'Creating link…' : 'Send pay link'}
                  </Button>
                ) : null}
                {canTopup ? (
                  <Button type="button" variant="outline" className="border-gray-600 text-white hover:bg-gray-800" disabled={sending != null} onClick={() => void sendLink('topup')}>
                    {sending === 'topup' ? 'Creating link…' : 'Send top-up link'}
                  </Button>
                ) : null}
                {link ? (
                  <Input readOnly value={link} className={fieldClass} onFocus={(event) => event.currentTarget.select()} />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-gray-200 hover:bg-gray-800 hover:text-white"
                  onClick={() => {
                    setSearchQuery(row.guestName)
                    router.push('/dashboard/bookings')
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open booking
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Timeline</h3>
                {payments.length === 0 ? <p className="text-sm text-gray-400">No payments yet</p> : null}
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-gray-700 bg-gray-800/80 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatRand(payment.amountCents)} · {methodLabel(payment.method)}</p>
                        <p className="text-gray-400">{formatWhen(payment.paidAt ?? payment.createdAt)} · {payment.status}</p>
                        {payment.reference ? <p className="text-gray-300">Ref {payment.reference}</p> : null}
                        {payment.note ? <p className="text-gray-300">{payment.note}</p> : null}
                        {payment.recordedBy ? (
                          <p className="text-gray-400">{emails.get(payment.recordedBy) ?? 'Staff'}</p>
                        ) : null}
                      </div>
                      {payment.kind === 'manual' && (payment.status === 'succeeded' || payment.status === 'refunded') ? (
                        <Button type="button" size="sm" variant="ghost" className="text-red-300 hover:bg-red-950 hover:text-red-200" onClick={() => { setVoiding(payment); setVoidReason('') }}>
                          Void
                        </Button>
                      ) : null}
                    </div>
                    {payment.yocoPaymentId ? (
                      <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs text-purple-300" onClick={() => void copyText(payment.yocoPaymentId!, 'Yoco id copied')}>
                        <Copy className="h-3 w-3" />
                        {payment.yocoPaymentId}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="px-4 text-sm text-gray-400">Loading…</p>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmAccount} onOpenChange={setConfirmAccount}>
        <AlertDialogContent className="border-gray-700 bg-gray-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark on account?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This booking will be billed to the property on the monthly account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-transparent text-white hover:bg-gray-800">Cancel</AlertDialogCancel>
            <Button className="bg-purple-600 text-white hover:bg-purple-500" disabled={saving} onClick={() => void markOnAccount()}>
              Mark on account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={voiding != null} onOpenChange={(open) => { if (!open) setVoiding(null) }}>
        <AlertDialogContent className="border-gray-700 bg-gray-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payment?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              The row stays in the ledger so there is an audit trail. A reason is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            maxLength={500}
            placeholder="Reason"
            className={`${fieldClass} min-h-24 w-full rounded-md border px-3 py-2 text-sm`}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-transparent text-white hover:bg-gray-800">Cancel</AlertDialogCancel>
            <Button className="bg-red-600 text-white hover:bg-red-500" disabled={saving || voidReason.trim().length === 0} onClick={() => void voidPayment()}>
              Void payment
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
