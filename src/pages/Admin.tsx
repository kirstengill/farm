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
  Loader2,
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
  Video,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { formatUGX, formatDate } from '../lib/format'
import type { Profile, FarmProject, Transaction, AppNotification, PlatformSettings, Referral } from '../lib/types'
import FarmImage from '../components/FarmImage'
import { farmArtFor } from '../lib/farmArt'
import AdminPlatformSettings from '../components/AdminPlatformSettings'
import AdminVideoManager from '../components/AdminVideoManager'
import { getPlatformSettings } from '../lib/settings'

type Tab = 'overview' | 'requests' | 'farms' | 'users' | 'transactions' | 'referrals' | 'videos' | 'settings'
type UserRow = Profile & { wallet?: { balance: number; total_invested?: number } }

const initialFarmForm = {
  name: '',
  category: 'Cattle Investment',
  location: 'Mbarara, Western Uganda',
  description: '',
  image_url: '',
  min_amount: 50000,
  max_amount: 50000000,
  expected_return_pct: 14.5,
  duration_months: 12,
  daily_return: 20.14,
  target_amount: 150000000,
}

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [users, setUsers] = useState<UserRow[]>([])
  const [pending, setPending] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralBonusPct, setReferralBonusPct] = useState(10)
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
  const [editingFarm, setEditingFarm] = useState<FarmProject | null>(null)
  const [farmEditDraft, setFarmEditDraft] = useState<{
    name: string
    category: string
    location: string
    description: string
    image_url: string
    min_amount: number
    max_amount: number | ''
    expected_return_pct: number
    duration_months: number
    daily_return: number
    total_expected_income: number
    target_amount: number
    status: string
  } | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [processingTx, setProcessingTx] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
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
      const [u, pendingTx, allTx, f, referralRows, settings] = await Promise.all([
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
        supabase.from('referrals').select('*').order('created_at', { ascending: false }),
        getPlatformSettings(),
      ])

      const rawUsers = (u.data as any[]) ?? []
      const usersData: UserRow[] = rawUsers.map((user) => {
        const walletObj = Array.isArray(user.wallets)
          ? user.wallets[0]
          : user.wallets || user.wallet || { balance: 0, total_invested: 0 }
        return {
          ...user,
          wallet: {
            balance: Number(walletObj?.balance ?? 0),
            total_invested: Number(walletObj?.total_invested ?? 0),
          },
        }
      })
      const pendingTxs = (pendingTx.data as Transaction[]) ?? []
      const allTxData = (allTx.data as Transaction[]) ?? []
      const farmsData = (f.data as FarmProject[]) ?? []

      setUsers(usersData)
      setPending(pendingTxs)
      setAllTransactions(allTxData)
      setFarms(farmsData)
      setReferrals((referralRows.data as Referral[]) ?? [])
      setReferralBonusPct(settings.referral_bonus_pct)

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

  // Review pending funds request (deposit or withdrawal) with instant optimistic UI & resilient fallback
  const handleReviewRequest = async (tx: Transaction, approved: boolean) => {
    if (processingTx?.id === tx.id) return
    const action = approved ? 'approve' : 'reject'
    setProcessingTx({ id: tx.id, action })
    setActionBusy(true)

    const targetStatus = approved ? 'approved' : 'rejected'

    // 1. Optimistic UI update: instantly update local state so user sees immediate results
    setPending((prev) => prev.filter((p) => p.id !== tx.id && p.reference !== tx.reference))
    setAllTransactions((prev) =>
      prev.map((p) =>
        p.id === tx.id || p.reference === tx.reference ? { ...p, status: targetStatus } : p
      )
    )
    setStats((prev) => ({
      ...prev,
      pendingDeposits:
        tx.type === 'deposit'
          ? Math.max(0, prev.pendingDeposits - Number(tx.amount || 0))
          : prev.pendingDeposits,
      pendingWithdrawals:
        tx.type === 'withdrawal'
          ? Math.max(0, prev.pendingWithdrawals - Number(tx.amount || 0))
          : prev.pendingWithdrawals,
    }))

    try {
      let rpcErr: any = null

      // Attempt 1: Call RPC with UUID
      const res1 = await supabase.rpc('admin_review_funds', {
        p_tx_id: tx.id,
        p_action: action,
      })
      rpcErr = res1.error

      // Attempt 2: If failed and reference differs, try with reference
      if (rpcErr && tx.reference && tx.reference !== tx.id) {
        const res2 = await supabase.rpc('admin_review_funds', {
          p_tx_id: tx.reference,
          p_action: action,
        })
        if (!res2.error) {
          rpcErr = null
        }
      }

      // 2. Direct database / store fallback ONLY if RPC failed or was unavailable
      if (rpcErr) {
        console.warn('[Admin] RPC admin_review_funds returned error, attempting fallback update:', rpcErr)

        // Update transaction row
        let { error: txErr } = await supabase
          .from('transactions')
          .update({ status: targetStatus, updated_at: new Date().toISOString() })
          .eq('id', tx.id)

        if (txErr && tx.reference) {
          const refRes = await supabase
            .from('transactions')
            .update({ status: targetStatus, updated_at: new Date().toISOString() })
            .eq('reference', tx.reference)
          txErr = refRes.error
        }

        if (txErr) {
          console.error('[Admin] Fallback transaction update also failed:', txErr)
          throw new Error(
            rpcErr?.message ||
              txErr?.message ||
              `Could not ${action} transaction in Supabase. Please run the migration script.`
          )
        }

        // If approving a deposit, credit the investor's wallet
        if (approved && tx.type === 'deposit') {
          const { data: walletRow } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', tx.user_id)
            .maybeSingle()

          const curBal = Number(walletRow?.balance || 0)
          const newBal = curBal + Number(tx.amount || 0)

          if (walletRow) {
            await supabase
              .from('wallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('user_id', tx.user_id)
          } else {
            await supabase.from('wallets').insert({
              user_id: tx.user_id,
              balance: newBal,
              total_invested: 0,
              total_returns: 0,
              updated_at: new Date().toISOString(),
            })
          }

          // Check if user has a referrer to award referral bonus
          try {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('id, referred_by')
              .eq('id', tx.user_id)
              .maybeSingle()

            if (profileRow?.referred_by && profileRow.referred_by !== tx.user_id) {
              const bonusPct = referralBonusPct || 10
              const bonusAmt = Math.round((Number(tx.amount || 0) * bonusPct) / 100)

              if (bonusAmt > 0) {
                const { data: refWallet } = await supabase
                  .from('wallets')
                  .select('*')
                  .eq('user_id', profileRow.referred_by)
                  .maybeSingle()

                if (refWallet) {
                  await supabase
                    .from('wallets')
                    .update({
                      balance: Number(refWallet.balance || 0) + bonusAmt,
                      total_returns: Number(refWallet.total_returns || 0) + bonusAmt,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', profileRow.referred_by)
                }
              }
            }
          } catch (refErr) {
            console.warn('[Admin] Referral bonus processing error in fallback:', refErr)
          }
        } else if (approved && tx.type === 'withdrawal') {
          const { data: walletRow } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', tx.user_id)
            .maybeSingle()

          if (walletRow) {
            const curBal = Number(walletRow.balance || 0)
            const newBal = Math.max(0, curBal - Number(tx.amount || 0))
            await supabase
              .from('wallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('user_id', tx.user_id)
          }
        }

        // Insert notification for the user
        try {
          await supabase.from('notifications').insert({
            user_id: tx.user_id,
            title: approved
              ? `${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Approved`
              : `${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Rejected`,
            body: approved
              ? `Your ${tx.type} of UGX ${Number(tx.amount || 0).toLocaleString('en-US')} has been approved and credited.`
              : `Your ${tx.type} request for UGX ${Number(tx.amount || 0).toLocaleString('en-US')} was reviewed and rejected.`,
            read: false,
            created_at: new Date().toISOString(),
          })
        } catch {}
      }

      // Notify all dashboards and tabs that funds/status updated
      try {
        window.dispatchEvent(
          new CustomEvent('wallet-balance-updated', {
            detail: { userId: tx.user_id, amount: tx.amount, action },
          })
        )
        window.dispatchEvent(new Event('storage'))
      } catch {}

      setMsg({
        type: 'success',
        text: approved
          ? `Request #${tx.reference} for ${formatUGX(tx.amount)} successfully APPROVED & CREDITED.`
          : `Request #${tx.reference} for ${formatUGX(tx.amount)} successfully REJECTED.`,
      })

      // Re-sync all state from the database
      await loadData()
    } catch (err: any) {
      console.error('handleReviewRequest error:', err)
      setMsg({ type: 'error', text: err?.message || 'Operation failed. Please try again.' })
      await loadData()
    } finally {
      setProcessingTx(null)
      setActionBusy(false)
      setTimeout(() => setMsg(null), 5000)
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

      const dailyReturn =
        Number(farmForm.daily_return) ||
        Math.round(
          ((Number(farmForm.min_amount) * Number(farmForm.expected_return_pct)) /
            (100 * Number(farmForm.duration_months) * 30)) *
            100
        ) / 100

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
        daily_return: dailyReturn,
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

  const openFarmEditor = (f: FarmProject) => {
    const refMin = Number(f.min_amount) || 10000
    const duration = Number(f.duration_months) || 12
    const roiPct = Number(f.expected_return_pct) || 14
    const dailyRet =
      f.daily_return != null
        ? Number(f.daily_return)
        : Math.round(((refMin * roiPct) / (100 * duration * 30)) * 100) / 100
    const totalExp = Math.round(dailyRet * duration * 30 * 100) / 100

    setEditingFarm(f)
    setFarmEditDraft({
      name: f.name,
      category: f.category,
      location: f.location,
      description: f.description || '',
      image_url: f.image_url || '',
      min_amount: refMin,
      max_amount: f.max_amount ?? '',
      expected_return_pct: roiPct,
      duration_months: duration,
      daily_return: dailyRet,
      total_expected_income: totalExp,
      target_amount: Number(f.target_amount) || 10000000,
      status: f.status,
    })
  }

  const handleRecalculateYields = () => {
    if (!farmEditDraft) return
    const minAmt = Number(farmEditDraft.min_amount) || 1
    const duration = Number(farmEditDraft.duration_months) || 1
    const roi = Number(farmEditDraft.expected_return_pct) || 0
    const daily = Math.round(((minAmt * roi) / (100 * duration * 30)) * 100) / 100
    const total = Math.round(daily * duration * 30 * 100) / 100
    setFarmEditDraft({
      ...farmEditDraft,
      daily_return: daily,
      total_expected_income: total,
    })
  }

  const handleDailyReturnChange = (newDaily: number) => {
    if (!farmEditDraft) return
    const duration = Number(farmEditDraft.duration_months) || 1
    const minAmt = Number(farmEditDraft.min_amount) || 1
    const total = Math.round(newDaily * duration * 30 * 100) / 100
    const roi = Math.round(((total / minAmt) * 100) * 100) / 100
    setFarmEditDraft({
      ...farmEditDraft,
      daily_return: newDaily,
      total_expected_income: total,
      expected_return_pct: roi,
    })
  }

  const handleTotalIncomeChange = (newTotal: number) => {
    if (!farmEditDraft) return
    const duration = Number(farmEditDraft.duration_months) || 1
    const minAmt = Number(farmEditDraft.min_amount) || 1
    const daily = Math.round((newTotal / (duration * 30)) * 100) / 100
    const roi = Math.round(((newTotal / minAmt) * 100) * 100) / 100
    setFarmEditDraft({
      ...farmEditDraft,
      daily_return: daily,
      total_expected_income: newTotal,
      expected_return_pct: roi,
    })
  }

  const saveFarmEdits = async () => {
    if (!editingFarm || !farmEditDraft) return
    if (!farmEditDraft.name.trim()) {
      setMsg({ type: 'error', text: 'Project name is required.' })
      return
    }
    if (farmEditDraft.min_amount <= 0) {
      setMsg({ type: 'error', text: 'Minimum investment must be positive.' })
      return
    }
    if (farmEditDraft.daily_return < 0) {
      setMsg({ type: 'error', text: 'Daily return cannot be negative.' })
      return
    }

    setActionBusy(true)
    try {
      const payload = {
        name: farmEditDraft.name.trim(),
        category: farmEditDraft.category,
        location: farmEditDraft.location.trim(),
        description: farmEditDraft.description.trim(),
        image_url: farmEditDraft.image_url.trim() || farmArtFor(farmEditDraft.category),
        min_amount: Number(farmEditDraft.min_amount),
        max_amount:
          farmEditDraft.max_amount !== '' && farmEditDraft.max_amount != null
            ? Number(farmEditDraft.max_amount)
            : null,
        expected_return_pct: Number(farmEditDraft.expected_return_pct),
        duration_months: Number(farmEditDraft.duration_months),
        daily_return: Number(farmEditDraft.daily_return),
        target_amount: Number(farmEditDraft.target_amount),
        status: farmEditDraft.status,
      }

      const { error } = await supabase
        .from('farm_projects')
        .update(payload)
        .eq('id', editingFarm.id)

      if (error) throw error

      setMsg({ type: 'success', text: `Project "${farmEditDraft.name}" updated successfully!` })
      setEditingFarm(null)
      setFarmEditDraft(null)
      await loadData()
      setTimeout(() => setMsg(null), 3000)
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to update farm project.' })
      setTimeout(() => setMsg(null), 4000)
    } finally {
      setActionBusy(false)
    }
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

  const referredProfiles = users.filter((u) => Boolean(u.referred_by))
  const referralBonusTransactions = allTransactions.filter(
    (t) =>
      t.type === 'referral_bonus' &&
      (t.status === 'approved' || t.status === 'completed')
  )
  const totalReferralBonusesPaid = referralBonusTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  )

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
              { id: 'referrals', label: 'Referral Overview', icon: UserCheck },
              { id: 'videos', label: 'Video Guides', icon: Video },
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
                        {((t.meta as any)?.phone || (t.meta as any)?.mobile_number || (t.meta as any)?.sender_phone) && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs">
                            <span className="text-stone-400">Number:</span>
                            <span className="font-mono font-semibold text-emerald-300 bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
                              {String((t.meta as any)?.phone || (t.meta as any)?.mobile_number || (t.meta as any)?.sender_phone)}
                            </span>
                            {((t.meta as any)?.provider || t.method) && (
                              <span className="text-[10px] text-stone-400">
                                ({String((t.meta as any)?.provider || t.method).replace('_', ' ')})
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-stone-400 mt-0.5">
                          Ref: <span className="font-mono text-stone-300">{t.reference}</span> ·{' '}
                          {formatDate(t.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingTx?.id === t.id}
                          onClick={() => handleReviewRequest(t, true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
                        >
                          {processingTx?.id === t.id && processingTx.action === 'approve' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>{processingTx?.id === t.id && processingTx.action === 'approve' ? 'Approving...' : 'Approve'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingTx?.id === t.id}
                          onClick={() => handleReviewRequest(t, false)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
                        >
                          {processingTx?.id === t.id && processingTx.action === 'reject' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          <span>{processingTx?.id === t.id && processingTx.action === 'reject' ? 'Rejecting...' : 'Reject'}</span>
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
                    <div className="space-y-1.5">
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
                      {((t.meta as any)?.phone || (t.meta as any)?.mobile_number || (t.meta as any)?.sender_phone) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-stone-300 font-medium">Depositor Mobile Number:</span>
                          <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 rounded-lg text-xs tracking-wide">
                            {String((t.meta as any)?.phone || (t.meta as any)?.mobile_number || (t.meta as any)?.sender_phone)}
                          </span>
                          {((t.meta as any)?.provider || t.method) && (
                            <span className="text-[11px] text-stone-300 bg-white/10 px-2 py-0.5 rounded-lg">
                              {String((t.meta as any)?.provider || t.method).replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-stone-400">
                        Reference Code: <span className="font-mono text-gold-300">{t.reference}</span> ·
                        Date: {formatDate(t.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={processingTx?.id === t.id}
                        onClick={() => handleReviewRequest(t, true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
                      >
                        {processingTx?.id === t.id && processingTx.action === 'approve' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span>{processingTx?.id === t.id && processingTx.action === 'approve' ? 'Approving & Crediting...' : 'Approve & Credit'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={processingTx?.id === t.id}
                        onClick={() => handleReviewRequest(t, false)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
                      >
                        {processingTx?.id === t.id && processingTx.action === 'reject' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        <span>{processingTx?.id === t.id && processingTx.action === 'reject' ? 'Rejecting...' : 'Reject Request'}</span>
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
                {farms.map((f) => {
                  const refMin = Number(f.min_amount) || 10000
                  const duration = Number(f.duration_months) || 12
                  const roiPct = Number(f.expected_return_pct) || 14
                  const dailyRet =
                    f.daily_return != null
                      ? Number(f.daily_return)
                      : Math.round(((refMin * roiPct) / (100 * duration * 30)) * 100) / 100
                  const totalExp = Math.round(dailyRet * duration * 30 * 100) / 100

                  return (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-stone-800">
                          <FarmImage
                            src={f.image_url}
                            alt={f.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
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
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400 mt-1">
                            <span>Min: <strong className="text-stone-200">{formatUGX(refMin)}</strong></span>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold">
                              +{formatUGX(dailyRet)}/day
                            </span>
                            <span>·</span>
                            <span className="text-gold-400 font-semibold">
                              +{formatUGX(totalExp)} total exp.
                            </span>
                            <span>·</span>
                            <span>{roiPct}% p.a. ({duration} mo)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openFarmEditor(f)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-300 hover:bg-gold-500/20 transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit Details & Returns</span>
                        </button>
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
                  )
                })}
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

        {editingFarm && farmEditDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111713]/85 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#141b18] p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4 shrink-0">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-bold">
                    Agri Project & Financial Yield Editor
                  </p>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Edit {farmEditDraft.name || 'Program'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFarm(null)
                    setFarmEditDraft(null)
                  }}
                  className="rounded-full border border-white/10 p-2 text-stone-300 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Title & Sector Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Program Name
                    </label>
                    <input
                      type="text"
                      value={farmEditDraft.name}
                      onChange={(e) => setFarmEditDraft({ ...farmEditDraft, name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Sector Category
                    </label>
                    <select
                      value={farmEditDraft.category}
                      onChange={(e) => setFarmEditDraft({ ...farmEditDraft, category: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#1a231d] px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    >
                      <option value="Cattle Investment">🐄 Cattle Investment</option>
                      <option value="Pig Farming">🐖 Pig Farming</option>
                      <option value="Animal Feeds">🌾 Animal Feeds</option>
                      <option value="Broilers">🐔 Broilers</option>
                    </select>
                  </div>
                </div>

                {/* Location & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Location / Region
                    </label>
                    <input
                      type="text"
                      value={farmEditDraft.location}
                      onChange={(e) => setFarmEditDraft({ ...farmEditDraft, location: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Status
                    </label>
                    <select
                      value={farmEditDraft.status}
                      onChange={(e) => setFarmEditDraft({ ...farmEditDraft, status: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#1a231d] px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="funded">Funded</option>
                    </select>
                  </div>
                </div>

                {/* Base Financial Parameters */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                      Core Program Parameters
                    </span>
                    <button
                      type="button"
                      onClick={handleRecalculateYields}
                      className="text-xs text-gold-300 underline hover:text-gold-200"
                    >
                      Reset/Sync Yields from ROI %
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Min. Investment (UGX)
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={farmEditDraft.min_amount}
                        onChange={(e) =>
                          setFarmEditDraft({ ...farmEditDraft, min_amount: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Duration (Months)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={farmEditDraft.duration_months}
                        onChange={(e) =>
                          setFarmEditDraft({ ...farmEditDraft, duration_months: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Expected ROI (% p.a.)
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        value={farmEditDraft.expected_return_pct}
                        onChange={(e) =>
                          setFarmEditDraft({
                            ...farmEditDraft,
                            expected_return_pct: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold-500 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Direct Returns & Daily Yield Customizer */}
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                      Custom Daily Return & Total Expected Income
                    </span>
                    <p className="text-[11px] text-stone-400">
                      Directly edit the daily return or total expected income for the minimum investment tier. Changes update investor accruals and marketplace calculations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Daily Return (UGX / Day on Min)
                      </label>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={farmEditDraft.daily_return}
                        onChange={(e) => handleDailyReturnChange(Number(e.target.value))}
                        className="w-full rounded-xl border border-emerald-500/40 bg-black/50 px-3.5 py-2.5 text-base text-emerald-300 font-bold outline-none focus:border-emerald-400"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">
                        Equates to ~{farmEditDraft.min_amount > 0 ? ((farmEditDraft.daily_return / farmEditDraft.min_amount) * 100).toFixed(3) : 0}% / day
                      </span>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gold-300">
                        Total Expected Income (UGX on Min)
                      </label>
                      <input
                        type="number"
                        step={1}
                        min={0}
                        value={farmEditDraft.total_expected_income}
                        onChange={(e) => handleTotalIncomeChange(Number(e.target.value))}
                        className="w-full rounded-xl border border-gold-500/40 bg-black/50 px-3.5 py-2.5 text-base text-gold-300 font-bold outline-none focus:border-gold-400"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">
                        +{formatUGX(farmEditDraft.total_expected_income)} total profit over {farmEditDraft.duration_months} months
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Funding & Max Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Target Funding Goal (UGX)
                    </label>
                    <input
                      type="number"
                      step={1000000}
                      value={farmEditDraft.target_amount}
                      onChange={(e) =>
                        setFarmEditDraft({ ...farmEditDraft, target_amount: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                      Max Investment Limit (UGX, optional)
                    </label>
                    <input
                      type="number"
                      step={500000}
                      value={farmEditDraft.max_amount}
                      onChange={(e) =>
                        setFarmEditDraft({
                          ...farmEditDraft,
                          max_amount: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      placeholder="Optional max cap"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold-500"
                    />
                  </div>
                </div>

                {/* Description & Image */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={farmEditDraft.description}
                    onChange={(e) =>
                      setFarmEditDraft({ ...farmEditDraft, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFarm(null)
                    setFarmEditDraft(null)
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-stone-200 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={saveFarmEdits}
                  className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-400 disabled:opacity-50 transition-colors shadow-lg"
                >
                  {actionBusy ? 'Saving...' : 'Save Program Changes'}
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
                    <th className="p-4">Mobile Number</th>
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
                      <td className="p-4 font-mono text-emerald-300 text-[11px]">
                        {String(
                          (t.meta as any)?.phone ||
                            (t.meta as any)?.mobile_number ||
                            (t.meta as any)?.sender_phone ||
                            '—'
                        )}
                        {((t.meta as any)?.provider || t.method) && (
                          <span className="block text-[10px] text-stone-400 font-sans">
                            {String((t.meta as any)?.provider || t.method).replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-white capitalize">
                        {t.type.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-stone-400">{formatDate(t.created_at)}</td>
                      <td className="p-4 text-right font-display font-bold text-white">
                        {formatUGX(t.amount)}
                      </td>
                      <td className="p-4 text-right">
                        {t.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={processingTx?.id === t.id}
                              onClick={() => handleReviewRequest(t, true)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition-colors disabled:opacity-50"
                            >
                              {processingTx?.id === t.id && processingTx.action === 'approve' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              <span>{processingTx?.id === t.id && processingTx.action === 'approve' ? 'Approving...' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={processingTx?.id === t.id}
                              onClick={() => handleReviewRequest(t, false)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600/80 hover:bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors disabled:opacity-50"
                            >
                              {processingTx?.id === t.id && processingTx.action === 'reject' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                              <span>{processingTx?.id === t.id && processingTx.action === 'reject' ? 'Rejecting...' : 'Reject'}</span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              t.status === 'approved' || t.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {t.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: REFERRAL OVERVIEW ================= */}
        {tab === 'referrals' && (
          <div className="space-y-6 animate-fade">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Referral Overview</h3>
              <p className="text-xs text-stone-400 mt-1">
                Referral relationships and bonus transactions are read from Supabase. Payouts are created by the deposit approval function.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Total Referrals</span>
                <div className="mt-3 font-display text-3xl font-bold text-white">{referredProfiles.length}</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Referrals With Deposits</span>
                <div className="mt-3 font-display text-3xl font-bold text-emerald-300">
                  {new Set(referrals.filter((referral) => referral.status === 'approved').map((referral) => referral.referred_id)).size}
                </div>
              </div>
              <div className="rounded-2xl border border-gold-500/20 bg-gold-950/20 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gold-300">Total Bonuses Paid</span>
                <div className="mt-3 font-display text-3xl font-bold text-gold-300">{formatUGX(totalReferralBonusesPaid)}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-display text-lg font-bold text-white">Recent Referral Bonuses</h4>
                  <p className="text-xs text-stone-400">Credited transactions created by the backend approval flow.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-300">
                  {referralBonusTransactions.length} records
                </span>
              </div>

              {referralBonusTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-stone-400">
                  No referral bonuses have been credited yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-stone-400 font-medium">
                        <th className="p-3">Referrer</th>
                        <th className="p-3">Referred User</th>
                        <th className="p-3 text-right">Deposit Amount</th>
                        <th className="p-3 text-right">Bonus %</th>
                        <th className="p-3 text-right">Bonus Amount</th>
                        <th className="p-3 text-right">Date / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {referralBonusTransactions.slice(0, 20).map((transaction) => {
                        const meta = transaction.meta ?? {}
                        const referredId = typeof meta.referred_id === 'string' ? meta.referred_id : null
                        const referral = referrals.find(
                          (row) =>
                            row.referrer_id === transaction.user_id &&
                            (!referredId || row.referred_id === referredId)
                        )
                        const referredUser = users.find((user) => user.id === (referredId || referral?.referred_id))
                        const depositValue = meta.deposit_amount
                        const recordedDeposit =
                          typeof depositValue === 'number'
                            ? depositValue
                            : typeof depositValue === 'string' && depositValue.trim()
                            ? Number(depositValue)
                            : null
                        const percentageValue = meta.bonus_pct
                        const recordedPercentage =
                          typeof percentageValue === 'number'
                            ? percentageValue
                            : typeof percentageValue === 'string' && percentageValue.trim()
                            ? Number(percentageValue)
                            : referralBonusPct
                        const referrer = users.find((user) => user.id === transaction.user_id)

                        return (
                          <tr key={transaction.id} className="hover:bg-white/5">
                            <td className="p-3 font-semibold text-white">{referrer?.username || transaction.user_id}</td>
                            <td className="p-3 text-stone-300">{referredUser?.username || 'Recorded referral'}</td>
                            <td className="p-3 text-right text-stone-300">{recordedDeposit !== null ? formatUGX(recordedDeposit) : '—'}</td>
                            <td className="p-3 text-right text-stone-300">{recordedPercentage}%</td>
                            <td className="p-3 text-right font-bold text-emerald-300">{formatUGX(transaction.amount)}</td>
                            <td className="p-3 text-right text-stone-400">
                              <div>{formatDate(transaction.created_at)}</div>
                              <span className="text-[10px] font-semibold uppercase text-emerald-300">{transaction.status}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 7: VIDEO GUIDES ================= */}
        {tab === 'videos' && <AdminVideoManager />}

        {/* ================= TAB 8: SYSTEM SETTINGS ================= */}
        {tab === 'settings' && <AdminPlatformSettings />}
      </div>

      {/* Floating Real-time Feedback Toast (visible at any scroll position) */}
      {msg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-fade-up">
          <div
            className={`rounded-2xl p-4 shadow-2xl border flex items-center justify-between gap-3 backdrop-blur-md ${
              msg.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                : 'bg-red-950/95 border-red-500/50 text-red-100 shadow-red-950/50'
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
              className="text-stone-400 hover:text-white shrink-0 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
