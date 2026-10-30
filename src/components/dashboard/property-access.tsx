'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  invitePropertyUser,
  listPropertyMembers,
  removePropertyAccess,
  setPropertyShowPrices,
} from '@/app/dashboard/properties/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PropertyLinkActions } from '@/components/dashboard/property-link-actions'
import type { Property, PropertyMember, PropertyMemberRole } from '@/lib/types/database'

const controlClass = 'border-gray-600 bg-gray-700 text-white placeholder:text-gray-400'

export function PropertyAccess({
  property,
  onShowPrices,
}: {
  property: Property
  onShowPrices?: (property: Property) => void
}) {
  const [members, setMembers] = useState<PropertyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PropertyMemberRole>('staff')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [showPrices, setShowPrices] = useState(property.show_prices)
  const [savingPrices, setSavingPrices] = useState(false)

  useEffect(() => {
    setShowPrices(property.show_prices)
  }, [property.show_prices])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listPropertyMembers(property.id)
      .then((rows) => {
        if (!cancelled) setMembers(rows)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Could not load access')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [property.id])

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    setInviting(true)
    try {
      await invitePropertyUser(property.id, email, role)
      const rows = await listPropertyMembers(property.id)
      setMembers(rows)
      setEmail('')
      toast.success('Invite sent')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Could not invite that user')
    } finally {
      setInviting(false)
    }
  }

  async function remove(userId: string) {
    setRemovingId(userId)
    try {
      await removePropertyAccess(property.id, userId)
      setMembers((current) => current.filter((member) => member.userId !== userId))
      setConfirmRemoveId(null)
      toast.success('Access removed')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Could not remove access')
    } finally {
      setRemovingId(null)
    }
  }

  async function togglePrices(next: boolean) {
    setShowPrices(next)
    setSavingPrices(true)
    try {
      const saved = await setPropertyShowPrices(property.id, next)
      onShowPrices?.(saved)
      toast.success(next ? 'Prices are visible in the portal' : 'Prices are hidden in the portal')
    } catch (error) {
      console.error(error)
      setShowPrices(property.show_prices)
      toast.error(error instanceof Error ? error.message : 'Could not update prices')
    } finally {
      setSavingPrices(false)
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Access</h2>
        <p className="mt-1 text-sm text-gray-400">
          People who can open the portal for {property.name}. That sign-in stays separate from the admin dashboard.
        </p>
      </div>

      <PropertyLinkActions slug={property.slug} kind="portal" />

      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-700 px-3 py-3">
        <div>
          <p className="text-sm font-medium text-white">Show prices</p>
          <p className="text-sm text-gray-400">When this is on, the portal includes the booking total.</p>
        </div>
        <Switch checked={showPrices} disabled={savingPrices} onCheckedChange={(checked) => void togglePrices(checked)} />
      </div>

      <form onSubmit={(event) => void invite(event)} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <label className="space-y-2 text-sm text-gray-200">
          Email
          <Input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@property.com"
            className={controlClass}
          />
        </label>
        <label className="space-y-2 text-sm text-gray-200">
          Role
          <Select value={role} onValueChange={(value) => setRole(value === 'manager' ? 'manager' : 'staff')}>
            <SelectTrigger className={`w-full ${controlClass}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800 text-white">
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <Button type="submit" disabled={inviting} className="bg-purple-600 text-white hover:bg-purple-700">
          {inviting ? 'Inviting…' : 'Invite user'}
        </Button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-gray-300">Loading access…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-300">No one has access yet.</p>
        ) : (
          members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-col gap-3 rounded-lg border border-gray-700 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{member.email}</p>
                <p className="text-xs capitalize text-gray-400">{member.memberRole}</p>
              </div>
              {confirmRemoveId === member.userId ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={removingId === member.userId}
                    onClick={() => void remove(member.userId)}
                    className="bg-red-700 text-white hover:bg-red-600"
                  >
                    {removingId === member.userId ? 'Removing…' : 'Confirm remove'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmRemoveId(null)}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmRemoveId(member.userId)}
                  className="border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Remove access
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
