'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { User, Session } from '@supabase/supabase-js'
import { authScopeFromPath } from '@/lib/auth/kiosk-session'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; user: User | null; session: Session | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const scope = authScopeFromPath(pathname)
  const supabase = useMemo(() => createClient(scope), [scope])
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [boundScope, setBoundScope] = useState(scope)

  if (boundScope !== scope) {
    setBoundScope(scope)
    setSession(null)
    setUser(null)
    setLoading(true)
  }

  useEffect(() => {
    let cancelled = false

    const applySession = (next: Session | null) => {
      if (cancelled) return
      setSession(next)
      setUser(next?.user ?? null)
      setLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next)
    })

    void supabase.auth.getSession().then(({ data: { session: next } }) => {
      applySession(next)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error, user: data.user, session: data.session }
  }

  const signOut = async () => {
    // Kiosk and portal sign-out clear only that cookie. The dashboard session stays.
    await supabase.auth.signOut(scope === 'app' ? undefined : { scope: 'local' })
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
