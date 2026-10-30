import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { UserAppMetadata } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { slugForHost } from '@/config/host-slugs'
import { PORTAL_AUTH_STORAGE_KEY, portalCookieMigration, type CookieWrite } from '@/lib/auth/kiosk-session'
import { getRole, pathForRole, type AppRole } from '@/lib/auth/roles'

type PendingCookie = {
  name: string
  value: string
  options: CookieOptions
}

type AppArea = 'dashboard' | 'portal'

function appArea(pathname: string): AppArea | null {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'dashboard'
  if (pathname === '/portal' || pathname.startsWith('/portal/')) return 'portal'
  return null
}

function allowedRole(area: AppArea): AppRole {
  return area === 'dashboard' ? 'admin' : 'property'
}

function applyWritesToRequest(request: NextRequest, writes: CookieWrite[]) {
  for (const write of writes) {
    if (write.maxAge <= 0) request.cookies.delete(write.name)
    else request.cookies.set(write.name, write.value)
  }
}

function stampMigration(response: NextResponse, writes: CookieWrite[], skip: Set<string>, secure: boolean) {
  for (const write of writes) {
    if (skip.has(write.name)) continue
    response.cookies.set(write.name, write.value, {
      path: '/',
      maxAge: write.maxAge,
      sameSite: 'lax',
      httpOnly: false,
      secure,
    })
  }
  return response
}

// Dashboard and portal keep separate auth cookies. A dashboard sign-in must
// not replace the property portal session. The kiosk tablet has its own cookie
// too, so this guard must not run on /kiosk.
async function enforceAppArea(request: NextRequest, area: AppArea) {
  const pending: PendingCookie[] = []
  let supabaseResponse = NextResponse.next({ request })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const migration = area === 'portal' ? portalCookieMigration(request.cookies.getAll(), supabaseUrl) : []
  applyWritesToRequest(request, migration)

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: area === 'portal' ? { name: PORTAL_AUTH_STORAGE_KEY } : undefined,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        pending.splice(0, pending.length, ...cookiesToSet)
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const secure = request.nextUrl.protocol === 'https:'
  const finish = (response: NextResponse) =>
    stampMigration(response, migration, new Set(pending.map((cookie) => cookie.name)), secure)

  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    pending.forEach(({ name, value, options }) => {
      redirect.cookies.set(name, value, options)
    })
    return finish(redirect)
  }

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as { app_metadata?: UserAppMetadata } | undefined
  const url = request.nextUrl.clone()
  url.search = ''

  if (!claims) {
    if (area === 'portal') return finish(supabaseResponse)
    url.pathname = '/login'
    return redirectWithCookies(url)
  }

  // Tokens issued before the role backfill have no app_metadata.role. Refresh
  // once so an existing admin picks up role = admin before we deny them.
  let role = getRole({ app_metadata: claims.app_metadata ?? {} })
  if (!role) {
    try {
      const { data: refreshed } = await supabase.auth.refreshSession()
      role = getRole(refreshed.user)
    } catch {
      role = null
    }
  }

  if (area === 'portal') {
    if (role === 'property') return finish(supabaseResponse)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // The portal page shows its own sign-in when this cookie cannot be used.
    }
    return finish(supabaseResponse)
  }

  if (role === allowedRole(area)) return supabaseResponse

  if (role === 'admin' || role === 'kiosk' || role === 'property') {
    url.pathname = pathForRole(role)
    return redirectWithCookies(url)
  }

  await supabase.auth.signOut()
  url.pathname = '/login'
  url.searchParams.set('error', 'no-access')
  return redirectWithCookies(url)
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const slug = slugForHost(
      request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    )
    if (!slug) return NextResponse.next()

    const url = request.nextUrl.clone()
    url.pathname = `/${slug}`
    return NextResponse.rewrite(url)
  }

  const { pathname } = request.nextUrl
  if (pathname.endsWith('.webmanifest')) return NextResponse.next()

  const area = appArea(pathname)
  if (!area) return NextResponse.next()
  return enforceAppArea(request, area)
}

export const config = {
  matcher: ['/', '/dashboard', '/dashboard/:path*', '/portal', '/portal/:path*'],
}
