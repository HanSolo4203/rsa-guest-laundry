'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  createMachine,
  createStaff,
  getMachines,
  getStaff,
  setMachineActive,
  setStaffActive,
  setStaffPin,
  type StaffMember,
} from '@/lib/supabase/services'
import type { Machine, MachineType } from '@/lib/types/database'

const PIN_PATTERN = /^[0-9]{4}$/

function machineLabel(machine: Machine): string {
  if (machine.name?.trim()) return machine.name
  return `${machine.type === 'washer' ? 'Washer' : 'Dryer'} ${machine.number}`
}

export function KioskAdminSettings() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState('')
  const [newStaffPin, setNewStaffPin] = useState('')
  const [addingStaff, setAddingStaff] = useState(false)
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({})
  const [savingPinId, setSavingPinId] = useState<string | null>(null)
  const [machineNumber, setMachineNumber] = useState('')
  const [machineType, setMachineType] = useState<MachineType>('washer')
  const [machineName, setMachineName] = useState('')
  const [addingMachine, setAddingMachine] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [staffRows, machineRows] = await Promise.all([getStaff(), getMachines()])
      setStaff(staffRows)
      setMachines(machineRows)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load kiosk settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleAddStaff = async () => {
    const name = staffName.trim()
    if (!name) {
      toast.error('Enter a staff name')
      return
    }
    if (!PIN_PATTERN.test(newStaffPin)) {
      toast.error('PIN must be 4 digits')
      return
    }

    try {
      setAddingStaff(true)
      await createStaff(name, newStaffPin)
      setStaffName('')
      setNewStaffPin('')
      toast.success(`${name} added`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add staff')
    } finally {
      setAddingStaff(false)
    }
  }

  const handleStaffActive = async (member: StaffMember, active: boolean) => {
    setStaff((current) => current.map((row) => (row.id === member.id ? { ...row, active } : row)))
    try {
      await setStaffActive(member.id, active)
    } catch (error) {
      setStaff((current) => current.map((row) => (row.id === member.id ? { ...row, active: member.active } : row)))
      toast.error(error instanceof Error ? error.message : 'Failed to update staff')
    }
  }

  const handleSetPin = async (member: StaffMember) => {
    const pin = pinDrafts[member.id] ?? ''
    if (!PIN_PATTERN.test(pin)) {
      toast.error('PIN must be 4 digits')
      return
    }

    try {
      setSavingPinId(member.id)
      await setStaffPin(member.id, pin)
      setPinDrafts((current) => ({ ...current, [member.id]: '' }))
      toast.success(`PIN updated for ${member.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set PIN')
    } finally {
      setSavingPinId(null)
    }
  }

  const handleAddMachine = async () => {
    const number = Number(machineNumber)
    if (!Number.isInteger(number) || number < 1) {
      toast.error('Enter a machine number')
      return
    }

    try {
      setAddingMachine(true)
      await createMachine({
        number,
        type: machineType,
        name: machineName,
      })
      setMachineNumber('')
      setMachineName('')
      toast.success('Machine added')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add machine')
    } finally {
      setAddingMachine(false)
    }
  }

  const handleMachineActive = async (machine: Machine, active: boolean) => {
    setMachines((current) => current.map((row) => (row.id === machine.id ? { ...row, active } : row)))
    try {
      await setMachineActive(machine.id, active)
    } catch (error) {
      setMachines((current) => current.map((row) => (row.id === machine.id ? { ...row, active: machine.active } : row)))
      toast.error(error instanceof Error ? error.message : 'Failed to update machine')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>
            Add kiosk staff and set a 4-digit PIN. PINs are hashed before they are stored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                placeholder="Staff name"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-pin">PIN</Label>
              <Input
                id="staff-pin"
                value={newStaffPin}
                onChange={(event) => setNewStaffPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="4 digits"
                type="password"
              />
            </div>
            <Button onClick={handleAddStaff} disabled={addingStaff}>
              {addingStaff ? 'Adding…' : 'Add staff'}
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading staff…</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {staff.map((member) => (
                <li key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.active ? 'Active' : 'Inactive'}</div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`staff-active-${member.id}`} className="text-sm">Active</Label>
                      <Switch
                        id={`staff-active-${member.id}`}
                        checked={member.active}
                        onCheckedChange={(checked) => handleStaffActive(member, checked)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`New PIN for ${member.name}`}
                        value={pinDrafts[member.id] ?? ''}
                        onChange={(event) => setPinDrafts((current) => ({
                          ...current,
                          [member.id]: event.target.value.replace(/\D/g, '').slice(0, 4),
                        }))}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        placeholder="New PIN"
                        type="password"
                        className="w-28"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleSetPin(member)}
                        disabled={savingPinId === member.id}
                      >
                        {savingPinId === member.id ? 'Saving…' : 'Set PIN'}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Machines</CardTitle>
          <CardDescription>
            Add a washer or dryer, or deactivate one that is out of service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[8rem_10rem_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="machine-number">Number</Label>
              <Input
                id="machine-number"
                value={machineNumber}
                onChange={(event) => setMachineNumber(event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-type">Type</Label>
              <Select value={machineType} onValueChange={(value: MachineType) => setMachineType(value)}>
                <SelectTrigger id="machine-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="washer">Washer</SelectItem>
                  <SelectItem value="dryer">Dryer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine-name">Name</Label>
              <Input
                id="machine-name"
                value={machineName}
                onChange={(event) => setMachineName(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button onClick={handleAddMachine} disabled={addingMachine}>
              {addingMachine ? 'Adding…' : 'Add machine'}
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading machines…</p>
          ) : machines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No machines yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {machines.map((machine) => (
                <li key={machine.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="font-medium">{machineLabel(machine)}</div>
                    <div className="text-sm capitalize text-muted-foreground">
                      {machine.type} {machine.number}
                      {machine.active ? '' : ' · inactive'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`machine-active-${machine.id}`} className="text-sm">Active</Label>
                    <Switch
                      id={`machine-active-${machine.id}`}
                      checked={machine.active}
                      onCheckedChange={(checked) => handleMachineActive(machine, checked)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
