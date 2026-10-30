'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { portalFont } from '@/components/portal/font'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { getRole } from '@/lib/auth/roles'
import { portalOnPrimary, portalPrimary, safeHttpUrl } from '@/lib/portal/board'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginValues = z.infer<typeof loginSchema>

type PortalBrand = {
  name: string
  logoUrl: string | null
  primaryColor: string | null
}

const fieldClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pl-10 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400'

function propertyInitial(name: string): string {
  const char = Array.from(name.trim())[0]
  return char ? char.toLocaleUpperCase('en') : '?'
}

export function PortalLogin() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug.toLowerCase() : null
  const { signIn, signOut } = useAuth()
  const [brand, setBrand] = useState<PortalBrand | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return
    let cancelled = false
    const supabase = createClient('portal')
    void supabase
      .from('properties')
      .select('name, logo_url, primary_color')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data || typeof data.name !== 'string' || data.name.trim() === '') return
        setBrand({
          name: data.name.trim(),
          logoUrl: typeof data.logo_url === 'string' ? data.logo_url : null,
          primaryColor: typeof data.primary_color === 'string' ? data.primary_color : null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const primary = portalPrimary(brand?.primaryColor)
  const onPrimary = portalOnPrimary(brand?.primaryColor)
  const logo = safeHttpUrl(brand?.logoUrl)
  const title = brand?.name ?? 'Property portal'

  const onSubmit = async (values: LoginValues) => {
    try {
      setIsSubmitting(true)
      const { error, user } = await signIn(values.email, values.password)
      if (error) {
        toast.error(error.message || 'Could not sign in')
        return
      }
      if (getRole(user) !== 'property') {
        await signOut()
        toast.error('This portal is for property staff. Admins sign in on the dashboard.')
        return
      }
      toast.success('Signed in')
    } catch (error) {
      console.error(error)
      toast.error('Could not sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={cn('flex min-h-dvh items-center justify-center px-6 py-16', portalFont.className)}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Avatar size="lg" className="size-16 bg-white" style={{ boxShadow: `0 0 0 2px ${primary}` }}>
            {logo ? <AvatarImage src={logo} alt="" /> : null}
            <AvatarFallback
              className="text-lg font-semibold"
              style={{ backgroundColor: primary, color: onPrimary }}
            >
              {propertyInitial(title)}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to follow guest laundry.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="portal-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="portal-email"
                type="email"
                autoComplete="username"
                placeholder="name@property.com"
                className={fieldClass}
                disabled={isSubmitting}
                {...form.register('email')}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-red-700">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="portal-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="portal-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                className={fieldClass}
                disabled={isSubmitting}
                {...form.register('password')}
              />
            </div>
            {form.formState.errors.password ? (
              <p className="mt-1 text-xs text-red-700">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: primary, color: onPrimary }}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-700 underline-offset-4 hover:underline">
            Admin dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}
