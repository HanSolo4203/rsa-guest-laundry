import type { User } from '@supabase/supabase-js'

export function isKioskUser(
  user: Pick<User, 'app_metadata'> | null | undefined
): boolean {
  return user?.app_metadata?.role === 'kiosk'
}
