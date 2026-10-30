import type { User } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'kiosk' | 'property'

export function getRole(
  user: Pick<User, 'app_metadata'> | null | undefined
): AppRole | null {
  const role = user?.app_metadata?.role
  if (role === 'admin' || role === 'kiosk' || role === 'property') return role
  return null
}

export function isAdmin(
  user: Pick<User, 'app_metadata'> | null | undefined
): boolean {
  return getRole(user) === 'admin'
}

export function isPropertyUser(
  user: Pick<User, 'app_metadata'> | null | undefined
): boolean {
  return getRole(user) === 'property'
}

export function isKioskUser(
  user: Pick<User, 'app_metadata'> | null | undefined
): boolean {
  return getRole(user) === 'kiosk'
}

export function pathForRole(role: AppRole): '/dashboard' | '/kiosk' | '/portal' {
  if (role === 'admin') return '/dashboard'
  if (role === 'kiosk') return '/kiosk'
  return '/portal'
}
