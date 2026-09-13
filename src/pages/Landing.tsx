import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Logo } from '../components/Logo'
import FarmImage from '../components/FarmImage'
import { FARM_ART } from '../lib/farmArt'
import { useAuth } from '../state/auth'

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="relative min-h-screen text-white flex flex-col antialiased selection:bg-forest-700 selection:text-white overflow-hidden bg-forest-950">
      {/* ================= FULL-VIEWPORT BACKGROUND IMAGE & NATURAL SUNLIGHT EFFECT ================= */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Full-bleed cover image */}
        <FarmImage
          src={FARM_ART.cattle}
          alt="Agricultural Farmland"
          className="h-full w-full object-cover object-center scale-[1.03] transition-transform duration-1000 ease-out"
        />

        {/* Natural sunlight / warm daylight glow (gentle afternoon golden sunbeam from top-right) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(255,238,187,0.38)_0%,rgba(255,214,138,0.22)_35%,rgba(251,191,36,0.08)_60%,transparent_75%)]" />

        {/* Subtle warm atmospheric amber wash for realistic daylight tone */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/20 via-amber-500/10 to-amber-200/20 mix-blend-overlay" />

        {/* Directional contrast gradient ensuring typography is pristine & readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/95 via-forest-950/65 to-forest-950/40 md:bg-gradient-to-r md:from-forest-950/90 md:via-forest-950/70 md:to-forest-950/35" />

        {/* Header & footer ambient vignettes */}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/60 via-transparent to-forest-950/70" />
      </div>

      {/* ================= NAVIGATION HEADER ================= */}
      <header className="relative z-10 border-b border-white/10 bg-forest-950/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center">
          <Link to="/" className="focus:outline-none">
            <Logo light />
          </Link>
        </div>
      </header>

      {/* ================= MAIN HERO SECTION ================= */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto space-y-7 text-left">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-forest-950/50 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-stone-200 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Asset-Backed Agricultural Investment Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] drop-shadow-sm max-w-2xl">
            Invest in real agricultural opportunities.
          </h1>

          {/* Brief Supporting Sentence */}
          <p className="text-base sm:text-lg text-stone-200 leading-relaxed max-w-xl font-normal drop-shadow-xs">
            Feldwert Capital provides investment opportunities connected to areas such as cattle, pig farming, animal feeds, and broiler farming.
          </p>

          {/* Primary Action - Single Invest Button */}
          <div className="pt-2">
            <Link
              to={user ? '/dashboard' : '/signin'}
              id="landing-hero-invest"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest-700 hover:bg-forest-600 border border-forest-500/40 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-forest-900/50 focus:outline-none focus:ring-4 focus:ring-forest-500/20"
            >
              <span>Invest</span>
              <ArrowRight className="h-4 w-4 text-gold-400" />
            </Link>
          </div>
        </div>
      </main>

      {/* ================= MINIMAL FOOTER ================= */}
      <footer className="relative z-10 border-t border-white/10 bg-forest-950/60 backdrop-blur-md py-5 px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-stone-400">
          <p>© {new Date().getFullYear()} Feldwert Capital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
