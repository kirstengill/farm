import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { signOut } from '../lib/auth'
import { Button, StatusPill, Loader, Progress, EmptyState } from '../components/ui'
import { formatEUR, formatDate } from '../lib/format'
import type { Wallet, Investment, Transaction, AppNotification, FarmProject } from '../lib/types'

type Tab = 'overview' | 'farms' | 'wallet' | 'referrals' | 'settings'

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'farms', label: 'My Investments' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'settings', label: 'Settings' },
]

export default function Dashboard() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const [farms, setFarms] = useState<FarmProject[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
      ; (async () => {
        const [w, inv, t, n, f] = await Promise.all([
          supabase.from('wallets').select('*').eq('user_id', user.id).single(),
          supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
          supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('farm_projects').select('*').eq('status', 'active'),
        ])
        setWallet((w.data as Wallet) ?? null)
        setInvestments((inv.data as Investment[]) ?? [])
        setTxs((t.data as Transaction[]) ?? [])
        setNotifs((n.data as AppNotification[]) ?? [])
        setFarms((f.data as FarmProject[]) ?? [])
        setLoading(false)
      })()
  }, [user])

  const submitWalletOp = async () => {
    if (!user || !modal) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return setErr('Enter a valid amount.')
    setBusy(true); setErr(''); setMsg('')
    const { error } = await supabase.rpc('request_funds', { p_type: modal, p_amount: amt })
    setBusy(false)
    if (error) return setErr(error.message)
    setMsg(`${modal === 'deposit' ? 'Deposit' : 'Withdrawal'} request submitted — pending admin approval.`)
    setAmount('')
    setModal(null)
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15)
    setTxs((data as Transaction[]) ?? [])
  }

  const logout = async () => {
    await signOut()
    nav('/')
  }

  if (loading || !profile) return <Loader full />

  const activeInv = investments.filter((i) => i.status === 'active' || i.status === 'pending')
  const totalReturns = wallet?.total_returns ?? 0

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-forest-900/8 bg-[#FAF8F4]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold text-forest-950">
            Feldwert<span className="text-gold-600"> Capital</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-white px-4 py-1.5 text-sm font-medium text-forest-900 ring-1 ring-clay-200 sm:inline">
              {profile.username}
            </span>
            <Button variant="ghost" onClick={logout} className="text-sm">Logout</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <nav className="mb-8 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-forest-800 text-white' : 'bg-white text-ink-600 ring-1 ring-clay-200 hover:ring-forest-400'
                }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Wallet Balance" value={formatEUR(wallet?.balance ?? 0)} accent />
              <StatCard label="Total Invested" value={formatEUR(wallet?.total_invested ?? 0)} />
              <StatCard label="Total Returns" value={formatEUR(totalReturns)} />
              <StatCard label="Active Investments" value={String(activeInv.length)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 ring-1 ring-clay-200 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-forest-950">Recent transactions</h2>
                  <button onClick={() => setTab('wallet')} className="text-sm text-forest-700 hover:underline">View all</button>
                </div>
                {txs.length === 0 ? (
                  <EmptyState title="No transactions yet" body="Deposits, withdrawals and returns will appear here." />
                ) : (
                  <ul className="divide-y divide-clay-200/60">
                    {txs.slice(0, 6).map((t) => (
                      <li key={t.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium capitalize text-forest-950">{t.type.replace('_', ' ')}</p>
                          <p className="text-xs text-ink-500">{formatDate(t.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-forest-950">{formatEUR(t.amount)}</p>
                          <StatusPill status={t.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 ring-1 ring-clay-200">
                  <h2 className="mb-4 font-display text-lg font-semibold text-forest-950">Quick actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setModal('deposit')} className="py-2.5 text-sm">Deposit</Button>
                    <Button variant="secondary" onClick={() => setModal('withdraw')} className="py-2.5 text-sm">Withdraw</Button>
                    <Link to="/marketplace" className="col-span-2">
                      <Button variant="secondary" className="w-full py-2.5 text-sm">Explore Farms →</Button>
                    </Link>
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-6 ring-1 ring-clay-200">
                  <h2 className="mb-4 font-display text-lg font-semibold text-forest-950">Notifications</h2>
                  {notifs.length === 0 ? (
                    <p className="text-sm text-ink-500">You're all caught up.</p>
                  ) : (
                    <ul className="space-y-3">
                      {notifs.slice(0, 4).map((n) => (
                        <li key={n.id} className="border-l-2 border-gold-500 pl-3">
                          <p className="text-sm font-medium text-forest-950">{n.title}</p>
                          <p className="text-xs text-ink-500">{n.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'farms' && (
          <div className="space-y-4">
            {investments.length === 0 ? (
              <EmptyState title="No investments yet" body="Browse the marketplace to fund your first farm project." />
            ) : (
              investments.map((inv) => {
                const farm = farms.find((f) => f.id === inv.farm_id)
                return (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-clay-200">
                    <div className="flex items-center gap-4">
                      {farm && <img src={farm.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />}
                      <div>
                        <p className="font-medium text-forest-950">{farm?.name ?? 'Farm project'}</p>
                        <p className="text-sm text-ink-500">
                          {formatDate(inv.start_date)} → {formatDate(inv.maturity_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-forest-950">{formatEUR(inv.amount)}</p>
                        <p className="text-xs text-forest-700">+{formatEUR(inv.expected_return)} expected</p>
                      </div>
                      <StatusPill status={inv.status} />
                    </div>
                  </div>
                )
              })
            )}
            <Link to="/marketplace" className="inline-block">
              <Button className="mt-2">Explore new farms</Button>
            </Link>
          </div>
        )}

        {tab === 'wallet' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-forest-900 p-8 text-white lg:col-span-1">
              <p className="text-sm text-white/60">Available balance</p>
              <p className="mt-2 font-display text-4xl font-semibold">{formatEUR(wallet?.balance ?? 0)}</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Button onClick={() => setModal('deposit')} className="py-2.5 text-sm">Deposit</Button>
                <Button variant="secondary" onClick={() => setModal('withdraw')} className="py-2.5 text-sm">Withdraw</Button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-clay-200 lg:col-span-2">
              <h2 className="mb-4 font-display text-lg font-semibold text-forest-950">Transaction history</h2>
              {txs.length === 0 ? (
                <EmptyState title="Nothing here yet" body="Your deposit and withdrawal history appears here." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-clay-200 text-left text-xs uppercase tracking-wide text-ink-500">
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-clay-200/60">
                    {txs.map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 capitalize">{t.type.replace('_', ' ')}</td>
                        <td className="py-3 text-ink-500">{formatDate(t.created_at)}</td>
                        <td className="py-3 text-right font-medium">{formatEUR(t.amount)}</td>
                        <td className="py-3 text-right"><StatusPill status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'referrals' && (
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center ring-1 ring-clay-200">
            <h2 className="font-display text-2xl font-semibold text-forest-950">Invite fellow investors</h2>
            <p className="mt-2 text-sm text-ink-600">Share your referral code — earn a bonus when they invest.</p>
            <div className="mt-6 rounded-xl bg-clay-100 px-6 py-5">
              <p className="text-xs uppercase tracking-wider text-ink-500">Your referral code</p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-wide text-forest-900">{profile.referral_code}</p>
            </div>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => navigator.clipboard?.writeText(profile.referral_code)}
            >
              Copy code
            </Button>
          </div>
        )}

        {tab === 'settings' && (
          <div className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white p-8 ring-1 ring-clay-200">
            <h2 className="font-display text-2xl font-semibold text-forest-950">Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Username" value={profile.username} />
              <InfoRow label="Full name" value={profile.full_name} />
              <InfoRow label="Phone" value={profile.phone ?? '—'} />
              <InfoRow label="Member since" value={formatDate(profile.created_at)} />
            </div>
            <Button variant="danger" onClick={logout} className="mt-4">Sign out</Button>
          </div>
        )}
      </div>

      {/* Deposit / Withdraw modal */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-forest-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-semibold capitalize text-forest-950">{modal}</h3>
            <p className="mt-1 text-sm text-ink-600">
              {modal === 'deposit'
                ? 'Submit a deposit request. It will be credited once approved.'
                : 'Submit a withdrawal request. Funds arrive after approval.'}
            </p>
            <input
              type="number"
              autoFocus
              placeholder="Amount (€)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-4 w-full rounded-lg border-clay-200 px-4 py-2.5 text-sm outline-none focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15"
            />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            {msg && <p className="mt-2 text-sm text-forest-700">{msg}</p>}
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={submitWalletOp} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 ${accent ? 'bg-forest-900 text-white' : 'bg-white ring-1 ring-clay-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? 'text-white/60' : 'text-ink-500'}`}>{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-clay-100 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 font-medium text-forest-950">{value}</p>
    </div>
  )
}
