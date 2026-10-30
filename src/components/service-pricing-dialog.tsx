'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Service } from '@/lib/types/database'
import { getPricingTiers, saveServicePricing, type PricingTierInput } from '@/lib/supabase/services'

interface ServicePricingDialogProps {
  service: Service | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}

type DraftTier = {
  key: string
  min_weight: string
  max_weight: string
  price: string
}

const pricingSchema = z.array(z.object({
  min_weight: z.number(),
  max_weight: z.number(),
  price: z.number(),
})).min(1, 'Add at least one tier').superRefine((tiers, ctx) => {
  tiers.forEach((tier, index) => {
    if (!(tier.price > 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Price must be greater than 0',
        path: [index, 'price'],
      })
    }
    if (tier.min_weight < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Min kg must be 0 or more',
        path: [index, 'min_weight'],
      })
    }
    if (!(tier.min_weight < tier.max_weight)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Min kg must be less than max kg',
        path: [index, 'min_weight'],
      })
    }
  })

  const sorted = tiers
    .map((tier, index) => ({ ...tier, index }))
    .sort((a, b) => a.min_weight - b.min_weight)

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min_weight <= sorted[i - 1].max_weight) {
      ctx.addIssue({
        code: 'custom',
        message: 'Tiers must not overlap',
        path: [sorted[i].index, 'min_weight'],
      })
    }
  }
})

function newDraftTier(): DraftTier {
  return {
    key: crypto.randomUUID(),
    min_weight: '',
    max_weight: '',
    price: '',
  }
}

const inputClassName = 'h-11 text-base bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800'

export function ServicePricingDialog({ service, open, onOpenChange, onSaved }: ServicePricingDialogProps) {
  const [tiers, setTiers] = useState<DraftTier[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open || !service) return

    const serviceId = service.id
    let cancelled = false

    async function loadTiers() {
      setLoading(true)
      setRowErrors({})
      try {
        const data = await getPricingTiers(serviceId)
        if (cancelled) return
        setTiers(data.length === 0 ? [newDraftTier()] : data.map((tier) => ({
          key: tier.id,
          min_weight: String(tier.min_weight),
          max_weight: String(tier.max_weight),
          price: String(tier.price),
        })))
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load pricing'
        toast.error(message)
        setTiers([newDraftTier()])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadTiers()
    return () => {
      cancelled = true
    }
  }, [open, service])

  const updateTier = (key: string, field: keyof Omit<DraftTier, 'key'>, value: string) => {
    setTiers((current) => current.map((tier) => (
      tier.key === key ? { ...tier, [field]: value } : tier
    )))
  }

  const handleSave = async () => {
    if (!service) return

    const rowErrorsNext: Record<number, string> = {}
    const parsed: Array<PricingTierInput | null> = tiers.map((tier, index) => {
      const min = Number(tier.min_weight)
      const max = Number(tier.max_weight)
      const price = Number(tier.price)
      if (
        tier.min_weight.trim() === '' ||
        tier.max_weight.trim() === '' ||
        tier.price.trim() === '' ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        !Number.isFinite(price)
      ) {
        rowErrorsNext[index] = 'Enter a min kg, max kg, and price'
        return null
      }
      return { min_weight: min, max_weight: max, price }
    })

    if (parsed.some((tier) => tier === null)) {
      setRowErrors(rowErrorsNext)
      toast.error('Enter a min kg, max kg, and price for every tier')
      return
    }

    const result = pricingSchema.safeParse(parsed)
    if (!result.success) {
      const nextErrors: Record<number, string> = {}
      for (const issue of result.error.issues) {
        const index = typeof issue.path[0] === 'number' ? issue.path[0] : -1
        if (index >= 0 && !nextErrors[index]) nextErrors[index] = issue.message
      }
      setRowErrors(nextErrors)
      toast.error(result.error.issues[0]?.message ?? 'Pricing is invalid')
      return
    }

    try {
      setSaving(true)
      setRowErrors({})
      await saveServicePricing(service.id, result.data)
      toast.success(`Pricing for "${service.name}" updated`)
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save pricing'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] mx-4 max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Edit pricing{service ? ` — ${service.name}` : ''}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
            Set the weight bands and price for each tier. The service price range updates when you save.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading pricing...</div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                    <TableHead className="font-semibold text-gray-900 dark:text-white">Min kg</TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-white">Max kg</TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-white">Price (R)</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier, index) => (
                    <TableRow key={tier.key} className="border-b border-gray-200 dark:border-gray-700">
                      <TableCell className="align-top py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={tier.min_weight}
                          onChange={(event) => updateTier(tier.key, 'min_weight', event.target.value)}
                          className={inputClassName}
                          aria-label={`Tier ${index + 1} minimum kg`}
                        />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={tier.max_weight}
                          onChange={(event) => updateTier(tier.key, 'max_weight', event.target.value)}
                          className={inputClassName}
                          aria-label={`Tier ${index + 1} maximum kg`}
                        />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.price}
                          onChange={(event) => updateTier(tier.key, 'price', event.target.value)}
                          className={inputClassName}
                          aria-label={`Tier ${index + 1} price`}
                        />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setTiers((current) => current.filter((item) => item.key !== tier.key))}
                          className="h-11 w-11 text-red-300 hover:text-red-200 hover:bg-red-900/40"
                          title="Remove tier"
                          aria-label={`Remove tier ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {Object.entries(rowErrors).map(([index, message]) => (
              <p key={index} className="text-sm text-red-500 dark:text-red-400">
                Tier {Number(index) + 1}: {message}
              </p>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => setTiers((current) => [...current, newDraftTier()])}
              className="h-11 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add tier
            </Button>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto h-11 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl"
          >
            {saving ? 'Saving...' : 'Save pricing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
