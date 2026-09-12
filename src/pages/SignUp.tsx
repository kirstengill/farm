import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import { signUpWithUsername } from '../lib/auth'

export default function SignUp() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    password: '',
    confirm: '',
    referral: '',
  })
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.username.trim().length < 3) return setError('Username must be at least 3 characters.')
    if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim()))
      return setError('Username may only contain letters, numbers and underscores.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!terms) return setError('Please accept the terms and conditions.')

    setLoading(true)
    try {
      await signUpWithUsername({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
        referralCode: form.referral,
      })
      nav('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Try again.'
      setError(msg.replace(/email/gi, 'username'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join Feldwert Capital and start investing in German agriculture.">
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-8 shadow-xl shadow-forest-950/5">
        <h2 className="font-display text-2xl font-semibold text-forest-950">Create Account</h2>
        <p className="-mt-2 text-sm text-ink-600">Already have one?{' '}
          <Link to="/signin" className="font-medium text-forest-700 hover:underline">Sign In</Link>
        </p>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/10">{error}</div>}

        <Input label="Username" placeholder="e.g. hans_m" value={form.username} onChange={set('username')} required />
        <Input label="Full name" placeholder="Hans Müller" value={form.fullName} onChange={set('fullName')} required />
        <Input label="Phone number" type="tel" placeholder="+49 151 23456789" value={form.phone} onChange={set('phone')} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" value={form.password} onChange={set('password')} required />
          <Input label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} required />
        </div>
        <Input label="Referral code (optional)" placeholder="FW-XXXXXX" value={form.referral} onChange={set('referral')} />

        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-clay-200 text-forest-700 focus:ring-forest-600"
          />
          I agree to the terms and conditions and the privacy policy.
        </label>

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
