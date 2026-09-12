import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import { signInWithUsername, resetPassword } from '../lib/auth'

export default function SignIn() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      await signInWithUsername(username.trim(), password)
      nav('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.'
      setError(msg.replace(/email/gi, 'username'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!username.trim()) return setError('Enter your username above first.')
    try {
      const msg = await resetPassword(username.trim())
      setNotice(msg)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed.')
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your farm portfolio.">
      <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-8 shadow-xl shadow-forest-950/5">
        <h2 className="font-display text-2xl font-semibold text-forest-950">Sign In</h2>
        <p className="-mt-2 text-sm text-ink-600">
          New to Feldwert?{' '}
          <Link to="/signup" className="font-medium text-forest-700 hover:underline">Create Account</Link>
        </p>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/10">{error}</div>}
        {notice && <div className="rounded-lg bg-forest-50 px-4 py-3 text-sm text-forest-800 ring-1 ring-forest-700/10">{notice}</div>}

        <Input label="Username" placeholder="your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => setShowForgot((v) => !v)} className="font-medium text-forest-700 hover:underline">
            Forgot password?
          </button>
        </div>

        {showForgot && (
          <div className="rounded-xl bg-clay-100 p-4">
            <p className="text-xs leading-relaxed text-ink-600">
              Account recovery sends a secure reset link to the recovery address stored on your profile. Contact
              support if none is set.
            </p>
            <Button type="button" onClick={handleReset} variant="ghost" className="mt-3 w-full py-2.5 text-sm">
              Send recovery link
            </Button>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </AuthLayout>
  )
}
