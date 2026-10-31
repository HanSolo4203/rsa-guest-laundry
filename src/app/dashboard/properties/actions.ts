'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient, type User } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { isAdmin } from '@/lib/auth/roles'
import type { Property, PropertyMember, PropertyMemberRole } from '@/lib/types/database'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function sessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured')

  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Middleware refreshes the session cookie.
      },
    },
  })
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Property invites are not configured')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function requireAdmin() {
  const supabase = await sessionClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !isAdmin(data.user)) {
    throw new Error('Admin access required')
  }
  return supabase
}

function requireUuid(value: string, label: string) {
  if (!UUID.test(value)) throw new Error(`${label} is not valid`)
}

function memberRole(value: string): PropertyMemberRole {
  if (value === 'manager' || value === 'staff') return value
  throw new Error('Choose manager or staff')
}

function alreadyRegistered(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ''
  return (
    error.code === 'email_exists' ||
    message.includes('already been registered') ||
    message.includes('already registered')
  )
}

function roleOf(user: User): string | null {
  const role = user.app_metadata?.role
  return typeof role === 'string' ? role : null
}

async function findUserByEmail(admin: ReturnType<typeof serviceClient>, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error('Could not look up that email')
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 200) return null
  }
  return null
}

async function inviteRedirect(slug: string): Promise<string | undefined> {
  const headerStore = await headers()
  const origin = headerStore.get('origin')
  if (!origin) return undefined
  try {
    const url = new URL('/login', origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      url.searchParams.set('property', slug)
    }
    return url.toString()
  } catch {
    return undefined
  }
}

async function ensurePropertyRole(admin: ReturnType<typeof serviceClient>, user: User): Promise<string> {
  const role = roleOf(user)
  if (role === 'admin' || role === 'kiosk') {
    throw new Error('That email is already used by another account')
  }
  if (role === 'property') return user.id

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: 'property' },
  })
  if (error || !data.user) throw new Error('Could not grant property access')
  return data.user.id
}

export async function listPropertyMembers(propertyId: string): Promise<PropertyMember[]> {
  requireUuid(propertyId, 'Property')
  const supabase = await requireAdmin()

  const { data, error } = await supabase.rpc('admin_list_property_members', {
    p_property_id: propertyId,
  })

  if (error) throw new Error('Could not load property access')

  const rows = Array.isArray(data) ? data : []
  return rows.map((row) => {
    const record = row as {
      user_id?: unknown
      email?: unknown
      member_role?: unknown
      created_at?: unknown
    }
    const userId = typeof record.user_id === 'string' ? record.user_id : ''
    if (!UUID.test(userId)) throw new Error('Could not load property access')
    return {
      userId,
      email: typeof record.email === 'string' && record.email ? record.email : 'Invited user',
      memberRole: record.member_role === 'manager' ? 'manager' : 'staff',
      createdAt: typeof record.created_at === 'string' ? record.created_at : '',
    } satisfies PropertyMember
  })
}

export async function invitePropertyUser(
  propertyId: string,
  email: string,
  role: string
): Promise<void> {
  requireUuid(propertyId, 'Property')
  const member = memberRole(role)
  const normalized = email.trim().toLowerCase()
  if (!EMAIL.test(normalized) || normalized.length > 320) {
    throw new Error('Enter a valid email')
  }

  await requireAdmin()
  const admin = serviceClient()

  const { data: property, error: propertyError } = await admin
    .from('properties')
    .select('id, slug')
    .eq('id', propertyId)
    .maybeSingle()
  if (propertyError || !property) throw new Error('Property not found')

  let createdUserId: string | null = null
  let userId: string

  const existing = await findUserByEmail(admin, normalized)
  if (existing) {
    userId = await ensurePropertyRole(admin, existing)
  } else {
    const redirectTo = await inviteRedirect(typeof property.slug === 'string' ? property.slug : '')
    const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, {
      redirectTo,
    })

    if (error || !data.user) {
      if (alreadyRegistered(error)) {
        const raced = await findUserByEmail(admin, normalized)
        if (!raced) throw new Error(error?.message ?? 'Could not invite that user')
        userId = await ensurePropertyRole(admin, raced)
      } else {
        throw new Error(error?.message ?? 'Could not invite that user')
      }
    } else {
      createdUserId = data.user.id
      try {
        // inviteUserByEmail only accepts user_metadata. Role has to live in
        // app_metadata, which the user cannot edit, so set it before they sign in.
        userId = await ensurePropertyRole(admin, data.user)
      } catch (roleError) {
        await admin.auth.admin.deleteUser(createdUserId)
        throw roleError
      }
    }
  }

  const { error: insertError } = await admin.from('property_members').insert({
    property_id: propertyId,
    user_id: userId,
    member_role: member,
  })

  if (insertError) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId)
    if (insertError.code === '23505') {
      throw new Error('That person already has access to this property')
    }
    throw new Error('Could not save property access')
  }
}

export async function removePropertyAccess(propertyId: string, userId: string): Promise<void> {
  requireUuid(propertyId, 'Property')
  requireUuid(userId, 'User')
  const supabase = await requireAdmin()

  const { data, error } = await supabase
    .from('property_members')
    .delete()
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .select('id')

  if (error) throw new Error('Could not remove access')
  if (!data || data.length === 0) throw new Error('That person does not have access')
}

export async function setPropertyShowPrices(propertyId: string, showPrices: boolean): Promise<Property> {
  requireUuid(propertyId, 'Property')
  if (typeof showPrices !== 'boolean') throw new Error('Show prices must be on or off')
  const supabase = await requireAdmin()

  const { data, error } = await supabase
    .from('properties')
    .update({ show_prices: showPrices })
    .eq('id', propertyId)
    .select('*')
    .single()

  if (error || !data) throw new Error('Could not update prices')
  return data as Property
}
