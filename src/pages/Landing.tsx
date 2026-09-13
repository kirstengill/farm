import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Percent,
  PiggyBank,
  Shield,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import FarmImage from '../components/FarmImage'
import { FARM_ART } from '../lib/farmArt'

const featuredPrograms = [
  {
    name: 'Ankole & Boran Cattle Breeding',
    category: 'Cattle Investment',
    icon: '🐄',
    location: 'Mbarara & Kiruhura, Western Uganda',
    img: FARM_ART.cattle,
    returnPct: '14.8% p.a.',
    duration: '12 months',
    min: '500,000 UGX',
    description:
      'High-health Ankole and Boran beef cattle genetics with dedicated veterinary oversight and pasture rotation.',
  },
  {
    name: 'Mukono Grain & Animal Feeds Mill',
    category: 'Animal Feeds',
    icon: '🌾',
    location: 'Mukono & Jinja Corridor, Uganda',
    img: FARM_ART.feeds,
    returnPct: '13.2% p.a.',
    duration: '9 months',
    min: '250,000 UGX',
    description:
      'Commercial grain milling operation manufacturing balanced dairy meal and high-protein poultry feeds.',
  },
  {
    name: 'Bio-Secure Commercial Broilers',
    category: 'Broilers',
    icon: '🐔',
    location: 'Nakasongola District, Uganda',
    img: FARM_ART.broilers,
    returnPct: '16.5% p.a.',
    duration: '6 months',
    min: '300,000 UGX',
    description:
      'Climate-controlled broiler poultry units with contracted wholesale off-take to central supermarket chains.',
  },
]

const valuePillars = [
  {
    icon: '🐄',
    title: 'Cattle Breeding & Grazing',
    desc: 'Asset-backed contracts tied to certified cattle herds with regular veterinary audits and veterinary health guarantees.',
  },
  {
    icon: '🌾',
    title: 'Precision Animal Feeds',
    desc: 'Supply-chain essential feed mills and grain silos serving cooperative agricultural distributors across Central Europe.',
  },
  {
    icon: '🐔',
    title: 'Bio-Secure Broilers',
    desc: 'Short-cycle broiler poultry contracts with pre-arranged off-take agreements and swift capital turnover.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f8f9f6] text-ink-900 flex flex-col antialiased">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              to="/marketplace"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-forest-800 hover:text-forest-950 px-3 py-2"
            >
              <Sprout className="h-3.5 w-3.5" />
              <span>Investment Catalog</span>
            </Link>
            <Link
              to="/signin"
              className="rounded-xl px-4 py-2 text-xs font-bold text-forest-900 hover:bg-stone-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 hover:bg-forest-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5 text-gold-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-forest-800/15 bg-forest-50 px-3.5 py-1 text-xs font-bold text-forest-800">
                <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Agricultural Fintech · Regulated Asset-Backed Operations</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-forest-950 leading-[1.1]">
                Invest in real agricultural yield.{' '}
                <span className="text-forest-700">Backed by physical livestock & feed.</span>
              </h1>

              <p className="text-base sm:text-lg text-ink-600 max-w-2xl leading-relaxed">
                Feldwert Capital enables individual and private wealth investors to deploy capital
                directly into vetted German Cattle operations, Animal Feed processing plants, and
                climate-automated Broiler facilities.
              </p>

              {/* Primary Call to Action */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-forest-800 hover:bg-forest-700 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:translate-y-[-1px]"
                >
                  Start Investing Now
                </Link>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-6 py-3.5 text-sm font-bold text-forest-950 transition-colors"
                >
                  <span>Explore 3 Programs</span>
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-stone-200/80 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <div className="font-display text-2xl font-bold text-forest-950">14.2%</div>
                  <p className="text-[11px] text-ink-500 font-medium">Avg. Annual Yield</p>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-forest-950">100%</div>
                  <p className="text-[11px] text-ink-500 font-medium">Insured Livestock</p>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-forest-950">50k UGX</div>
                  <p className="text-[11px] text-ink-500 font-medium">Low Minimum Entry</p>
                </div>
              </div>
            </div>

            {/* Right Column: Hero High-Res Imagery Collage */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-stone-200 shadow-2xl bg-forest-950 aspect-4/3">
                <FarmImage
                  src={FARM_ART.cattle}
                  alt="High quality cattle herd grazing"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent" />

                {/* Floating Metric Badge */}
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 backdrop-blur-md p-4 border border-stone-100 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-100 text-forest-800 font-display font-bold">
                      🐄
                    </div>
                    <div>
                      <p className="text-xs font-bold text-forest-950">
                        Bavarian Pasture Herd #4
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        Quarterly Yield Credited
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-ink-500 uppercase font-bold block">
                      Target Return
                    </span>
                    <span className="font-display font-bold text-sm text-gold-600">
                      14.8% p.a.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 3 Core Investment Pillars */}
      <section className="bg-white py-16 border-y border-stone-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
              Core Agricultural Sectors
            </span>
            <h2 className="font-display text-3xl font-bold text-forest-950">
              Diversified Agri-Fintech Portfolios
            </h2>
            <p className="text-sm text-ink-600">
              Select between long-term breeding herd appreciation, industrial grain processing, or
              fast-turnover poultry facilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {valuePillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-3xl border border-stone-200/80 bg-stone-50/50 p-6 hover:bg-white hover:border-forest-600/30 transition-all hover:shadow-xs space-y-3"
              >
                <div className="text-3xl">{pillar.icon}</div>
                <h3 className="font-display text-lg font-bold text-forest-950">{pillar.title}</h3>
                <p className="text-xs text-ink-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Programs Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
                Active Catalog
              </span>
              <h2 className="font-display text-3xl font-bold text-forest-950 mt-1">
                Featured Investment Opportunities
              </h2>
              <p className="text-sm text-ink-600 mt-1">
                Real livestock projects open for capital commitments.
              </p>
            </div>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-forest-800 hover:text-forest-950"
            >
              <span>View All Opportunities</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredPrograms.map((prog) => (
              <article
                key={prog.name}
                className="group flex flex-col rounded-3xl border border-stone-200/90 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all"
              >
                <div className="relative h-52 bg-stone-200 overflow-hidden">
                  <FarmImage
                    src={prog.img}
                    alt={prog.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-forest-950/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                    <span>{prog.icon}</span>
                    <span>{prog.category}</span>
                  </span>
                  <span className="absolute right-3.5 top-3.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                    Active
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-display text-lg font-bold text-forest-950 group-hover:text-forest-800 transition-colors">
                      {prog.name}
                    </h3>
                    <p className="text-xs text-ink-500">📍 {prog.location}</p>
                    <p className="text-xs text-ink-600 line-clamp-2">{prog.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-50 p-3 border border-stone-200/70 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-500 block">ROI</span>
                      <span className="font-display font-bold text-sm text-forest-900">
                        {prog.returnPct}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-500 block">Term</span>
                      <span className="font-display font-bold text-sm text-forest-950">
                        {prog.duration}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-500 block">Min</span>
                      <span className="font-display font-bold text-sm text-forest-950">
                        {prog.min}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/marketplace"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest-800 py-2.5 text-xs font-bold text-white hover:bg-forest-700 transition-colors"
                  >
                    <span>Inspect Program & Returns</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Logo />
          <p className="text-xs text-ink-500 text-center sm:text-left">
            © {new Date().getFullYear()} Feldwert Capital AG. Regulated German Agricultural Investment Platform.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-forest-800">
            <Link to="/marketplace" className="hover:underline">
              Investments
            </Link>
            <Link to="/signin" className="hover:underline">
              Investor Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
