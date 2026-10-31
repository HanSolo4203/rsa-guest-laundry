import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { stashInviteFromUrl } from '@/lib/auth/invite-session'
import {
  authScopeFromPath,
  kioskCookieMigration,
  portalCookieMigration,
  KIOSK_AUTH_STORAGE_KEY,
  PORTAL_AUTH_STORAGE_KEY,
  type AuthScope,
  type CookieWrite,
  type StoredCookie,
} from '@/lib/auth/kiosk-session'

const browserClients = new Map<AuthScope, SupabaseClient>()
let legacyKioskCookieMigrated = false
let legacyPortalCookieMigrated = false

function storageKey(scope: AuthScope): string | undefined {
  if (scope === 'kiosk') return KIOSK_AUTH_STORAGE_KEY
  if (scope === 'portal') return PORTAL_AUTH_STORAGE_KEY
  return undefined
}

function browserClientOptions(scope: AuthScope) {
  const name = storageKey(scope)
  return {
    isSingleton: false as const,
    ...(name ? { cookieOptions: { name } } : {}),
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
      const raw = trimmed.slice(separator + 1)
      let value = raw
      try {
        value = decodeURIComponent(raw)
      } catch {
        value = raw
      }
      return {
        name: trimmed.slice(0, separator),
        value,
      }
    })
    .filter((cookie): cookie is StoredCookie => cookie !== null)
}

function writeBrowserCookies(writes: CookieWrite[]) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  for (const write of writes) {
    document.cookie = `${write.name}=${encodeURIComponent(write.value)}; Path=/; Max-Age=${write.maxAge}; SameSite=Lax${secure}`
  }
}

function migrateLegacyKioskCookie() {
  if (typeof document === 'undefined' || legacyKioskCookieMigrated) return
  legacyKioskCookieMigrated = true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return

  writeBrowserCookies(kioskCookieMigration(parseDocumentCookies(document.cookie), supabaseUrl))
}

function migrateLegacyPortalCookie() {
  if (typeof document === 'undefined' || legacyPortalCookieMigrated) return
  legacyPortalCookieMigrated = true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return

  writeBrowserCookies(portalCookieMigration(parseDocumentCookies(document.cookie), supabaseUrl))
}

// Kiosk, property portal, and dashboard keep separate auth cookies so each sign-in can stay active.
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

  stashInviteFromUrl()
  migrateLegacyKioskCookie()
  migrateLegacyPortalCookie()

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

// Property sign-in on the admin page lands in the app cookie. Copy it into the
// portal cookie, then drop the app copy without revoking it. signOut would
// revoke the shared session and log the portal out as well.
export async function moveSessionToPortal(
  session: Pick<Session, 'access_token' | 'refresh_token'>
): Promise<Error | null> {
  if (!session.access_token || !session.refresh_token) {
    return new Error('Could not open the property portal')
  }

  const app = createClient('app')
  await app.auth.stopAutoRefresh()

  const { error } = await createClient('portal').auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) {
    await app.auth.startAutoRefresh()
    return error
  }

  const auth = app.auth as unknown as {
    _removeSession: () => Promise<void>
  }
  await auth._removeSession()
  return null
}

// Guest booking inserts must not reuse a portal or dashboard session.
// Those sessions are authenticated, and authenticated inserts are limited to dashboard admins.
let publicClient: SupabaseClient | null = null

export function createPublicClient() {
  if (publicClient) return publicClient

  publicClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
  return publicClient
}

// Create a client for server-side operations (if needed)
export function createServerClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
