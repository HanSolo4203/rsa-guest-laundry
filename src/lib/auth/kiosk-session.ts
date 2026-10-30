import { isKioskUser } from './roles'

export const KIOSK_AUTH_STORAGE_KEY = 'sb-kiosk-auth-token'

const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60

export type AuthScope = 'app' | 'kiosk'

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
  return pathname === '/kiosk' || pathname.startsWith('/kiosk/') ? 'kiosk' : 'app'
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

function sessionUser(chunks: StoredCookie[]) {
  const combined = chunks.map((chunk) => chunk.value).join('')
  if (!combined) return null

  try {
    const json = combined.startsWith('base64-')
      ? decodeBase64Url(combined.slice('base64-'.length))
      : combined
    const session = JSON.parse(json) as {
      user?: { app_metadata?: { role?: string } }
    }
    return session.user ?? null
  } catch {
    return null
  }
}

/**
 * Move a kiosk device session out of the shared app cookie.
 * Later dashboard sign-ins then replace only the app cookie.
 */
export function kioskCookieMigration(
  cookies: StoredCookie[],
  supabaseUrl: string
): CookieWrite[] {
  const appKey = defaultAuthStorageKey(supabaseUrl)
  if (chunksFor(cookies, KIOSK_AUTH_STORAGE_KEY).length > 0) return []

  const appChunks = chunksFor(cookies, appKey)
  if (appChunks.length === 0 || !isKioskUser(sessionUser(appChunks))) return []

  return appChunks.flatMap((chunk) => {
    const suffix = chunk.name.slice(appKey.length)
    return [
      {
        name: KIOSK_AUTH_STORAGE_KEY + suffix,
        value: chunk.value,
        maxAge: COOKIE_MAX_AGE_SECONDS,
      },
      { name: chunk.name, value: '', maxAge: 0 },
    ]
  })
}
