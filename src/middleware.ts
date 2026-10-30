import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { slugForHost } from '@/config/host-slugs'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next()
  }

  const slug = slugForHost(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  )
  if (!slug) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${slug}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: '/',
}
