import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sprout,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { formatUGX, formatDate } from '../lib/format'
import type { Profile, FarmProject, Transaction, AppNotification, PlatformSettings } from '../lib/types'
import FarmImage from '../components/FarmImage'
import { farmArtFor } from '../lib/farmArt'
import AdminPlatformSettings from '../components/AdminPlatformSettings'

type Tab = 'overview' | 'requests' | 'farms' | 'users' | 'transactions' | 'settings'
type UserRow = Profile & { wallet?: { balance: number; total_invested?: number } }

const initialFarmForm = {
  name: '',
  category: 'Cattle Investment',
  location: 'Mbarara, Western Uganda',
  description: '',
  image_url: '',
  min_amount: 500000,
  max_amount: 50000000,
  expected_return_pct: 14.5,
  duration_months: 12,
  target_amount: 150000000,
}

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [users, setUsers] = useState<UserRow[]>([])
  const [pending, setPending] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [farms, setFarms] = useState<FarmProject[]>([])
  const [stats, setStats] = useState({
    users: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalInvested: 0,
    totalFarms: 0,
  })
  const [loading, setLoading] = useState(true)
  const [farmForm, setFarmForm] = useState(initialFarmForm)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [filterReqType, setFilterReqType] = useState<'all' | 'deposit' | 'withdrawal'>('all')
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [userDraft, setUserDraft] = useState<{
    full_name: string
    phone: string
    role: 'user' | 'admin'
    status: 'active' | 'blocked'
    referral_code: string
  } | null>(null)

  const loadData = async () => {
    try {
      const [u, pendingTx, allTx, f] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, wallets(balance, total_invested)')
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('farm_projects').select('*').order('created_at', { ascending: false }),
      ])

      const usersData = (u.data as UserRow[]) ?? []
      const pendingTxs = (pendingTx.data as Transaction[]) ?? []
      const allTxData = (allTx.data as Transaction[]) ?? []
      const farmsData = (f.data as FarmProject[]) ?? []

      setUsers(usersData)
      setPending(pendingTxs)
      setAllTransactions(allTxData)
      setFarms(farmsData)

      const depositTotal = pendingTxs
        .filter((x) => x.type === 'deposit')
        .reduce((s, x) => s + Number(x.amount), 0)
      const withdrawalTotal = pendingTxs
        .filter((x) => x.type === 'withdrawal')
        .reduce((s, x) => s + Number(x.amount), 0)
      const investedTotal = farmsData.reduce((s, x) => s + Number(x.funded_amount || 0), 0)

      setStats({
        users: usersData.length,
        pendingDeposits: depositTotal,
        pendingWithdrawals: withdrawalTotal,
        totalInvested: investedTotal,
        totalFarms: farmsData.length,
      })
    } catch (e) {
      console.error('Error loading admin data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Review pending funds request (deposit or withdrawal)
  const handleReviewRequest = async (tx: Transaction, approved: boolean) => {
    setActionBusy(true)
    try {
      const { error } = await supabase.rpc('admin_review_funds', {
        p_tx_id: tx.id,
        p_action: approved ? 'approve' : 'reject',
      })

      if (error) {
        setMsg({ type: 'error', text: error.message })
      } else {
        setMsg({
          type: 'success',
          text: `Request #${tx.reference} successfully ${approved ? 'APPROVED' : 'REJECTED'}.`,
        })
        await loadData()
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Operation failed.' })
    } finally {
      setActionBusy(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  // Create new farm project
  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!farmForm.name.trim()) {
      setMsg({ type: 'error', text: 'Please enter a farm name.' })
      return
    }

    setActionBusy(true)
    try {
      const slug =
        farmForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString(36)

      const payload = {
        name: farmForm.name,
        category: farmForm.category,
        location: farmForm.location,
        description: farmForm.description || `Specialized commercial ${farmForm.category} operation located in ${farmForm.location}.`,
        image_url: farmForm.image_url || farmArtFor(farmForm.category),
        min_amount: Number(farmForm.min_amount),
        max_amount: farmForm.max_amount ? Number(farmForm.max_amount) : null,
        expected_return_pct: Number(farmForm.expected_return_pct),
        duration_months: Number(farmForm.duration_months),
        target_amount: Number(farmForm.target_amount),
        funded_amount: 0,
        status: 'active',
        slug,
      }

      const { error } = await supabase.from('farm_projects').insert(payload)
      if (error) throw error

      setMsg({ type: 'success', text: `Farm project "${farmForm.name}" created successfully!` })
      setFarmForm(initialFarmForm)
      await loadData()
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create farm project.' })
    } finally {
      setActionBusy(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  // Toggle active/inactive status of a project
  const toggleFarmStatus = async (farm: FarmProject) => {
    const nextStatus = farm.status === 'active' ? 'inactive' : 'active'
    await supabase.from('farm_projects').update({ status: nextStatus }).eq('id', farm.id)
    setMsg({ type: 'success', text: `Farm status changed to ${nextStatus}.` })
    await loadData()
    setTimeout(() => setMsg(null), 3000)
  }

  // Delete farm project
  const deleteFarm = async (farm: FarmProject) => {
    if (!confirm(`Are you sure you want to delete ${farm.name}?`)) return
    await supabase.from('farm_projects').delete().eq('id', farm.id)
    setMsg({ type: 'success', text: `Farm ${farm.name} removed.` })
    await loadData()
    setTimeout(() => setMsg(null), 3000)
  }

  const openUserEditor = (u: UserRow) => {
    setEditingUser(u)
    setUserDraft({
      full_name: u.full_name || u.username,
      phone: u.phone || '',
      role: u.role,
      status: u.status,
      referral_code: u.referral_code || '',
    })
  }

  const saveUserEdits = async () => {
    if (!editingUser || !userDraft) return

    const trimmedName = userDraft.full_name.trim()
    const trimmedPhone = userDraft.phone.trim()
    const trimmedReferral = userDraft.referral_code.trim()

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName || editingUser.username,
          phone: trimmedPhone || null,
          role: userDraft.role,
          status: userDraft.status,
          referral_code: trimmedReferral || editingUser.referral_code,
        })
        .eq('id', editingUser.id)

      if (error) throw error

      setMsg({ type: 'success', text: `Profile for @${editingUser.username} updated successfully.` })
      setEditingUser(null)
      setUserDraft(null)
      await loadData()
      setTimeout(() => setMsg(null), 3000)
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to update user profile.' })
      setTimeout(() => setMsg(null), 4000)
    }
  }

  // Toggle user block
  const toggleBlockUser = async (u: UserRow) => {
    const nextStatus = u.status === 'active' ? 'blocked' : 'active'
    await supabase.from('profiles').update({ status: nextStatus }).eq('id', u.id)
    setMsg({ type: 'success', text: `User ${u.username} set to ${nextStatus}.` })
    await loadData()
    setTimeout(() => setMsg(null), 3000)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  // Filter pending requests
  const filteredPending = pending.filter((t) => {
    if (filterReqType === 'all') return true
    return t.type === filterReqType
  })

  // Filter users
  const filteredUsers = users.filter((u) => {
    const q = searchUser.toLowerCase()
    return (
      u.username.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.referral_code && u.referral_code.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-[#111713] text-stone-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111713]/95 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/40 font-display font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-white tracking-tight">
                  Feldwert
                </span>
                <span className="rounded-md bg-gold-400 px-1.5 py-0.2 text-[10px] font-bold text-forest-950 uppercase tracking-wider">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Institutional Operations & Settlement</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:bg-white/10 transition-colors"
            >
              <span>Investor Portal</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Banner Messages */}
        {msg && (
          <div
            className={`rounded-2xl p-4 flex items-center justify-between gap-3 animate-fade-up ${
              msg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/80 border border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {msg.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{msg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMsg(null)}
              className="text-stone-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Operational Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 overflow-x-auto gap-2">
          <nav className="flex space-x-2">
            {[
              { id: 'overview', label: 'Operations Overview', icon: LayoutDashboard },
              {
                id: 'requests',
                label: `Review Requests (${pending.length})`,
                icon: Clock,
                badge: pending.length > 0 ? String(pending.length) : undefined,
              },
              { id: 'farms', label: `Agri Programs (${farms.length})`, icon: Sprout },
              { id: 'users', label: `Investor Directory (${users.length})`, icon: Users },
              { id: 'transactions', label: 'Transaction Audit', icon: Wallet },
              { id: 'settings', label: 'System Parameters', icon: Settings },
            ].map((t) => {
              const Icon = t.icon
              const isCur = tab === t.id
              return (
                <button
                  key={t.id}
                  id={`admin-tab-${t.id}`}
                  type="button"
                  onClick={() => setTab(t.id as Tab)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                    isCur
                      ? 'bg-gold-500 text-forest-950 shadow-md font-bold'
                      : 'bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={loadData}
            title="Refresh state"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-fade">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-semibold uppercase tracking-wider">Registered Investors</span>
                  <Users className="h-4 w-4 text-gold-400" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold text-white">
                  {stats.users}
                </div>
                <span className="mt-2 block text-xs text-emerald-400 font-medium">
                  Verified KYC profiles
                </span>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">
                <div className="flex items-center justify-between text-xs text-amber-300">
                  <span className="font-semibold uppercase tracking-wider">Pending Deposits</span>
                  <ArrowDownLeft className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold text-amber-300">
                  {formatUGX(stats.pendingDeposits)}
                </div>
                <span className="mt-2 block text-xs text-stone-400">Awaiting MoMo verification</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-semibold uppercase tracking-wider">Pending Withdrawals</span>
                  <ArrowUpRight className="h-4 w-4 text-red-400" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold text-white">
                  {formatUGX(stats.pendingWithdrawals)}
                </div>
                <span className="mt-2 block text-xs text-stone-400">Awaiting MoMo transfer</span>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
                <div className="flex items-center justify-between text-xs text-emerald-300">
                  <span className="font-semibold uppercase tracking-wider">Total Capital Allocated</span>
                  <Sprout className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 font-display text-3xl font-bold text-emerald-400">
                  {formatUGX(stats.totalInvested)}
                </div>
                <span className="mt-2 block text-xs text-stone-400">Across {stats.totalFarms} active projects</span>
              </div>
            </div>

            {/* Quick Operational Queue: Pending Transactions */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Action Required: Pending Requests
                  </h3>
                  <p className="text-xs text-stone-400">
                    Mobile money deposit and withdrawal requests awaiting operations validation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('requests')}
                  className="text-xs font-semibold text-gold-400 hover:text-gold-300"
                >
                  Manage All ({pending.length}) →
                </button>
              </div>

              {pending.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-stone-400">
                  No requests currently pending review. All queues are settled.
                </div>
              ) : (
                <div className="space-y-2">
                  {pending.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              t.type === 'deposit'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {t.type}
                          </span>
                          <span className="font-display text-base font-bold text-white">
                            {formatUGX(t.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Ref: <span className="font-mono text-stone-300">{t.reference}</span> ·{' '}
                          {formatDate(t.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleReviewRequest(t, true)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleReviewRequest(t, false)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-600/80 hover:bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: REQUESTS QUEUE ================= */}
        {tab === 'requests' && (
          <div className="space-y-6 animate-fade">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Funds Settlement Queue
                </h3>
                <p className="text-xs text-stone-400">
                  Verify MTN MoMo and Airtel Money transactions or approve outgoing investor liquidations.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2">
                {(['all', 'deposit', 'withdrawal'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setFilterReqType(filter)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      filterReqType === filter
                        ? 'bg-gold-500 text-forest-950 font-bold'
                        : 'bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    {filter === 'all' ? 'All Pending' : `${filter}s`}
                  </button>
                ))}
              </div>
            </div>

            {filteredPending.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-xs text-stone-400">
                All requests in this category have been processed.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPending.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                            t.type === 'deposit'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {t.type}
                        </span>
                        <span className="font-display text-lg font-bold text-white">
                          {formatUGX(t.amount)}
                        </span>
                        <span className="rounded-full bg-amber-400/20 text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                          Status: Pending
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">
                        Reference Code: <span className="font-mono text-gold-300">{t.reference}</span> ·
                        Date: {formatDate(t.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleReviewRequest(t, true)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                      >
                        Approve & Credit
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleReviewRequest(t, false)}
                        className="rounded-xl bg-red-600/80 hover:bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                      >
                        Reject Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: AGRI PROGRAMS MANAGEMENT ================= */}
        {tab === 'farms' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade">
            {/* Create New Program Form */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-lg font-bold text-white">
                  Add Agri Program
                </h3>
              </div>
              <p className="text-xs text-stone-400">
                Launch a vetted livestock breeding or grain supply project.
              </p>

              <form onSubmit={handleCreateFarm} className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Program Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bavarian Black Angus Herd"
                    value={farmForm.name}
                    onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white placeholder-stone-500 focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Sector Category
                    </label>
                    <select
                      value={farmForm.category}
                      onChange={(e) => setFarmForm({ ...farmForm, category: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-[#1a231d] px-3 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
                    >
                      <option value="Cattle Investment">🐄 Cattle Investment</option>
                      <option value="Pig Farming">🐖 Pig Farming</option>
                      <option value="Animal Feeds">🌾 Animal Feeds</option>
                      <option value="Broilers">🐔 Broilers</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Location / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lower Saxony"
                      value={farmForm.location}
                      onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white placeholder-stone-500 focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Expected ROI (% p.a.)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={farmForm.expected_return_pct}
                      onChange={(e) =>
                        setFarmForm({ ...farmForm, expected_return_pct: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Term Duration (Months)
                    </label>
                    <input
                      type="number"
                      value={farmForm.duration_months}
                      onChange={(e) =>
                        setFarmForm({ ...farmForm, duration_months: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Min Amount (UGX)
                    </label>
                    <input
                      type="number"
                      step="50000"
                      value={farmForm.min_amount}
                      onChange={(e) =>
                        setFarmForm({ ...farmForm, min_amount: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Funding Goal (UGX)
                    </label>
                    <input
                      type="number"
                      step="1000000"
                      value={farmForm.target_amount}
                      onChange={(e) =>
                        setFarmForm({ ...farmForm, target_amount: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Description & Specifications
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide operational details, pasture size, veterinary protocol..."
                    value={farmForm.description}
                    onChange={(e) => setFarmForm({ ...farmForm, description: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-xs text-white placeholder-stone-500 focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionBusy}
                  className="w-full rounded-xl bg-gold-500 hover:bg-gold-400 py-2.5 text-xs font-bold text-forest-950 shadow-md transition-colors disabled:opacity-50"
                >
                  {actionBusy ? 'Creating...' : 'Deploy Agri Program'}
                </button>
              </form>
            </div>

            {/* List of Programs */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-display text-lg font-bold text-white">
                Live Agricultural Catalog ({farms.length})
              </h3>

              <div className="space-y-3">
                {farms.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-stone-800">
                        <FarmImage
                          src={f.image_url}
                          alt={f.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gold-400 uppercase">
                            {f.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                              f.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-stone-500/20 text-stone-400'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>
                        <h4 className="font-display text-base font-bold text-white">{f.name}</h4>
                        <p className="text-xs text-stone-400">
                          {f.expected_return_pct}% p.a. · {f.duration_months} mo · Min{' '}
                          {formatUGX(f.min_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFarmStatus(f)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-white/10"
                      >
                        {f.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFarm(f)}
                        className="rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: USERS MANAGEMENT ================= */}
        {tab === 'users' && (
          <div className="space-y-4 animate-fade">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Investor Profiles & Wallets
                </h3>
                <p className="text-xs text-stone-400">
                  Manage accounts, verify statuses, and inspect liquidity balances.
                </p>
              </div>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search investors..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-stone-400 font-medium">
                    <th className="p-4">Investor</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Referral Code</th>
                    <th className="p-4 text-right">Wallet Balance</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className="p-4">
                        <div className="font-bold text-white">
                          {u.full_name || u.username}
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono">@{u.username}</div>
                      </td>
                      <td className="p-4 text-stone-300 capitalize">{u.role}</td>
                      <td className="p-4 font-mono text-gold-400">{u.referral_code}</td>
                      <td className="p-4 text-right font-display font-bold text-white">
                        {formatUGX(u.wallet?.balance ?? 0)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openUserEditor(u)}
                            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200 hover:bg-white/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBlockUser(u)}
                            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                              u.status === 'active'
                                ? 'bg-red-950/40 text-red-300 border border-red-500/30 hover:bg-red-900/50'
                                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
                            }`}
                          >
                            {u.status === 'active' ? 'Freeze' : 'Unfreeze'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingUser && userDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111713]/80 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141b18] p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400">User editor</p>
                  <h3 className="font-display text-2xl font-bold text-white">Edit Investor Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null)
                    setUserDraft(null)
                  }}
                  className="rounded-full border border-white/10 p-2 text-stone-300 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                    Full name
                  </label>
                  <input
                    value={userDraft.full_name}
                    onChange={(e) => setUserDraft({ ...userDraft, full_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                    Phone
                  </label>
                  <input
                    value={userDraft.phone}
                    onChange={(e) => setUserDraft({ ...userDraft, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Role
                    </label>
                    <select
                      value={userDraft.role}
                      onChange={(e) =>
                        setUserDraft({
                          ...userDraft,
                          role: e.target.value as 'user' | 'admin',
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Status
                    </label>
                    <select
                      value={userDraft.status}
                      onChange={(e) =>
                        setUserDraft({
                          ...userDraft,
                          status: e.target.value as 'active' | 'blocked',
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                    Referral code
                  </label>
                  <input
                    value={userDraft.referral_code}
                    onChange={(e) => setUserDraft({ ...userDraft, referral_code: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null)
                    setUserDraft(null)
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveUserEdits}
                  className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-forest-950"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: AUDIT LOGS ================= */}
        {tab === 'transactions' && (
          <div className="space-y-4 animate-fade">
            <h3 className="font-display text-xl font-bold text-white">
              System Transaction Audit
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-stone-400 font-medium">
                    <th className="p-4">Reference</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5">
                      <td className="p-4 font-mono text-stone-300">{t.reference}</td>
                      <td className="p-4 font-bold text-white capitalize">
                        {t.type.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-stone-400">{formatDate(t.created_at)}</td>
                      <td className="p-4 text-right font-display font-bold text-white">
                        {formatUGX(t.amount)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            t.status === 'approved' || t.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : t.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: SYSTEM SETTINGS ================= */}
        {tab === 'settings' && <AdminPlatformSettings />}
      </div>
    </div>
  )
}
