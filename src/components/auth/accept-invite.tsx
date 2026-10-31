'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getRole } from '@/lib/auth/roles'
import { propertyPortalPath } from '@/lib/property-booking-link'
import { createClient } from '@/lib/supabase/client'

const passwordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type PasswordValues = z.infer<typeof passwordSchema>

const fieldClass =
  'w-full bg-transparent border border-white/20 rounded-md px-3 pl-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors'

export function AcceptInvite({
  accessToken,
  refreshToken,
  propertySlug,
}: {
  accessToken: string
  refreshToken: string
  propertySlug: string | null
}) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  useEffect(() => {
    let cancelled = false
    const portal = createClient('portal')

    void portal.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(async ({ data, error: sessionError }) => {
      if (cancelled) return
      if (sessionError || getRole(data.user) !== 'property') {
        await portal.auth.signOut({ scope: 'local' })
        if (!cancelled) setError('This invite link is invalid or has expired.')
        return
      }
      setEmail(data.user?.email ?? null)
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [accessToken, refreshToken])

  const onSubmit = async (values: PasswordValues) => {
    setSaving(true)
    try {
      const portal = createClient('portal')
      const { error: updateError } = await portal.auth.updateUser({ password: values.password })
      if (updateError) {
        toast.error(updateError.message || 'Could not save that password')
        return
      }

      const { data, error: propertyError } = await portal.from('properties').select('slug')
      if (propertyError) {
        toast.error('Password saved, but the portal could not be opened')
        router.push('/portal')
        return
      }

      const slugs = (data ?? [])
        .map((row) => (typeof row.slug === 'string' ? row.slug : ''))
        .filter((slug) => slug.length > 0)
      const destination =
        (propertySlug && slugs.includes(propertySlug) ? propertySlug : null) ??
        (slugs.length === 1 ? slugs[0] : null)

      toast.success('Password saved')
      router.push(destination ? propertyPortalPath(destination) : '/portal')
    } catch (submitError) {
      console.error(submitError)
      toast.error('Could not save that password')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Invite expired</h1>
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Create a password</h1>
        <p className="text-center text-sm text-gray-300">Opening your invite…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-white mb-2 text-center">Create a password</h1>
      <p className="text-center text-sm text-gray-300">
        {email ? `${email} will open the property portal.` : 'Choose a password for the property portal.'}
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-white text-sm font-medium mb-2" htmlFor="invite-password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
            <input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              placeholder="Choose a password"
              className={fieldClass}
              disabled={saving}
              {...form.register('password')}
            />
          </div>
          {form.formState.errors.password ? (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div>
          <label className="block text-white text-sm font-medium mb-2" htmlFor="invite-confirm">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
            <input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat the password"
              className={fieldClass}
              disabled={saving}
              {...form.register('confirm')}
            />
          </div>
          {form.formState.errors.confirm ? (
            <p className="text-red-400 text-xs mt-1">{form.formState.errors.confirm.message}</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'SAVING...' : 'CONTINUE'}
        </button>
      </form>
    </div>
  )
}
