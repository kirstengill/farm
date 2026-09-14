import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { Loader } from '../components/ui'
import { getAdminStatus, isAdminProfile } from '../lib/auth'

export function RequireUser({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Loader full />
  if (!user) return <Navigate to="/signin" state={{ from: loc.pathname }} replace />
  // Profile may not exist yet (DB tables missing) — still allow the session through
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const [checked, setChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(isAdminProfile(profile)))

  useEffect(() => {
    if (!user) {
      setChecked(true)
      setIsAdmin(false)
      return
    }

    let active = true
    const verify = async () => {
      const admin = await getAdminStatus(user.id)
      if (active) {
        setIsAdmin(admin)
        setChecked(true)
      }
    }

    setChecked(false)
    verify()
    return () => {
      active = false
    }
  }, [user, loading])

  if (loading || !checked) return <Loader full />
  if (!user) return <Navigate to="/signin" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
