import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Info,
  Layers,
  Lock,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Sprout,
  TrendingUp,
  User,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { formatUGX, formatDate, formatRelativeDays } from '../lib/format'
import type { Wallet, Investment, Transaction, AppNotification, FarmProject, PlatformSettings } from '../lib/types'
import AppLayout from '../components/AppLayout'
import FarmImage from '../components/FarmImage'
import { farmArtFor } from '../lib/farmArt'
import InvestmentScheduleTimeline from '../components/InvestmentScheduleTimeline'

type Tab = 'overview' | 'farms' | 'wallet' | 'referrals' | 'settings'

export default function Dashboard() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const activeTabQuery = (searchParams.get('tab') as Tab) || 'overview'
  const [tab, setTab] = useState<Tab>(activeTabQuery)

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const [farms, setFarms] = useState<FarmProject[]>([])
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Wallet deposit/withdraw modal state
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null)
  const [paymentProvider, setPaymentProvider] = useState<'mtn' | 'airtel'>('mtn')
  const [phoneContact, setPhoneContact] = useState('')
  const [amount, setAmount] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedInvForTimeline, setSelectedInvForTimeline] = useState<Investment | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Keep query param in sync
  useEffect(() => {
    const qTab = searchParams.get('tab') as Tab
    if (qTab && ['overview', 'farms', 'wallet', 'referrals', 'settings'].includes(qTab)) {
      setTab(qTab)
    }
  }, [searchParams])

  const handleTabSelect = (nextTab: string) => {
    const t = nextTab as Tab
    setTab(t)
    setSearchParams({ tab: t })
  }

  // Load all dashboard records
  const loadDashboardData = async () => {
    if (!user) return
    try {
      const [w, inv, t, n, f, s] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', user.id).single(),
        supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('farm_projects').select('*'),
        supabase.from('platform_settings').select('*').limit(1).maybeSingle(),
      ])

      setWallet((w.data as Wallet) ?? null)
      setInvestments((inv.data as Investment[]) ?? [])
      setTxs((t.data as Transaction[]) ?? [])
      setNotifs((n.data as AppNotification[]) ?? [])
      setFarms((f.data as FarmProject[]) ?? [])
      if (s.data) {
        setPlatformSettings(s.data as PlatformSettings)
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [user])

  useEffect(() => {
    if (profile?.phone && !phoneContact) {
      setPhoneContact(profile.phone)
    }
  }, [profile])

  // Compute withdrawal lock status
  const withdrawalLockInfo = (() => {
    const now = new Date()
    // 1. User-specific hold
    if (profile?.withdrawal_locked_until) {
      const userLockDate = new Date(profile.withdrawal_locked_until)
      if (userLockDate > now) {
        return {
          isLocked: true,
          lockedUntil: userLockDate,
          reason: `Account security hold active until ${formatDate(userLockDate.toISOString())}.`,
        }
      }
    }
    // 2. Platform-wide new account lock
    if (platformSettings?.withdrawal_lock_enabled && profile?.created_at) {
      const lockDays = platformSettings.withdrawal_lock_days ?? 7
      const unlockDate = new Date(new Date(profile.created_at).getTime() + lockDays * 86400000)
      if (unlockDate > now) {
        return {
          isLocked: true,
          lockedUntil: unlockDate,
          reason: `Initial security lock period active until ${formatDate(unlockDate.toISOString())} (${lockDays} days after registration).`,
        }
      }
    }
    return { isLocked: false, lockedUntil: null, reason: null }
  })()

  // True withdrawable balance respects lock and actual wallet balance (no fake math)
  const withdrawableBalance = withdrawalLockInfo.isLocked ? 0 : (wallet?.balance ?? 0)

  // Handle deposit or withdrawal request
  const submitWalletOp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !modal) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setErr('Please enter a valid amount greater than 0 UGX.')
      return
    }

    if (modal === 'withdraw') {
      if (withdrawalLockInfo.isLocked) {
        setErr(withdrawalLockInfo.reason || 'Withdrawals are currently locked for this account.')
        return
      }
      if (amt > (wallet?.balance ?? 0)) {
        setErr(`Withdrawal amount cannot exceed available balance of ${formatUGX(wallet?.balance ?? 0)}.`)
        return
      }
    }

    setBusy(true)
    setErr('')
    setMsg('')

    try {
      const { error } = await supabase.rpc('request_funds', {
        p_type: modal,
        p_amount: amt,
      })

      if (error) {
        setErr(error.message)
      } else {
        const providerName = paymentProvider === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money'
        setMsg(
          `${modal === 'deposit' ? 'Deposit' : 'Withdrawal'} request for ${formatUGX(
            amt
          )} via ${providerName} submitted! Awaiting settlement confirmation.`
        )
        setAmount('')
        setTimeout(() => {
          setModal(null)
          setMsg('')
        }, 2500)

        // Reload data
        await loadDashboardData()
        await refreshProfile()
      }
    } catch (error: any) {
      setErr(error.message || 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
    }
  }

  const activeInvestments = investments.filter(
    (i) => i.status === 'active' || i.status === 'pending'
  )
  const totalEarnings = wallet?.total_returns ?? 0
  const totalInvested = wallet?.total_invested ?? 0
  const availableBalance = wallet?.balance ?? 0

  return (
    <AppLayout
      activeTab={tab}
      onTabChange={handleTabSelect}
      onQuickDeposit={() => setModal('deposit')}
      onQuickWithdraw={() => setModal('withdraw')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-3 py-0.5 text-xs font-semibold text-forest-800">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-600" />
                Verified Investor Portfolio
              </span>
              <span className="text-xs text-ink-500 font-mono">ID: {profile?.username}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
              Investor Overview
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-0.5">
              Agricultural capital deployment and real-time livestock operation returns.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-deposit-header"
              type="button"
              onClick={() => {
                setModal('deposit')
                setErr('')
                setMsg('')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-forest-700 transition-colors"
            >
              <Plus className="h-4 w-4 text-gold-400" />
              <span>Deposit Funds</span>
            </button>
            <Link
              to="/marketplace"
              id="btn-marketplace-header"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-forest-900 hover:bg-forest-50 transition-colors"
            >
              <Sprout className="h-4 w-4 text-forest-600" />
              <span>Browse Programs</span>
            </Link>
          </div>
        </div>

        {/* ================= PRIMARY FINANCIAL METRICS CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Wallet Balance Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white p-5 shadow-sm border border-forest-900">
            <div className="flex items-center justify-between text-xs text-forest-200">
              <span className="font-medium uppercase tracking-wider">Total Wallet Balance</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-gold-400">
                <WalletIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {formatUGX(availableBalance)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-forest-200/90 pt-2 border-t border-forest-800">
              <span>Ready to Allocate</span>
              <button
                type="button"
                onClick={() => setModal('deposit')}
                className="text-gold-300 hover:text-gold-200 font-semibold inline-flex items-center gap-0.5"
              >
                + Top Up
              </button>
            </div>
          </div>

          {/* Available / Withdrawable Balance */}
          <div className="rounded-2xl bg-white border border-stone-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span className="font-medium uppercase tracking-wider">Available Withdrawable</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  withdrawalLockInfo.isLocked
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-forest-700'
                }`}
              >
                {withdrawalLockInfo.isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4" />
                )}
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-forest-950">
              {formatUGX(withdrawableBalance)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-stone-100">
              {withdrawalLockInfo.isLocked ? (
                <span className="text-amber-700 font-medium inline-flex items-center gap-1 text-[11px]">
                  <Lock className="h-3 w-3 shrink-0" />
                  Locked until {formatDate(withdrawalLockInfo.lockedUntil?.toISOString() || '')}
                </span>
              ) : (
                <span>MTN / Airtel Money</span>
              )}
              <button
                type="button"
                onClick={() => setModal('withdraw')}
                className="text-forest-700 hover:text-forest-900 font-semibold"
              >
                Withdraw →
              </button>
            </div>
          </div>

          {/* Active Capital Deployed */}
          <div className="rounded-2xl bg-white border border-stone-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span className="font-medium uppercase tracking-wider">Active Investments</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-emerald-700">
                <Sprout className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-forest-950">
              {formatUGX(totalInvested)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-stone-100">
              <span>{activeInvestments.length} Active Program{activeInvestments.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                onClick={() => handleTabSelect('farms')}
                className="text-forest-700 hover:text-forest-900 font-semibold"
              >
                View Holdings →
              </button>
            </div>
          </div>

          {/* Total Earnings / Returns */}
          <div className="rounded-2xl bg-white border border-stone-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span className="font-medium uppercase tracking-wider">Total Earnings</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700">
              +{formatUGX(totalEarnings)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-stone-100">
              <span>Cumulative Yield</span>
              <span className="text-emerald-700 font-medium">Verified Payouts</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="border-b border-stone-200">
          <nav className="flex space-x-2 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: Layers },
              { id: 'farms', label: `My Investments (${investments.length})`, icon: Sprout },
              { id: 'wallet', label: 'Wallet & Transactions', icon: WalletIcon },
              { id: 'referrals', label: 'Referral Program', icon: Share2 },
              { id: 'settings', label: 'Account Profile', icon: User },
            ].map((t) => {
              const Icon = t.icon
              const isCur = tab === t.id
              return (
                <button
                  key={t.id}
                  id={`tab-btn-${t.id}`}
                  type="button"
                  onClick={() => handleTabSelect(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                    isCur
                      ? 'bg-forest-800 text-white shadow-xs'
                      : 'bg-white text-ink-600 hover:bg-stone-100 hover:text-forest-900 border border-stone-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {tab === 'overview' && (
          <div className="space-y-8 animate-fade">
            {/* Active Investments Progress Banner */}
            <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-forest-950">
                    Active Investment Programs
                  </h2>
                  <p className="text-xs text-ink-500">
                    Your real-time operations, daily accrued returns, and milestone maturity schedules.
                  </p>
                </div>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-forest-700 hover:text-forest-900"
                >
                  <span>Explore New Programs</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              {investments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
                    <Sprout className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-base font-bold text-forest-950">
                    No active agricultural holdings
                  </h3>
                  <p className="text-xs text-ink-500 max-w-sm mx-auto">
                    You haven't invested in any livestock or grain operations yet. Browse the
                    marketplace to start earning projected periodic returns.
                  </p>
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-700"
                  >
                    <span>View Investment Opportunities</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {investments.map((inv) => {
                    const farm = farms.find((f) => f.id === inv.farm_id)
                    const daysRemaining = formatRelativeDays(inv.maturity_date)

                    return (
                      <div
                        key={inv.id}
                        className="flex flex-col rounded-2xl border border-stone-200/90 bg-stone-50/60 p-4 hover:border-forest-600/40 transition-all hover:bg-white space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-stone-200">
                            <FarmImage
                              src={farm?.image_url || farmArtFor(farm?.name || farm?.category)}
                              alt={farm?.name || 'Investment'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700">
                                {farm?.category || 'Agri Investment'}
                              </span>
                              <span className="rounded-full bg-forest-100 text-forest-800 px-2 py-0.5 text-[10px] font-bold">
                                {inv.status}
                              </span>
                            </div>
                            <h4 className="truncate font-display text-base font-bold text-forest-950">
                              {farm?.name || 'Managed Farm Project'}
                            </h4>
                            <p className="text-[11px] text-ink-500 truncate">
                              Ref: {inv.reference}
                            </p>
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-2.5 border border-stone-200/70 text-center">
                          <div>
                            <span className="text-[10px] text-ink-500 block">Principal</span>
                            <span className="font-semibold text-xs text-forest-950">
                              {formatUGX(inv.amount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-ink-500 block">Expected Profit</span>
                            <span className="font-semibold text-xs text-emerald-700">
                              +{formatUGX(inv.expected_return)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-ink-500 block">Schedule</span>
                            <span className="font-semibold text-xs text-forest-800">
                              {daysRemaining}
                            </span>
                          </div>
                        </div>

                        {/* Timeline Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvForTimeline(inv)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-forest-800/15 bg-white py-2 text-xs font-semibold text-forest-800 hover:bg-forest-50"
                        >
                          <Clock className="h-3.5 w-3.5 text-forest-600" />
                          <span>View Lifecycle Timeline</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grid for Transactions & Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Transactions List */}
              <div className="lg:col-span-2 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-forest-950">
                      Recent Activity & Transactions
                    </h2>
                    <p className="text-xs text-ink-500">
                      Deposits, withdrawals, and accrued periodic payouts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabSelect('wallet')}
                    className="text-xs font-semibold text-forest-700 hover:text-forest-900"
                  >
                    View All →
                  </button>
                </div>

                {txs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    No transactions registered yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-ink-500 font-medium">
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Reference</th>
                          <th className="pb-3 text-right">Amount</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {txs.slice(0, 6).map((t) => (
                          <tr key={t.id} className="hover:bg-stone-50/50">
                            <td className="py-3 font-semibold text-forest-950 capitalize">
                              {t.type.replace('_', ' ')}
                            </td>
                            <td className="py-3 text-ink-500">{formatDate(t.created_at)}</td>
                            <td className="py-3 font-mono text-[11px] text-ink-500">
                              {t.reference}
                            </td>
                            <td className="py-3 text-right font-display font-bold text-forest-950">
                              {t.type === 'withdrawal' || t.type === 'investment' ? '-' : '+'}
                              {formatUGX(t.amount)}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                  t.status === 'approved' || t.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : t.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
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
                )}
              </div>

              {/* Sidebar Cards: Notifications & Quick Referral */}
              <div className="space-y-6">
                {/* Notifications Panel */}
                <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="font-display text-base font-bold text-forest-950">
                      Portfolio Updates
                    </h3>
                  </div>

                  {notifs.length === 0 ? (
                    <p className="text-xs text-ink-500">You are completely up to date.</p>
                  ) : (
                    <div className="space-y-3">
                      {notifs.slice(0, 3).map((n) => (
                        <div
                          key={n.id}
                          className="rounded-xl border border-stone-100 bg-stone-50/60 p-3 text-xs"
                        >
                          <p className="font-bold text-forest-950">{n.title}</p>
                          <p className="text-ink-600 mt-0.5">{n.body}</p>
                          <span className="text-[10px] text-ink-400 mt-1 block">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referral Invite Card */}
                <div className="rounded-3xl border border-forest-900/10 bg-gradient-to-br from-forest-900 to-forest-950 text-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-gold-400 text-xs font-bold uppercase tracking-wider">
                    <Award className="h-4 w-4" />
                    <span>Referral Program</span>
                  </div>
                  <h4 className="font-display text-lg font-bold text-white">
                    Earn 5% on Network Allocations
                  </h4>
                  <p className="text-xs text-stone-300">
                    Invite institutional or private agribusiness partners with your unique code.
                  </p>

                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-gold-300">
                      {profile?.referral_code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="text-stone-200 hover:text-white font-semibold"
                    >
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MY INVESTMENTS ================= */}
        {tab === 'farms' && (
          <div className="space-y-6 animate-fade">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-forest-950">
                  Your Investment Holdings
                </h2>
                <p className="text-xs text-ink-500">
                  Detailed status, capital allocation, and maturity schedules for all your contracts.
                </p>
              </div>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-700"
              >
                <Plus className="h-4 w-4 text-gold-400" />
                <span>New Investment</span>
              </Link>
            </div>

            {investments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
                <Sprout className="mx-auto h-12 w-12 text-forest-700" />
                <h3 className="font-display text-lg font-bold text-forest-950">No holdings found</h3>
                <p className="text-xs text-ink-500 max-w-sm mx-auto">
                  Fund livestock breeding or feed production programs to begin earning fixed yields.
                </p>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-forest-700"
                >
                  Explore Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((inv) => {
                  const farm = farms.find((f) => f.id === inv.farm_id)
                  const durationMonths = farm?.duration_months || 12
                  const returnPct = farm?.expected_return_pct || 14
                  const daysRemaining = formatRelativeDays(inv.maturity_date)

                  return (
                    <div
                      key={inv.id}
                      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-2xl overflow-hidden shrink-0 bg-stone-200">
                            <FarmImage
                              src={farm?.image_url || farmArtFor(farm?.name || farm?.category)}
                              alt={farm?.name || 'Investment Farm'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700">
                                {farm?.category || 'Program'}
                              </span>
                              <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold">
                                {inv.status}
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-forest-950">
                              {farm?.name || 'Agricultural Holding'}
                            </h3>
                            <p className="text-xs text-ink-500">Ref: {inv.reference}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-ink-500">Committed Capital</span>
                          <div className="font-display text-xl font-bold text-forest-950">
                            {formatUGX(inv.amount)}
                          </div>
                          <span className="text-xs text-emerald-700 font-semibold">
                            +{formatUGX(inv.expected_return)} expected return
                          </span>
                        </div>
                      </div>

                      {/* Embedded Schedule Timeline */}
                      <InvestmentScheduleTimeline
                        amount={inv.amount}
                        durationMonths={durationMonths}
                        returnPct={returnPct}
                        startDate={inv.start_date}
                        completionDate={inv.maturity_date}
                        compact
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: WALLET & TRANSACTIONS ================= */}
        {tab === 'wallet' && (
          <div className="space-y-8 animate-fade">
            {/* Wallet Balance Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-3xl bg-forest-900 text-white p-7 shadow-md flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-forest-200">
                    <span>Available Liquidity</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      UGX / Mobile Money
                    </span>
                  </div>
                  <div className="mt-2 font-display text-4xl font-bold tracking-tight text-white">
                    {formatUGX(availableBalance)}
                  </div>
                  <p className="mt-1 text-xs text-stone-300">
                    Deposited funds are securely escrowed for Ugandan farm project allocations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-forest-800">
                  <button
                    type="button"
                    onClick={() => {
                      setModal('deposit')
                      setErr('')
                      setMsg('')
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-forest-700 hover:bg-forest-600 py-3 text-xs font-bold text-white transition-colors"
                  >
                    <Plus className="h-4 w-4 text-gold-400" />
                    <span>Deposit Funds</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModal('withdraw')
                      setErr('')
                      setMsg('')
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 py-3 text-xs font-bold text-stone-200 transition-colors"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Request Withdrawal</span>
                  </button>
                </div>
              </div>

              {/* Deposit Bank Wire / Mobile Money Reference Information */}
              <div className="lg:col-span-2 rounded-3xl border border-stone-200 bg-white p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-forest-800" />
                    <h3 className="font-display text-base font-bold text-forest-950">
                      Uganda Mobile Money Settlement Details
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-200">
                    Instant & Automated
                  </span>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Deposit directly via MTN Mobile Money or Airtel Money Uganda. Use your personal investor code as the transaction reference.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-stone-50 p-4 text-xs border border-stone-200">
                  <div>
                    <span className="text-ink-500 font-medium">MTN MoMo Merchant</span>
                    <p className="font-bold text-forest-950 mt-0.5">Code: 984210</p>
                    <p className="text-[10px] text-ink-500 font-mono mt-0.5">Dial *165*3#</p>
                  </div>
                  <div>
                    <span className="text-ink-500 font-medium">Airtel Money Pay</span>
                    <p className="font-bold text-forest-950 mt-0.5">Code: 771920</p>
                    <p className="text-[10px] text-ink-500 font-mono mt-0.5">Dial *185*9#</p>
                  </div>
                  <div>
                    <span className="text-ink-500 font-medium">Personal Reference</span>
                    <p className="font-bold text-forest-800 font-mono mt-0.5">{profile?.username}-DEP</p>
                    <p className="text-[10px] text-ink-500 mt-0.5">Auto-matches wallet</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Transaction Table */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-display text-lg font-bold text-forest-950">
                Transaction History
              </h3>

              {txs.length === 0 ? (
                <p className="text-xs text-ink-500 py-6 text-center">No transaction records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-ink-500 font-medium">
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Reference</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {txs.map((t) => (
                        <tr key={t.id} className="hover:bg-stone-50/50">
                          <td className="py-3.5 font-semibold text-forest-950 capitalize">
                            {t.type.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 text-ink-500">{formatDate(t.created_at)}</td>
                          <td className="py-3.5 font-mono text-[11px] text-ink-500">{t.reference}</td>
                          <td className="py-3.5 text-right font-display font-bold text-forest-950">
                            {t.type === 'withdrawal' || t.type === 'investment' ? '-' : '+'}
                            {formatUGX(t.amount)}
                          </td>
                          <td className="py-3.5 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                t.status === 'approved' || t.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : t.status === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
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
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: REFERRALS ================= */}
        {tab === 'referrals' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade">
            <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xs text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
                <Share2 className="h-7 w-7 text-forest-800" />
              </div>

              <h2 className="font-display text-2xl font-bold text-forest-950">
                Investor Partner Network
              </h2>
              <p className="text-xs sm:text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
                Introduce other agricultural investors to Feldwert Capital. When an investor signs up
                with your referral code and funds their first project, you earn a 5% bonus dividend
                directly to your wallet.
              </p>

              {/* Referral Code Box */}
              <div className="max-w-md mx-auto rounded-2xl border-2 border-dashed border-forest-600/30 bg-forest-50/50 p-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500 block">
                  Your Unique Referral Code
                </span>
                <div className="font-display text-3xl font-bold tracking-wider text-forest-900">
                  {profile?.referral_code}
                </div>
                <button
                  type="button"
                  id="btn-copy-referral"
                  onClick={handleCopyCode}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-5 py-2 text-xs font-bold text-white hover:bg-forest-700 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Referral Code'}</span>
                </button>
              </div>

              {/* Referral Metrics */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
                  <span className="text-xs text-ink-500">Referred Investors</span>
                  <div className="font-display text-2xl font-bold text-forest-950 mt-0.5">0</div>
                </div>
                <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
                  <span className="text-xs text-ink-500">Referral Earnings</span>
                  <div className="font-display text-2xl font-bold text-emerald-700 mt-0.5">0 UGX</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROFILE & SETTINGS ================= */}
        {tab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade">
            <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-800 text-white font-display text-2xl font-bold">
                  {(profile?.full_name || profile?.username || 'I')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-forest-950">
                    {profile?.full_name || profile?.username}
                  </h2>
                  <p className="text-xs text-ink-500">@{profile?.username} · Verified Account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-ink-500">Full Name</span>
                  <p className="font-semibold text-sm text-forest-950 mt-0.5">
                    {profile?.full_name || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-ink-500">Phone Contact</span>
                  <p className="font-semibold text-sm text-forest-950 mt-0.5">
                    {profile?.phone || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-ink-500">Role / Status</span>
                  <p className="font-semibold text-sm text-forest-950 mt-0.5 capitalize">
                    {profile?.role || 'Investor'}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-ink-500">Registered Since</span>
                  <p className="font-semibold text-sm text-forest-950 mt-0.5">
                    {formatDate(profile?.created_at)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs text-ink-500">End your current session safely</span>
                <button
                  id="btn-signout-settings"
                  type="button"
                  onClick={signOut}
                  className="rounded-xl bg-red-50 text-red-700 px-4 py-2 text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: DEPOSIT / WITHDRAW ================= */}
      {modal && (
        <div
          id="funds-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fade"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-stone-200 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-100 text-forest-800">
                  {modal === 'deposit' ? <Plus className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <h3 className="font-display text-xl font-bold text-forest-950 capitalize">
                  {modal === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full p-1 text-ink-400 hover:text-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed mb-4">
              {modal === 'deposit'
                ? 'Initiate a secure deposit via Uganda Mobile Money. After submitting, approve the prompt on your handset or complete via merchant pay.'
                : withdrawalLockInfo.isLocked
                ? 'Withdrawals are currently locked for your account under security review protocols.'
                : `Enter the amount to withdraw to your registered MTN or Airtel Mobile Money wallet. Available withdrawable balance: ${formatUGX(
                    withdrawableBalance
                  )}.`}
            </p>

            {modal === 'withdraw' && withdrawalLockInfo.isLocked && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-4 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Lock className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Withdrawal Lock Active</span>
                </div>
                <p className="text-[11px] leading-relaxed">{withdrawalLockInfo.reason}</p>
                <p className="text-[11px] text-amber-700 font-medium">
                  Capital remains securely allocated and actively compounding.
                </p>
              </div>
            )}

            <form onSubmit={submitWalletOp} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-500 block mb-1.5">
                  Select Mobile Money Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('mtn')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition-all ${
                      paymentProvider === 'mtn'
                        ? 'border-amber-400 bg-amber-50/80 text-amber-950 shadow-xs ring-1 ring-amber-400'
                        : 'border-stone-200 bg-white text-ink-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-amber-400 border border-amber-500 shrink-0" />
                    <span>MTN MoMo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('airtel')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition-all ${
                      paymentProvider === 'airtel'
                        ? 'border-red-400 bg-red-50/80 text-red-950 shadow-xs ring-1 ring-red-400'
                        : 'border-stone-200 bg-white text-ink-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-red-500 border border-red-600 shrink-0" />
                    <span>Airtel Money</span>
                  </button>
                </div>
              </div>

              {/* Phone contact */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-500 block mb-1.5">
                  Registered Mobile Money Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    placeholder="e.g. +256 772 123456"
                    value={phoneContact}
                    onChange={(e) => setPhoneContact(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 py-2.5 pl-10 pr-4 text-xs font-medium text-forest-950 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-500">
                    Amount (UGX)
                  </label>
                  {modal === 'withdraw' && (
                    <span className="text-[11px] text-ink-500">
                      Max: {formatUGX(withdrawableBalance)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-forest-950">
                    UGX
                  </span>
                  <input
                    id="input-funds-amount"
                    type="number"
                    autoFocus
                    min={10000}
                    max={modal === 'withdraw' ? withdrawableBalance : 100000000}
                    step={10000}
                    placeholder="e.g. 500000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={modal === 'withdraw' && withdrawalLockInfo.isLocked}
                    className="w-full rounded-xl border border-stone-300 py-3 pl-14 pr-4 font-display text-lg font-bold text-forest-950 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[50000, 100000, 250000, 500000, 1000000, 2500000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={modal === 'withdraw' && (withdrawalLockInfo.isLocked || preset > withdrawableBalance)}
                    onClick={() => setAmount(String(preset))}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-forest-900 hover:bg-forest-50 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {formatUGX(preset)}
                  </button>
                ))}
              </div>

              {modal === 'deposit' && (
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-[11px] text-ink-600 space-y-1">
                  <div className="flex justify-between font-semibold text-forest-950">
                    <span>Merchant Pay Code:</span>
                    <span className="font-mono font-bold">
                      {paymentProvider === 'mtn' ? '984210 (MTN)' : '771920 (Airtel)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-500">
                    <span>Payment Reference:</span>
                    <span className="font-mono font-bold text-forest-800">{profile?.username}-DEP</span>
                  </div>
                </div>
              )}

              {err && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                  {err}
                </div>
              )}

              {msg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{msg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs font-bold text-ink-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-funds"
                  type="submit"
                  disabled={
                    busy ||
                    !amount ||
                    (modal === 'withdraw' && (withdrawalLockInfo.isLocked || withdrawableBalance <= 0))
                  }
                  className="flex-1 rounded-xl bg-forest-800 py-2.5 text-xs font-bold text-white hover:bg-forest-700 disabled:opacity-50"
                >
                  {busy
                    ? 'Processing...'
                    : modal === 'withdraw' && withdrawalLockInfo.isLocked
                    ? 'Withdrawal Locked'
                    : `Confirm ${modal === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TIMELINE POPUP ================= */}
      {selectedInvForTimeline && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fade"
          onClick={() => setSelectedInvForTimeline(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-stone-200 animate-fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-forest-950">
                Investment Contract Lifecycle
              </h3>
              <button
                type="button"
                onClick={() => setSelectedInvForTimeline(null)}
                className="rounded-full p-1 text-ink-400 hover:text-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <InvestmentScheduleTimeline
              amount={selectedInvForTimeline.amount}
              durationMonths={
                farms.find((f) => f.id === selectedInvForTimeline.farm_id)?.duration_months || 12
              }
              returnPct={
                farms.find((f) => f.id === selectedInvForTimeline.farm_id)?.expected_return_pct || 14
              }
              startDate={selectedInvForTimeline.start_date}
              completionDate={selectedInvForTimeline.maturity_date}
            />

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setSelectedInvForTimeline(null)}
                className="rounded-xl bg-forest-800 px-5 py-2 text-xs font-bold text-white hover:bg-forest-700"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
