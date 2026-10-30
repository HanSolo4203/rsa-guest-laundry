'use client'

import { useEffect, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const PHONE_QUERY = '(max-width: 767px)'

function usePhoneLayout() {
  const [phone, setPhone] = useState<boolean | null>(null)

  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY)
    const update = () => setPhone(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return phone
}

type KioskPanelProps = {
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  avoidToast?: boolean
  children: React.ReactNode
}

export function KioskPanel({
  onOpenChange,
  title,
  description,
  avoidToast = false,
  children,
}: KioskPanelProps) {
  const phone = usePhoneLayout()
  if (phone === null) return null

  const body = (
    <div className={cn('flex min-h-0 flex-1 flex-col', avoidToast && 'pb-36 md:pb-24')}>
      {children}
    </div>
  )

  if (phone) {
    return (
      <Drawer open onOpenChange={onOpenChange} handleOnly>
        <DrawerContent className="flex h-[96dvh] max-h-[96dvh] flex-col overflow-hidden border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] text-neutral-950">
          <DrawerHeader className="sr-only text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-full w-full gap-0 overflow-hidden border-neutral-200 bg-white p-0 text-neutral-950 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
