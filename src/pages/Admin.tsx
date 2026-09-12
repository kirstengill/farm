import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { Button, Input, Loader, StatusPill, EmptyState } from '../components/ui'
import { formatEUR, formatDate } from '../lib/format'
import type { Profile, FarmProject, Transaction } from '../lib/types'

type Tab = 'overview' | 'users' | 'requests' | 'farms' | 'settings'
type UserRow = Profile & { wallet?: { balance: number } }

const emptyFarm = {
  name: '',
  category: 'Pig Farming',
  location: '',
  description: '',
  image_url: '',
  min_amount: 500,
  max_amount: '',
  expected_return_pct: 12,
  duration_months: 12,
  target_amount: 100000,
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('overview')
  const [users, setUsers] = useState<UserRow[]>([])
  const [pending, setPending] = useState<Transaction[]>([])
  const [farms, setFarms] = useState<FarmProject[]>([])
  const [stats, setStats] = useState({ users: 0, deposits: 0, withdrawals: 0, invested: 0 })
  const [loading, setLoading] = useState(true)
  const [farmForm, setFarmForm] = useState(emptyFarm)
  const [editFarm, setEditFarm] = useState<FarmProject | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [u, t, f] = await Promise.all([
      supabase.from('profiles').select('*, wallets(balance)').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('farm_projects').select('*').order('created_at', { ascending: false }),
    ])
    const usersData = (u.data as UserRow[]) ?? []
    const txs = (t.data as Transaction[]) ?? []
    setUsers(usersData)
    setPending(txs)
    setFarms((f.data as FarmProject[]) ?? [])
    setStats({
      users: usersData.length,
      deposits: txs.filter((x) => x.type === 'deposit').reduce((s, x) => s + Number(x.amount), 0),
      withdrawals: txs.filter((x) => x.type === 'withdrawal').reduce((s, x) => s + Number(x.amount), 0),
      invested: 0,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (tx: Transaction, ok: boolean) => {
    const { error } = await supabase.rpc('admin_review_funds', {
      p_tx_id: tx.id,
      p_approve: ok,
    })
    if (error) return setMsg(error.message)
    setMsg(ok ? 'Approved.' : 'Rejected.')
    load()
  }

  const saveFarm = async () => {
    const payload: Record<string, unknown> = {
      name: farmForm.name,
      category: farmForm.category,
      location: farmForm.location,
      description: farmForm.description,
      image_url: farmForm.image_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70',
      min_amount: Number(farmForm.min_amount),
      max_amount: farmForm.max_amount ? Number(farmForm.max_amount) : null,
      expected_return_pct: Number(farmForm.expected_return_pct),
      duration_months: Number(farmForm.duration_months),
      target_amount: Number(farmForm.target_amount),
      status: 'active',
      slug: farmForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36),
    }
    const { error } = await supabase.from('farm_projects').insert(payload)
    if (error) return setMsg(error.message)
    setMsg('Farm project created.')
    setFarmForm(emptyFarm)
    load()
  }

  const toggleFarm = async (f: FarmProject) => {
    const status = f.status === 'active' ? 'inactive' : 'active'
    await supabase.from('farm_projects').update({ status }).eq('id', f.id)
    load()
  }

  const deleteFarm = async (f: FarmProject) => {
    await supabase.from('farm_projects').delete().eq('id', f.id)
    load()
  }

  const toggleBlock = async (u: UserRow) => {
    const status = u.status === 'active' ? 'blocked' : 'active'
    await supabase.from('profiles').update({ status }).eq('id', u.id)
    load()
  }

  if (loading) return <Loader full />

  return (
    <div className="min-h-screen bg-[#141B16] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <p className="font-display text-lg font-semibold">Feldwert <span className="text-gold-500">Admin</span></p>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-white/60 hover:text-white">User view →</Link>
            <Button variant="ghost" onClick={() => signOut()} className="text-sm text-white/70 hover:bg-white/10">Logout</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-8 flex flex-wrap gap-2">
          {(['overview', 'users', 'requests', 'farms', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${tab === t ? 'bg-gold-500 text-forest-950' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {msg && <div className="mb-4 rounded-lg bg-white/10 px-4 py-2 text-sm">{msg}</div>}

        {tab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStat label="Total users" value={String(stats.users)} />
            <AdminStat label="Pending deposits (€)" value={formatEUR(stats.deposits)} />
            <AdminStat label="Pending withdrawals (€)" value={formatEUR(stats.withdrawals)} />
            <AdminStat label="Farm projects" value={String(farms.length)} />
            <div className="rounded-2xl bg-white/5 p-6 sm:col-span-2 xl:col-span-4">
              <h2 className="mb-3 font-display text-lg font-semibold">Pending requests</h2>
              {pending.length === 0 ? <p className="text-sm text-white/50">No pending requests.</p> : (
                <ul className="divide-y divide-white/10">
                  {pending.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                      <span className="capitalize">{t.type} · {formatEUR(t.amount)}</span>
                      <span className="flex gap-2">
                        <Button className="px-4 py-1.5 text-xs" onClick={() => approve(t, true)}>Approve</Button>
                        <Button variant="danger" className="px-4 py-1.5 text-xs" onClick={() => approve(t, false)}>Reject</Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-hidden rounded-2xl bg-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                <tr><th className="p-4">Username</th><th className="p-4">Name</th><th className="p-4">Balance</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-4 font-medium">{u.username}</td>
                    <td className="p-4 text-white/70">{u.full_name}</td>
                    <td className="p-4">{formatEUR(u.wallet?.balance ?? 0)}</td>
                    <td className="p-4"><StatusPill status={u.status} /></td>
                    <td className="p-4">
                      <Button variant="ghost" className="px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={() => toggleBlock(u)}>
                        {u.status === 'active' ? 'Block' : 'Unblock'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {pending.length === 0 ? <EmptyState title="All clear" body="No pending deposits or withdrawals." /> : pending.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-5">
                <div>
                  <p className="font-medium capitalize">{t.type} · {formatEUR(t.amount)}</p>
                  <p className="text-xs text-white/50">{formatDate(t.created_at)} · ref {t.reference}</p>
                </div>
                <div className="flex gap-2">
                  <Button className="px-4 py-2 text-xs" onClick={() => approve(t, true)}>Approve</Button>
                  <Button variant="danger" className="px-4 py-2 text-xs" onClick={() => approve(t, false)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'farms' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 rounded-2xl bg-white/5 p-6">
              <h2 className="font-display text-lg font-semibold">New farm project</h2>
              <Input label="Name" value={farmForm.name} onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} className="admin-input" />
              <Input label="Category" value={farmForm.category} onChange={(e) => setFarmForm({ ...farmForm, category: e.target.value })} className="admin-input" />
              <Input label="Location" value={farmForm.location} onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })} className="admin-input" />
              <Input label="Description" value={farmForm.description} onChange={(e) => setFarmForm({ ...farmForm, description: e.target.value })} className="admin-input" />
              <Input label="Image URL" value={farmForm.image_url} onChange={(e) => setFarmForm({ ...farmForm, image_url: e.target.value })} className="admin-input" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Min (€)" type="number" value={farmForm.min_amount} onChange={(e) => setFarmForm({ ...farmForm, min_amount: Number(e.target.value) })} className="admin-input" />
                <Input label="Target (€)" type="number" value={farmForm.target_amount} onChange={(e) => setFarmForm({ ...farmForm, target_amount: Number(e.target.value) })} className="admin-input" />
                <Input label="Return %" type="number" value={farmForm.expected_return_pct} onChange={(e) => setFarmForm({ ...farmForm, expected_return_pct: Number(e.target.value) })} className="admin-input" />
                <Input label="Months" type="number" value={farmForm.duration_months} onChange={(e) => setFarmForm({ ...farmForm, duration_months: Number(e.target.value) })} className="admin-input" />
              </div>
              <Button onClick={saveFarm} className="w-full" disabled={!farmForm.name}>Create project</Button>
            </div>
            <div className="space-y-3 lg:col-span-2">
              {farms.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <img src={f.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-white/50">{f.category} · {f.location} · {f.expected_return_pct}% · {f.duration_months}mo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={f.status} />
                    <Button variant="ghost" className="px-3 py-1.5 text-xs text-white/80 hover:bg-white/10" onClick={() => toggleFarm(f)}>
                      {f.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteFarm(f)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-lg rounded-2xl bg-white/5 p-8">
            <h2 className="font-display text-lg font-semibold">Platform settings</h2>
            <p className="mt-2 text-sm text-white/60">
              Referral percentages, minimum amounts and other platform-wide settings are managed in the
              <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">platform_settings</code> table.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  )
}
