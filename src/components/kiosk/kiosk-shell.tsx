'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { MachineTimersProvider } from '@/contexts/machine-timers-context'
import {
  KioskStaffProvider,
  type KioskStaff,
} from '@/contexts/kiosk-staff-context'
import { useIdleLock } from '@/hooks/use-idle-lock'
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock'
import { isKioskUser } from '@/lib/auth/roles'
import { DeviceLoginForm } from '@/components/kiosk/device-login-form'
import { PinScreen } from '@/components/kiosk/pin-screen'

export function KioskShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const [staff, setStaff] = useState<KioskStaff | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const switchStaff = useCallback(() => {
    setStaff(null)
  }, [])

  useScreenWakeLock()
  useIdleLock(staff !== null, switchStaff)

  useEffect(() => {
    if (loading || isKioskUser(user)) return
    setStaff(null)
  }, [loading, user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="flex items-center gap-4 text-[22px] text-neutral-950">
          <Loader2 className="size-8 animate-spin" />
          Checking this tablet
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto p-8">
        <DeviceLoginForm />
      </div>
    )
  }

  if (!isKioskUser(user)) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto p-8">
        <Card className="w-full max-w-xl border-2 border-neutral-950 bg-white text-neutral-950 shadow-none">
          <CardHeader className="gap-3">
            <CardTitle className="text-4xl font-semibold text-neutral-950">
              Kiosk account required
            </CardTitle>
            <CardDescription className="text-[22px] leading-snug text-neutral-800">
              This sign-in is not the tablet account. Sign out, then set the tablet up with the kiosk device email and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              disabled={signingOut}
              className="h-16 min-h-16 w-full rounded-xl bg-neutral-950 text-[22px] text-white hover:bg-neutral-800"
              onClick={() => {
                setSigningOut(true)
                void signOut().finally(() => setSigningOut(false))
              }}
            >
              {signingOut ? (
                <>
                  <Loader2 className="size-6 animate-spin" />
                  Signing out
                </>
              ) : (
                'Sign out'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <KioskStaffProvider staff={staff} switchStaff={switchStaff}>
      <MachineTimersProvider>
      {staff ? (
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-end gap-4 border-b-2 border-neutral-950 px-6 py-3">
            <p className="max-w-[50vw] truncate text-right text-[22px] font-semibold text-neutral-950">
              {staff.name}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-16 min-h-16 shrink-0 rounded-xl border-2 border-neutral-950 bg-white px-6 text-[22px] font-semibold text-neutral-950 shadow-none hover:bg-neutral-100"
              onClick={switchStaff}
            >
              Switch staff
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center overflow-auto px-8 py-4">
          <PinScreen onUnlock={setStaff} />
        </div>
      )}
      </MachineTimersProvider>
    </KioskStaffProvider>
  )
}
