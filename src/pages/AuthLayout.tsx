import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, TrendingUp, Lock, Award, ArrowLeft } from 'lucide-react'
import { Logo } from '../components/Logo'

export default function AuthLayout({
  children,
  title,
  subtitle,
  activePage,
}: {
  children: ReactNode
  title: string
  subtitle: string
  activePage?: 'signin' | 'signup'
}) {
  return (
    <div className="min-h-screen bg-forest-950 text-stone-100 flex flex-col lg:flex-row antialiased selection:bg-forest-800 selection:text-white">
      {/* ================= LEFT BRAND SHOWCASE PANEL (Desktop 50/50 or 45/55) ================= */}
      <div className="relative hidden lg:flex lg:w-[48%] xl:w-[46%] 2xl:w-[44%] shrink-0 flex-col justify-between bg-forest-950 p-12 xl:p-16 text-white overflow-hidden select-none">
        {/* Ambient atmospheric lighting & subtle pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,58,42,0.85)_0%,rgba(10,22,16,0.98)_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.22] mix-blend-luminosity bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1800&q=80")',
          }}
        />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="group inline-flex items-center gap-2 focus:outline-none">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-gold-400" />
            <span>Return to Site</span>
          </Link>
        </div>

        {/* Central Value Proposition */}
        <div className="relative z-10 space-y-8 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-forest-900/90 px-3.5 py-1.5 text-xs font-medium text-gold-300 border border-gold-500/25 backdrop-blur-md shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
            <span>Regulated Asset-Backed Agro-Fintech</span>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Real livestock assets. Direct yields. Guaranteed offtake.
            </h2>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal">
              Participate directly in high-yield cattle breeding, precision grain milling, and automated broiler operations with institutional risk management and Uganda Mobile Money integration.
            </p>
          </div>

          {/* Institutional Highlights Grid */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-gold-400 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">Target Yield</span>
              </div>
              <div className="font-display text-xl font-bold text-white">12.5% – 17.0%</div>
              <p className="text-[11px] text-stone-400 mt-0.5">Projected annualized cycle returns</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Lock className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">Capital Safety</span>
              </div>
              <div className="font-display text-xl font-bold text-white">100% Insured</div>
              <p className="text-[11px] text-stone-400 mt-0.5">Mortality & biosecurity coverage</p>
            </div>
          </div>

          {/* Trust Checkpoints */}
          <div className="space-y-2.5 pt-2 text-xs text-stone-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Instant UGX deposits & withdrawals via MTN & Airtel Money</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Full veterinary inspection & real-time lot valuation records</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Automated distribution to your wallet upon cycle maturity</span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata & Compliance */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-gold-400" />
            <span>Feldwert Capital AG · Registered Financial Intermediary</span>
          </div>
          <span className="font-mono text-[10px] text-stone-500">ISO 27001 SECURE</span>
        </div>
      </div>

      {/* ================= RIGHT INTERACTIVE AUTHENTICATION COLUMN ================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between pb-6 border-b border-stone-800 mb-6">
          <Link to="/">
            <Logo />
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold text-stone-300 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
        </div>

        {/* Main Content Area / Form Container */}
        <div className="my-auto mx-auto w-full max-w-md xl:max-w-lg">
          {/* Top Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {title}
              </h1>
              {activePage && (
                <span className="text-xs font-medium text-stone-400 bg-stone-900 border border-stone-800 rounded-full px-3 py-1">
                  {activePage === 'signin' ? 'Sign In' : 'Sign Up'}
                </span>
              )}
            </div>
            <p className="text-sm text-stone-400 mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Render Form / Children */}
          {children}
        </div>

        {/* Right Footer / Security & Terms Note */}
        <div className="pt-8 mt-8 border-t border-stone-800 text-center text-xs text-stone-500 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span>Protected by 256-bit TLS encryption</span>
          <span className="hidden sm:inline text-stone-700">·</span>
          <Link to="/" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <span className="hidden sm:inline text-stone-700">·</span>
          <Link to="/" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
