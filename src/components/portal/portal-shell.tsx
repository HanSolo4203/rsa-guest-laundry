'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { portalFont } from '@/components/portal/font'
import { PortalLogin } from '@/components/portal/portal-login'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { getRole } from '@/lib/auth/roles'
import { propertyPortalPath } from '@/lib/property-booking-link'
import { unlockKioskChime } from '@/lib/kiosk/chime'
import { parsePortalProperty, portalOnPrimary, portalPrimary, safeHttpUrl } from '@/lib/portal/board'
import { createClient } from '@/lib/supabase/client'
import type { PortalProperty } from '@/lib/types/database'

type PortalContextValue = {
  properties: PortalProperty[]
  property: PortalProperty | null
  slug: string | null
  loading: boolean
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function usePortalProperty() {
  const value = useContext(PortalContext)
  if (!value) throw new Error('usePortalProperty must be used within the portal')
  return value
}

function portalSlugFromParams(slug: string | string[] | undefined): string | null {
  if (typeof slug !== 'string') return null
  const normalized = slug.toLowerCase()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : null
}

function accountInitials(email: string | undefined): string {
  const local = email?.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }
  const letters = local.slice(0, 2)
  return letters ? letters.toUpperCase() : '?'
}

function propertyInitial(name: string): string {
  const char = Array.from(name.trim())[0]
  return char ? char.toLocaleUpperCase('en') : '?'
}

function PropertyMark({ property }: { property: PortalProperty }) {
  const logo = safeHttpUrl(property.logo_url)
  const primary = portalPrimary(property.primary_color)
  return (
    <span className="inline-flex shrink-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${primary}` }}>
      <Avatar size="lg" className="size-10 bg-white">
        {logo ? <AvatarImage src={logo} alt="" /> : null}
        <AvatarFallback
          className="text-sm font-semibold"
          style={{ backgroundColor: primary, color: portalOnPrimary(property.primary_color) }}
        >
          {propertyInitial(property.name)}
        </AvatarFallback>
      </Avatar>
    </span>
  )
}

function PortalProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const slug = portalSlugFromParams(params.slug)
  const [properties, setProperties] = useState<PortalProperty[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient('portal')

    void supabase
      .from('properties')
      .select('id, slug, name, logo_url, primary_color, show_prices')
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error(error)
          toast.error('Could not load your properties')
          setProperties([])
          return
        }
        const rows = (data ?? []).flatMap((row) => {
          const property = parsePortalProperty(row)
          return property ? [property] : []
        })
        rows.sort((a, b) => a.name.localeCompare(b.name))
        setProperties(rows)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const property = slug ? properties?.find((item) => item.slug === slug) ?? null : null
  const value = useMemo<PortalContextValue>(
    () => ({
      properties: properties ?? [],
      property,
      slug,
      loading: properties == null,
    }),
    [properties, property, slug]
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

function Brand() {
  const { properties, property, loading } = usePortalProperty()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-10 rounded-full bg-slate-200" />
        <Skeleton className="h-5 w-32 bg-slate-200" />
      </div>
    )
  }

  if (!property) {
    return <p className="text-base font-semibold text-slate-950">Your properties</p>
  }

  const mark = <PropertyMark property={property} />
  if (properties.length < 2) {
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        {mark}
        <span className="truncate text-base font-semibold tracking-tight text-slate-950">{property.name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 max-w-full cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label={`Switch property, current ${property.name}`}
        >
          {mark}
          <span className="truncate text-base font-semibold tracking-tight text-slate-950">{property.name}</span>
          <ChevronDown className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] border-slate-200 bg-white text-slate-900 shadow-lg"
      >
        <DropdownMenuLabel className="text-slate-500">Property</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuRadioGroup
          value={property.id}
          onValueChange={(id) => {
            const next = properties.find((item) => item.id === id)
            if (next) router.push(propertyPortalPath(next.slug))
          }}
        >
          {properties.map((item) => (
            <DropdownMenuRadioItem
              key={item.id}
              value={item.id}
              className="min-h-11 cursor-pointer pl-8 text-slate-900 focus:bg-slate-100 focus:text-slate-900"
            >
              <span className="truncate">{item.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      toast.success('Signed out')
    } catch (error) {
      console.error(error)
      toast.error('Could not sign out')
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Account menu"
        >
          <Avatar>
            <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
              {accountInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 border-slate-200 bg-white text-slate-900 shadow-lg"
      >
        <DropdownMenuLabel className="truncate font-normal text-slate-500">
          {user?.email ?? 'Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={() => {
            void handleSignOut()
          }}
          className="min-h-11 cursor-pointer text-slate-900 focus:bg-slate-100 focus:text-slate-900"
        >
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PortalHeader() {
  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="h-1" style={{ backgroundColor: 'var(--portal-primary)' }} />
        <header className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <Brand />
          </div>
          <UserMenu />
        </header>
      </div>
    </div>
  )
}

function PortalLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full bg-slate-200" />
        <Skeleton className="h-5 w-36 bg-slate-200" />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        <Skeleton className="h-20 rounded-2xl bg-slate-200" />
        <Skeleton className="h-20 rounded-2xl bg-slate-200" />
        <Skeleton className="h-20 rounded-2xl bg-slate-200" />
      </div>
      <Skeleton className="mt-4 h-24 rounded-2xl bg-slate-200" />
      <Skeleton className="mt-3 h-24 rounded-2xl bg-slate-200" />
    </div>
  )
}

function NotLinked() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-950">No property linked</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        This account is not linked to a property yet. Ask your laundry admin to add you.
      </p>
    </main>
  )
}

function NoAccess() {
  const { properties } = usePortalProperty()
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-950">No access to this property</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        This account is not linked to this portal.
      </p>
      {properties.length > 0 ? (
        <ul className="mt-6 space-y-2 text-left">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={propertyPortalPath(property.slug)}
                className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900"
              >
                {property.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  )
}

function PortalFrame({ children }: { children: ReactNode }) {
  const portal = usePortalProperty()
  const primary = portalPrimary(portal.property?.primary_color)
  let body = children
  if (!portal.loading && portal.properties.length === 0) body = <NotLinked />
  else if (!portal.loading && portal.slug && !portal.property) body = <NoAccess />

  return (
    <div className="min-h-dvh" style={{ '--portal-primary': primary } as CSSProperties}>
      <PortalHeader />
      {body}
    </div>
  )
}

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const role = getRole(user)
  const clearedForeignSession = useRef(false)

  useEffect(() => {
    document.body.classList.add(portalFont.className)
    return () => document.body.classList.remove(portalFont.className)
  }, [])

  useEffect(() => {
    const unlock = () => unlockKioskChime()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    if (loading || !user || role === 'property' || clearedForeignSession.current) return
    clearedForeignSession.current = true
    void signOut()
  }, [loading, user, role, signOut])

  if (loading || (user && role !== 'property')) return <PortalLoading />
  if (!user) return <PortalLogin />

  return (
    <PortalProvider>
      <PortalFrame>{children}</PortalFrame>
    </PortalProvider>
  )
}
