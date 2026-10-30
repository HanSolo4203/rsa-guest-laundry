import type { User, UserAppMetadata } from '@supabase/supabase-js'
import { isKioskUser, isPropertyUser } from './roles'

export const KIOSK_AUTH_STORAGE_KEY = 'sb-kiosk-auth-token'
export const PORTAL_AUTH_STORAGE_KEY = 'sb-portal-auth-token'

const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60

export type AuthScope = 'app' | 'kiosk' | 'portal'

export type StoredCookie = {
  name: string
  value: string
}

export type CookieWrite = {
  name: string
  value: string
  maxAge: number
}

export function authScopeFromPath(pathname: string): AuthScope {
  if (pathname === '/kiosk' || pathname.startsWith('/kiosk/')) return 'kiosk'
  if (pathname === '/portal' || pathname.startsWith('/portal/')) return 'portal'
  return 'app'
}

export function defaultAuthStorageKey(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

function chunksFor(cookies: StoredCookie[], key: string): StoredCookie[] {
  const exact = cookies.find((cookie) => cookie.name === key)
  if (exact) return [exact]

  const chunks: StoredCookie[] = []
  for (let index = 0; ; index += 1) {
    const chunk = cookies.find((cookie) => cookie.name === `${key}.${index}`)
    if (!chunk) break
    chunks.push(chunk)
  }
  return chunks
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padding)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function sessionUser(chunks: StoredCookie[]): Pick<User, 'app_metadata'> | null {
  const combined = chunks.map((chunk) => chunk.value).join('')
  if (!combined) return null

  try {
    const json = combined.startsWith('base64-')
      ? decodeBase64Url(combined.slice('base64-'.length))
      : combined
    const session = JSON.parse(json) as {
      user?: { app_metadata?: UserAppMetadata }
    }
    const appMetadata = session.user?.app_metadata
    if (!appMetadata) return null
    return { app_metadata: appMetadata }
  } catch {
    return null
  }
}

function relocateSessionCookie(
  cookies: StoredCookie[],
  fromKey: string,
  toKey: string,
  shouldMove: (user: Pick<User, 'app_metadata'> | null) => boolean
): CookieWrite[] {
  if (chunksFor(cookies, toKey).length > 0) return []

  const fromChunks = chunksFor(cookies, fromKey)
  if (fromChunks.length === 0 || !shouldMove(sessionUser(fromChunks))) return []

  return fromChunks.flatMap((chunk) => {
    const suffix = chunk.name.slice(fromKey.length)
    return [
      {
        name: toKey + suffix,
        value: chunk.value,
        maxAge: COOKIE_MAX_AGE_SECONDS,
      },
      { name: chunk.name, value: '', maxAge: 0 },
    ]
  })
}

/**
 * Move a kiosk device session out of the shared app cookie.
 * Later dashboard sign-ins then replace only the app cookie.
 */
export function kioskCookieMigration(cookies: StoredCookie[], supabaseUrl: string): CookieWrite[] {
  return relocateSessionCookie(
    cookies,
    defaultAuthStorageKey(supabaseUrl),
    KIOSK_AUTH_STORAGE_KEY,
    isKioskUser
  )
}

/**
 * Move a property portal session out of the shared app cookie.
 * Dashboard sign-in then replaces only the app cookie.
 */
export function portalCookieMigration(cookies: StoredCookie[], supabaseUrl: string): CookieWrite[] {
  return relocateSessionCookie(
    cookies,
    defaultAuthStorageKey(supabaseUrl),
    PORTAL_AUTH_STORAGE_KEY,
    isPropertyUser
  )
}
