import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

type AuthContextType = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInAnonymously = async () => {
    if (!supabase)
      throw new Error('Sign-in is not configured. Check the Supabase environment variables.')
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      throw error
    }
  }

  const signOut = async () => {
    if (!supabase)
      throw new Error('Sign-in is not configured. Check the Supabase environment variables.')
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signInAnonymously,
        signOut,
      }}
    >
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
