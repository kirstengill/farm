import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { Button, Input, Loader } from '../components/ui'
import { formatEUR } from '../lib/format'
import { Progress } from '../components/ui'
import type { FarmProject, Investment } from '../lib/types'

export default function Marketplace() {
  const { user } = useAuth()
  const [farms, setFarms] = useState<FarmProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FarmProject | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [myInvestments, setMyInvestments] = useState<Investment[]>([])
  const [category, setCategory] = useState<string>('All')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('farm_projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      setFarms((data as FarmProject[]) ?? [])
      if (user) {
        const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id)
        setMyInvestments((inv as Investment[]) ?? [])
      }
      setLoading(false)
    })()
  }, [user])

  const categories = ['All', ...Array.from(new Set(farms.map((f) => f.category)))]
  const visible = category === 'All' ? farms : farms.filter((f) => f.category === category)

  const invest = async () => {
    if (!selected || !user) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt < selected.min_amount) {
      setError(`Minimum investment is ${formatEUR(selected.min_amount)}.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: fnErr } = await supabase.rpc('create_investment', {
        p_project_id: selected.id,
        p_amount: amt,
      })
      if (fnErr) throw fnErr
      setSelected(null)
      setAmount('')
      // refresh investments
      const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id)
      setMyInvestments((inv as Investment[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full />

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-forest-950">Farm Opportunities</h1>
          <p className="mt-1 text-ink-600">Vetted livestock operations with transparent terms.</p>
        </div>
        <Link to="/dashboard" className="text-sm font-medium text-forest-700 hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              category === c
                ? 'bg-forest-800 text-white'
                : 'bg-white text-ink-600 ring-1 ring-clay-200 hover:ring-forest-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center ring-1 ring-clay-200">
          <p className="text-ink-600">No active farm opportunities right now. Check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((f) => {
            const fundedPct = f.target_amount > 0 ? Math.min(100, (f.funded_amount / f.target_amount) * 100) : 0
            return (
              <article key={f.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-clay-200 transition hover:ring-forest-400">
                <div className="relative h-48">
                  <img src={f.image_url} alt={f.name} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-800 backdrop-blur">
                    {f.category}
                  </span>
                  <span
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur ${
                      f.status === 'active' ? 'bg-forest-700/90 text-white' : 'bg-clay-500/90 text-white'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-forest-950">{f.name}</h3>
                    <p className="mt-0.5 text-sm text-ink-500">📍 {f.location}</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-ink-600">{f.description}</p>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-clay-100 p-3 text-center">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-ink-500">Return</p>
                      <p className="text-sm font-semibold text-forest-800">{f.expected_return_pct}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-ink-500">Duration</p>
                      <p className="text-sm font-semibold text-forest-950">{f.duration_months} months</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-ink-500">Min.</p>
                      <p className="text-sm font-semibold text-forest-950">{formatEUR(f.min_amount)}</p>
                    </div>
                  </div>
                  <Progress pct={fundedPct} />
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="ghost"
                      className="flex-1 py-2.5 text-sm"
                      onClick={() => {
                        setSelected(f)
                        setError('')
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      className="flex-1 py-2.5 text-sm"
                      onClick={() => {
                        setSelected(f)
                        setError('')
                      }}
                    >
                      Invest Now
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {myInvestments.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-forest-950">Your investments</h2>
          <div className="mt-4 space-y-3">
            {myInvestments.map((inv) => {
              const farm = farms.find((f) => f.id === inv.farm_id)
              return (
                <div key={inv.id} className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-clay-200">
                  <div className="flex items-center gap-3">
                    {farm && <img src={farm.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <div>
                      <p className="font-medium text-forest-950">{farm?.name ?? 'Farm project'}</p>
                      <p className="text-xs text-ink-500">{inv.status}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-forest-800">{formatEUR(inv.amount)}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Invest modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-forest-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-forest-950">{selected.name}</h3>
                <p className="text-sm text-ink-500">📍 {selected.location} · {selected.duration_months} months</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl leading-none text-ink-400 hover:text-ink-700">×</button>
            </div>
            <img src={selected.image_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
            <p className="mb-4 text-sm leading-relaxed text-ink-600">{selected.description}</p>
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-clay-100 p-3 text-center text-sm">
              <div>
                <p className="text-[11px] uppercase text-ink-500">Expected</p>
                <p className="font-semibold text-forest-800">{selected.expected_return_pct}% p.a.</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-ink-500">Min</p>
                <p className="font-semibold">{formatEUR(selected.min_amount)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-ink-500">Max</p>
                <p className="font-semibold">{selected.max_amount ? formatEUR(selected.max_amount) : '—'}</p>
              </div>
            </div>
            <Input
              label={`Amount (min ${formatEUR(selected.min_amount)})`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(selected.min_amount)}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1 py-2.5" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button className="flex-1 py-2.5" onClick={invest} disabled={busy}>
                {busy ? 'Processing…' : 'Confirm Investment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
