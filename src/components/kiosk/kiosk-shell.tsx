'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DeviceLoginForm } from '@/components/kiosk/device-login-form'
import { KioskWordmark, staffInitials } from '@/components/kiosk/kiosk-ui'
import { PinScreen } from '@/components/kiosk/pin-screen'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/auth-context'
import { MachineTimersProvider } from '@/contexts/machine-timers-context'
import {
  KioskStaffProvider,
  type KioskStaff,
} from '@/contexts/kiosk-staff-context'
import { useIdleLock } from '@/hooks/use-idle-lock'
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock'
import { isKioskUser } from '@/lib/auth/roles'

const tabTriggerClass =
  'min-h-12 rounded-lg text-base text-neutral-600 data-[state=active]:bg-neutral-950 data-[state=active]:text-white data-[state=active]:shadow-none md:min-h-0 md:text-base md:data-[state=active]:bg-white md:data-[state=active]:text-neutral-950 md:data-[state=active]:shadow-sm'

export function KioskShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const [staff, setStaff] = useState<KioskStaff | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [view, setView] = useState('board')

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
      <div className="flex h-full items-center justify-center px-4">
        <p className="flex items-center gap-3 text-base text-neutral-700 md:text-lg">
          <Loader2 className="size-5 animate-spin" />
          Checking this tablet
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DeviceLoginForm />
      </div>
    )
  }

  if (!isKioskUser(user)) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Card className="w-full max-w-sm gap-4 border-neutral-200 bg-white py-6 text-neutral-950 shadow-sm">
          <CardHeader className="gap-2 px-5">
            <KioskWordmark />
            <CardTitle className="text-2xl font-semibold text-neutral-950 md:text-3xl">
              Kiosk account required
            </CardTitle>
            <CardDescription className="text-base leading-snug text-neutral-500 md:text-lg">
              This sign-in is not the tablet account. Sign out, then set the tablet up with the kiosk device email and password.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <Button
              type="button"
              disabled={signingOut}
              className="h-12 min-h-12 w-full rounded-xl bg-neutral-950 text-base text-white hover:bg-neutral-800 md:h-16 md:text-lg"
              onClick={() => {
                setSigningOut(true)
                void signOut().finally(() => setSigningOut(false))
              }}
            >
              {signingOut ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
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
        <TooltipProvider>
          {staff ? (
            <Tabs
              value={view}
              onValueChange={setView}
              className="flex h-full min-h-0 flex-col gap-0"
            >
              <header className="sticky top-0 z-30 shrink-0 border-b border-neutral-200 bg-white pt-[env(safe-area-inset-top)]">
                <div className="flex h-14 items-center gap-3 px-3 md:h-16 md:px-5">
                  <div className="min-w-0 flex-1">
                    <KioskWordmark />
                  </div>
                  <TabsList
                    aria-label="Kiosk"
                    className="fixed inset-x-0 bottom-0 z-40 grid h-auto w-full grid-cols-2 gap-1 rounded-none border-t border-neutral-200 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:z-auto md:flex md:h-11 md:w-auto md:gap-0 md:rounded-lg md:border-0 md:bg-neutral-100 md:p-1"
                  >
                    <TabsTrigger value="board" className={tabTriggerClass}>
                      Board
                    </TabsTrigger>
                    <TabsTrigger value="machines" className={tabTriggerClass}>
                      Machines
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex flex-1 justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                          aria-label={`Staff menu for ${staff.name}`}
                        >
                          <Avatar className="size-12">
                            <AvatarFallback className="bg-neutral-950 text-sm font-semibold text-white">
                              {staffInitials(staff.name)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 border-neutral-200 bg-white text-neutral-950">
                        <DropdownMenuLabel className="truncate text-base font-semibold">
                          {staff.name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-neutral-200" />
                        <DropdownMenuItem
                          className="min-h-12 text-base focus:bg-neutral-100 focus:text-neutral-950"
                          onClick={switchStaff}
                        >
                          Switch staff
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
                {children}
              </div>
            </Tabs>
          ) : (
            <div className="flex h-full items-center justify-center overflow-auto px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <PinScreen onUnlock={setStaff} />
            </div>
          )}
        </TooltipProvider>
      </MachineTimersProvider>
    </KioskStaffProvider>
  )
}
