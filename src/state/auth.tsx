import { useEffect, useState, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile, getWallet, signOut as authSignOut } from '../lib/auth'
import type { Profile, Wallet } from '../lib/types'

interface AuthCtx {
  user: { id: string } | null
  profile: Profile | null
  wallet: Wallet | null
  loading: boolean
  refresh: () => Promise<void>
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null,
  profile: null,
  wallet: null,
  loading: true,
  refresh: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const { data } = await supabase.auth.getUser()
    const currentUser = data?.user ?? null
    if (currentUser) {
      setUser(currentUser)
      try {
        const [p, w] = await Promise.all([
          getProfile(currentUser.id),
          getWallet(currentUser.id),
        ])
        setProfile(p)
        setWallet(w)
      } catch {
        setProfile(null)
        setWallet(null)
      }
    } else {
      setUser(null)
      setProfile(null)
      setWallet(null)
    }
    setLoading(false)
  }

  const signOut = async () => {
    await authSignOut()
    setUser(null)
    setProfile(null)
    setWallet(null)
  }

  useEffect(() => {
    refresh()
    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })
    return () => data.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Ctx.Provider
      value={{
        user,
        profile,
        wallet,
        loading,
        refresh,
        refreshProfile: refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
