import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import FarmImage from '../components/FarmImage'
import { FARM_ART } from '../lib/farmArt'

const farms = [
  {
    name: 'Weser Valley Pig Farm',
    category: 'Pig Farming',
    location: 'Lower Saxony, DE',
    img: FARM_ART.pig,
    return: '14.5% p.a.',
    duration: '12 months',
  },
  {
    name: 'Alpine Meadow Goat Dairy',
    category: 'Goat Farming',
    location: 'Bavaria, DE',
    img: FARM_ART.goat,
    return: '12.0% p.a.',
    duration: '9 months',
  },
]

const steps = [
  { n: '01', t: 'Create your account', d: 'Register with a username in under a minute.' },
  { n: '02', t: 'Fund your wallet', d: 'Deposit funds and choose a farm project.' },
  { n: '03', t: 'Earn from agriculture', d: 'Receive returns as the farm cycle completes.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1A241D]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/signin" className="rounded-full px-5 py-2 text-sm font-medium text-forest-800 hover:bg-forest-100/60">
            Sign In
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-forest-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-forest-700"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-2">
        <div className="animate-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-forest-100 px-3 py-1 text-xs font-medium tracking-wide text-forest-800">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-600" />
            Agricultural investment · Germany
          </p>
          <h1 className="font-serif text-5xl leading-[1.08] tracking-tight text-forest-950 md:text-6xl">
            Own a stake in <em className="not-italic text-forest-600">real farms.</em>
            <br />
            Earn from the harvest.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-forest-900/70">
            Feldwert connects investors to vetted pig and goat farming operations across Germany — with transparent
            returns, fixed durations, and full portfolio visibility.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/signup"
              className="rounded-full bg-forest-800 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-800/20 transition hover:-translate-y-0.5 hover:bg-forest-700"
            >
              Explore Farms
            </Link>
            <Link
              to="/signin"
              className="rounded-full border border-forest-800/20 bg-white px-7 py-3.5 text-sm font-semibold text-forest-900 transition hover:border-forest-800/50"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-10 flex items-center gap-2 text-sm text-forest-900/50">
            <svg className="h-4 w-4 text-forest-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            Based in Hamburg, Germany · Registered agricultural investment operator
          </p>
        </div>

        <div className="relative animate-rise" style={{ animationDelay: '120ms' }}>
          <div className="overflow-hidden rounded-3xl shadow-2xl shadow-forest-950/20">
              <FarmImage
                eager
                src={FARM_ART.pasture}
                alt="German farmland in morning light"
                className="h-[460px] w-full object-cover"
              />
          </div>
          <div className="absolute -bottom-6 left-6 rounded-2xl bg-white/95 px-6 py-4 shadow-xl backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wider text-forest-900/50">Portfolio avg. return</p>
            <p className="font-serif text-2xl font-semibold text-forest-800">13.2% p.a.</p>
          </div>
        </div>
      </section>

      {/* Opportunities preview */}
      <section className="border-t border-forest-900/5 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-forest-600">Open opportunities</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-forest-950">Featured farm projects</h2>
            </div>
            <Link to="/signup" className="hidden text-sm font-medium text-forest-700 hover:underline sm:block">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {farms.map((f) => (
              <article key={f.name} className="group overflow-hidden rounded-2xl border border-forest-900/8 bg-[#FAF8F4]">
                <div className="relative h-56 overflow-hidden">
                  <FarmImage src={f.img} alt={f.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-800 backdrop-blur">
                    {f.category}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-forest-950">{f.name}</h3>
                      <p className="mt-1 text-sm text-forest-900/60">{f.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-forest-900/50">Expected</p>
                      <p className="font-semibold text-forest-700">{f.return}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-forest-900/8 pt-4 text-sm">
                    <span className="text-forest-900/60">Duration · {f.duration}</span>
                    <Link to="/signup" className="font-medium text-forest-700 hover:underline">
                      Invest now →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-3xl font-semibold text-forest-950">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-forest-900/8 bg-white p-7">
                <span className="font-serif text-sm font-semibold text-forest-500">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold text-forest-950">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-forest-900/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forest-900/8 bg-forest-950 py-12 text-forest-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <Logo light />
          <p className="text-sm text-forest-100/60">
            Feldwert GmbH · Hamburg, Germany · © {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-forest-100/70">
            <Link to="/signin" className="hover:text-white">Sign In</Link>
            <Link to="/signup" className="hover:text-white">Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
