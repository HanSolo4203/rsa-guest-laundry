const STORAGE_KEY = 'portal-invite'
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

let handled = false

export type StashedInvite =
  | {
      kind: 'session'
      accessToken: string
      refreshToken: string
      propertySlug: string | null
    }
  | { kind: 'error'; message: string }

function propertySlugFromSearch(search: string): string | null {
  const slug = new URLSearchParams(search).get('property')?.trim().toLowerCase() ?? ''
  return SLUG.test(slug) ? slug : null
}

// Invite emails return an implicit-grant hash. The browser client is PKCE and
// treats that hash as a failed login, which clears the current session. Lift
// the tokens out before any Supabase client reads the URL.
export function stashInviteFromUrl(): void {
  if (typeof window === 'undefined' || window.location.pathname !== '/login') return

  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return

  const params = new URLSearchParams(hash)
  const type = params.get('type')
  if (type && type !== 'invite') return

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const errorDescription = params.get('error_description')
  const hasCallback = Boolean(accessToken || refreshToken || errorDescription || params.get('error'))
  if (!hasCallback) return

  const url = new URL(window.location.href)
  url.hash = ''
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)

  if (handled) return
  handled = true

  const payload: StashedInvite =
    type === 'invite' && accessToken && refreshToken
      ? {
          kind: 'session',
          accessToken,
          refreshToken,
          propertySlug: propertySlugFromSearch(window.location.search),
        }
      : {
          kind: 'error',
          message: errorDescription?.replace(/\+/g, ' ') || 'This invite link is invalid or has expired.',
        }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // The hash is already gone, so a later PKCE client will not treat this as a failed login.
  }
}

export function takeStashedInvite(): StashedInvite | null {
  handled = true
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StashedInvite
    if (
      parsed?.kind === 'session' &&
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string'
    ) {
      return parsed
    }
    if (parsed?.kind === 'error' && typeof parsed.message === 'string' && parsed.message) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
