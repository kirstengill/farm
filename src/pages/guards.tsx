import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { Loader } from '../components/ui'

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
  useEffect(() => {
    if (!loading) setChecked(true)
  }, [loading])
  if (loading || !checked) return <Loader full />
  if (!user) return <Navigate to="/signin" replace />
  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
