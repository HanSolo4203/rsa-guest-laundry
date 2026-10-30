'use client'

import { createContext, useContext, useMemo } from 'react'

export type KioskStaff = {
  id: string
  name: string
}

type KioskStaffContextValue = {
  staff: KioskStaff | null
  switchStaff: () => void
}

const KioskStaffContext = createContext<KioskStaffContextValue | null>(null)

export function KioskStaffProvider({
  staff,
  switchStaff,
  children,
}: {
  staff: KioskStaff | null
  switchStaff: () => void
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({ staff, switchStaff }),
    [staff, switchStaff]
  )

  return (
    <KioskStaffContext.Provider value={value}>
      {children}
    </KioskStaffContext.Provider>
  )
}

export function useKioskStaff() {
  const context = useContext(KioskStaffContext)
  if (!context) {
    throw new Error('useKioskStaff must be used within a KioskStaffProvider')
  }
  return context
}
