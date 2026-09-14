import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'
import AuthLayout from './AuthLayout'
import { signInWithUsername, resetPassword, getProfile, getAdminStatus } from '../lib/auth'

export default function SignIn() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setError('Please enter your username.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    try {
      const session = await signInWithUsername(cleanUsername, password)
      const userId = session?.user?.id
      if (!userId) {
        throw new Error('Authentication succeeded but the user profile could not be loaded.')
      }

      const profile = await getProfile(userId)
      const looksAdmin = profile ? Boolean(profile.role === 'admin' || profile.is_admin === true) : await getAdminStatus(userId)
      const targetPath = looksAdmin ? '/admin' : '/dashboard'

      setSuccess(true)
      setTimeout(() => {
        navigate(targetPath)
      }, 500)
    } catch (err: any) {
      const rawMsg = err?.message || ''
      // User-friendly error mapping
      if (
        rawMsg.toLowerCase().includes('invalid login credentials') ||
        rawMsg.toLowerCase().includes('invalid credentials') ||
        rawMsg.toLowerCase().includes('password')
      ) {
        setError('Incorrect username or password.')
      } else if (rawMsg) {
        setError(rawMsg.replace(/email/gi, 'username'))
      } else {
        setError('Incorrect username or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setError('Enter your username above first to request a recovery link.')
      return
    }
    setError('')
    try {
      const resMsg = await resetPassword(cleanUsername)
      setResetSent(true)
      setNotice(resMsg || 'Password reset link sent to your registered address.')
    } catch (err: any) {
      setError(err?.message || 'Password recovery failed. Please try again or contact support.')
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your account."
      activePage="signin"
    >
      <div className="rounded-3xl border border-stone-200/90 bg-white p-7 sm:p-9 shadow-xl shadow-forest-950/[0.03] transition-all">
        {/* Error Feedback Message */}
        {error && (
          <div
            id="signin-error-alert"
            className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50/90 border border-rose-200/80 p-4 text-xs sm:text-sm text-rose-800 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Notice Feedback Message */}
        {notice && (
          <div
            id="signin-notice-alert"
            className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 p-4 text-xs sm:text-sm text-emerald-900 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{notice}</div>
          </div>
        )}

        {/* Success Transition Feedback */}
        {success && (
          <div
            id="signin-success-alert"
            className="mb-6 flex items-center gap-3 rounded-2xl bg-forest-50 border border-forest-200 p-4 text-xs sm:text-sm text-forest-900"
          >
            <CheckCircle2 className="h-4 w-4 text-forest-700 shrink-0" />
            <div className="flex-1 font-semibold">Authentication successful. Entering dashboard…</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div>
            <label
              htmlFor="signin-username"
              className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-2"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="h-4 w-4" />
              </div>
              <input
                id="signin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter your username"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 text-sm placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 transition-all text-base sm:text-sm"
              />
            </div>
          </div>

          {/* Password Field with Visibility Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="signin-password"
                className="block text-xs font-bold uppercase tracking-wider text-ink-600"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(!showForgot)}
                className="text-xs font-semibold text-forest-800 hover:text-forest-950 transition-colors focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 text-sm placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 transition-all text-base sm:text-sm"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Accordion / Card */}
          {showForgot && (
            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-forest-900">
                <KeyRound className="h-3.5 w-3.5 text-forest-700" />
                <span>Password Recovery</span>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                Enter your username in the field above and click below. A secure reset link will be sent to the contact email associated with your profile.
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetSent}
                className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-forest-100 hover:bg-forest-200 text-forest-900 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <span>{resetSent ? 'Reset Request Dispatched' : 'Send Recovery Link'}</span>
              </button>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            id="btn-signin-submit"
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-semibold py-3.5 px-6 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-4 focus:ring-forest-800/20 disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Signing in…</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-gold-300" />
                <span>Signed In</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4 text-gold-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation Link */}
        <div className="mt-6 text-center text-sm text-ink-600">
          <span>Don’t have an account? </span>
          <Link
            to="/signup"
            id="link-create-account"
            className="font-bold text-forest-800 hover:text-forest-950 hover:underline transition-colors ml-1"
          >
            Create account
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
