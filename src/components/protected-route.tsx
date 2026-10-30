'use client'

import { useAuth } from '@/contexts/auth-context'
import { getRole, pathForRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const role = getRole(user)
  const [signingOut, setSigningOut] = useState(false)
  const denied = useRef(false)

  useEffect(() => {
    if (loading || signingOut) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (role === 'admin') return

    if (role === 'kiosk' || role === 'property') {
      router.replace(pathForRole(role))
      return
    }

    if (denied.current) return
    denied.current = true

    const deny = async () => {
      setSigningOut(true)
      toast.error('No access')
      await signOut()
      router.replace('/login')
    }

    // The role backfill is in the database before the access token is refreshed.
    void createClient('app')
      .auth.refreshSession()
      .then(async ({ data, error }) => {
        if (!error && getRole(data.user)) return
        await deny()
      })
      .catch(() => deny())
  }, [user, role, loading, router, signOut, signingOut])

  if (loading || signingOut || !user || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
