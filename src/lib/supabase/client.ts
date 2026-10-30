import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  authScopeFromPath,
  kioskCookieMigration,
  KIOSK_AUTH_STORAGE_KEY,
  type AuthScope,
  type StoredCookie,
} from '@/lib/auth/kiosk-session'

const browserClients = new Map<AuthScope, SupabaseClient>()
let legacyKioskCookieMigrated = false

function browserClientOptions(scope: AuthScope) {
  return {
    isSingleton: false as const,
    ...(scope === 'kiosk'
      ? { cookieOptions: { name: KIOSK_AUTH_STORAGE_KEY } }
      : {}),
  }
}

function parseDocumentCookies(cookieHeader: string): StoredCookie[] {
  if (!cookieHeader) return []

  return cookieHeader
    .split(';')
    .map((part) => {
      const trimmed = part.trim()
      const separator = trimmed.indexOf('=')
      if (separator <= 0) return null
      return {
        name: trimmed.slice(0, separator),
        value: trimmed.slice(separator + 1),
      }
    })
    .filter((cookie): cookie is StoredCookie => cookie !== null)
}

function migrateLegacyKioskCookie() {
  if (typeof document === 'undefined' || legacyKioskCookieMigrated) return
  legacyKioskCookieMigrated = true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return

  const writes = kioskCookieMigration(parseDocumentCookies(document.cookie), supabaseUrl)
  for (const write of writes) {
    document.cookie = `${write.name}=${encodeURIComponent(write.value)}; Path=/; Max-Age=${write.maxAge}; SameSite=Lax`
  }
}

// Kiosk and dashboard keep separate auth cookies so each sign-in can stay active.
export function createClient(scope?: AuthScope) {
  const resolved =
    scope ??
    (typeof window === 'undefined'
      ? 'app'
      : authScopeFromPath(window.location.pathname))

  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      browserClientOptions(resolved)
    )
  }

  migrateLegacyKioskCookie()

  const cached = browserClients.get(resolved)
  if (cached) return cached

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    browserClientOptions(resolved)
  )
  browserClients.set(resolved, client)
  return client
}

// Create a client for server-side operations (if needed)
export function createServerClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
