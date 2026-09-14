import { useState, useMemo, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Lock,
  User,
  Phone,
  Tag,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react'
import AuthLayout from './AuthLayout'
import { signUpWithUsername } from '../lib/auth'

export default function SignUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialReferralCode = (searchParams.get('ref') || '').trim()

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: initialReferralCode,
  })
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  // Password Strength Evaluation
  const passwordStrength = useMemo(() => {
    const p = formData.password
    if (!p) return { score: 0, label: '', color: 'bg-stone-200' }
    let score = 0
    if (p.length >= 6) score += 1
    if (/[A-Z]/.test(p) || /[a-z]/.test(p)) score += 1
    if (/[0-9]/.test(p)) score += 1
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score += 1

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' }
    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' }
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-emerald-500' }
    return { score: 4, label: 'Strong', color: 'bg-forest-700' }
  }, [formData.password])

  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const fullName = formData.fullName.trim()
    const username = formData.username.trim()
    const phone = formData.phone.trim()
    const password = formData.password
    const confirmPassword = formData.confirmPassword

    // Validation checks
    if (!fullName) {
      setError('Please enter your full legal name.')
      return
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (/\s/.test(username)) {
      setError('Username cannot contain spaces.')
      return
    }
    if (!phone) {
      setError('Please enter your mobile phone number for verification.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.')
      return
    }
    if (!termsAccepted) {
      setError('Please acknowledge the terms and conditions to proceed.')
      return
    }

    setLoading(true)
    try {
      await signUpWithUsername({
        username,
        password,
        fullName,
        phone,
        referralCode: formData.referralCode.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 700)
    } catch (err: any) {
      const rawMsg = err?.message || ''
      if (rawMsg.toLowerCase().includes('already registered') || rawMsg.toLowerCase().includes('taken')) {
        setError('This username is already registered. Please choose another username.')
      } else if (rawMsg) {
        setError(rawMsg.replace(/email/gi, 'username'))
      } else {
        setError('Registration could not be completed. Please check your details and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register as a verified private investor to access asset-backed agricultural programs."
      activePage="signup"
    >
      <div className="rounded-3xl border border-stone-200/90 bg-white p-7 sm:p-9 shadow-xl shadow-forest-950/[0.03] transition-all">
        {/* Error Feedback Message */}
        {error && (
          <div
            id="signup-error-alert"
            className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50/90 border border-rose-200/80 p-4 text-xs sm:text-sm text-rose-800 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Success Feedback Message */}
        {success && (
          <div
            id="signup-success-alert"
            className="mb-6 flex items-center gap-3 rounded-2xl bg-forest-50 border border-forest-200 p-4 text-xs sm:text-sm text-forest-900 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="h-4 w-4 text-forest-700 shrink-0" />
            <div className="flex-1 font-semibold">
              Account created successfully. Redirecting to investor portfolio…
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Investor Identification */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest-900 pb-1 border-b border-stone-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-100 text-forest-900 text-[10px] font-bold">
                1
              </span>
              <span>Investor Profile</span>
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="signup-fullname"
                className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="signup-fullname"
                  type="text"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 transition-all text-base sm:text-sm"
                />
              </div>
            </div>

            {/* Username & Phone Number Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="signup-username"
                  className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <span className="text-xs font-mono font-bold text-stone-400">@</span>
                  </div>
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="e.g. investor_01"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 transition-all text-base sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signup-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-ink-600"
                  >
                    Phone Number
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    MTN / Airtel
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="signup-phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+256 775 123456"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 transition-all text-base sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Security & Password */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest-900 pb-1 border-b border-stone-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-100 text-forest-900 text-[10px] font-bold">
                2
              </span>
              <span>Account Security</span>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 transition-all text-base sm:text-sm"
                />
                <button
                  type="button"
                  id="btn-toggle-signup-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Visual Meter */}
              {formData.password && (
                <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-500">Strength:</span>
                    <span className="font-semibold text-stone-700">{passwordStrength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          step <= passwordStrength.score ? passwordStrength.color : 'bg-stone-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-ink-600"
                >
                  Confirm Password
                </label>
                {passwordsMatch && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Check className="h-3 w-3" />
                    <span>Passwords match</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border bg-[#fafbfa] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none transition-all text-base sm:text-sm ${
                    passwordsMatch
                      ? 'border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10'
                      : 'border-stone-200 focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10'
                  }`}
                />
                <button
                  type="button"
                  id="btn-toggle-signup-confirm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Referral Code (Optional) */}
            <div>
              <label
                htmlFor="signup-referral"
                className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5"
              >
                Referral Code <span className="text-stone-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Tag className="h-4 w-4" />
                </div>
                <input
                  id="signup-referral"
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => updateField('referralCode', e.target.value.toUpperCase())}
                  placeholder="e.g. FW-DEMO88"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-[#fafbfa] text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 uppercase font-mono text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                id="checkbox-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-forest-800 focus:ring-forest-700 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-ink-600 leading-relaxed group-hover:text-stone-900 transition-colors">
                I agree to the{' '}
                <span className="font-semibold text-forest-800 hover:underline">
                  Investor Service Terms
                </span>{' '}
                and confirm that I am registering as a private or authorized institutional investor.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            id="btn-signup-submit"
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
                <span>Creating account…</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-gold-300" />
                <span>Account Created</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4 text-gold-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation Link */}
        <div className="mt-7 text-center text-sm text-ink-600 pt-5 border-t border-stone-100">
          <span>Already have an account? </span>
          <Link
            to="/signin"
            id="link-signin"
            className="font-bold text-forest-800 hover:text-forest-950 hover:underline transition-colors ml-1"
          >
            Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
