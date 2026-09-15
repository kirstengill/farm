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
  Mail,
  MessageCircle,
  Lock,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Sprout,
  TrendingUp,
  User,
  Users,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { formatUGX, formatDate, formatRelativeDays } from '../lib/format'
import type {
  Wallet,
  Investment,
  Transaction,
  AppNotification,
  FarmProject,
  PlatformSettings,
  Profile,
  Referral,
} from '../lib/types'
import AppLayout from '../components/AppLayout'
import FarmImage from '../components/FarmImage'
import { farmArtFor } from '../lib/farmArt'
import InvestmentScheduleTimeline from '../components/InvestmentScheduleTimeline'
import { getPlatformSettings } from '../lib/settings'

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
  const [successMsg, setSuccessMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedInvForTimeline, setSelectedInvForTimeline] = useState<Investment | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [shareToast, setShareToast] = useState('')
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [referredUsers, setReferredUsers] = useState<Profile[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])

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
      const [w, inv, t, n, f, s, profilesRes, referralsRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle(),
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
          .limit(50),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('farm_projects').select('*'),
        getPlatformSettings(),
        supabase.from('profiles').select('*'),
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setWallet((w.data as Wallet) ?? null)
      setInvestments((inv.data as Investment[]) ?? [])
      setTxs((t.data as Transaction[]) ?? [])
      setNotifs((n.data as AppNotification[]) ?? [])
      setFarms((f.data as FarmProject[]) ?? [])
      if (s) {
        setPlatformSettings(s as PlatformSettings)
      }
      if (profilesRes.data) {
        const list = (profilesRes.data as Profile[]).filter(
          (p) => p.id !== user.id && p.referred_by === user.id
        )
        setReferredUsers(list)
      }
      setReferrals((referralsRes.data as Referral[]) ?? [])
    } catch (e) {
      console.error('Error loading dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()

    // Listen for platform settings updates across admin and investor interfaces
    const handleSettingsUpdate = () => {
      getPlatformSettings().then((fresh) => {
        setPlatformSettings(fresh)
      })
    }
    window.addEventListener('platform-settings-updated', handleSettingsUpdate)
    return () => window.removeEventListener('platform-settings-updated', handleSettingsUpdate)
  }, [user])

  useEffect(() => {
    if (profile?.phone && !phoneContact) {
      setPhoneContact(profile.phone)
    }
    if (profile && user) {
      supabase.from('profiles').select('*').then((res: any) => {
        if (res.data) {
          const list = (res.data as Profile[]).filter(
            (p) => p.id !== user.id && p.referred_by === user.id
          )
          setReferredUsers(list)
        }
      })
    }
  }, [profile, user])

  // Compute withdrawal lock status from backend settings & user state
  const withdrawalLockInfo = (() => {
    const now = new Date()
    // 1. User-specific custom lock hold
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

    // 2. Platform-wide withdrawal lock
    const lockDays = platformSettings?.withdrawal_lock_days ?? 7
    const lockEnabled = platformSettings?.withdrawal_lock_enabled ?? (lockDays > 0)

    if (lockEnabled && lockDays > 0) {
      // Base lock period on latest approved deposit, or account registration
      const approvedDeposits = txs.filter(
        (t) => t.type === 'deposit' && (t.status === 'approved' || t.status === 'completed')
      )
      const latestDepositTime =
        approvedDeposits.length > 0
          ? Math.max(...approvedDeposits.map((d) => new Date(d.created_at).getTime()))
          : null

      const anchorTime =
        latestDepositTime ||
        (profile ? new Date(profile.created_at).getTime() : Date.now())
      const unlockDate = new Date(anchorTime + lockDays * 86400000)

      if (unlockDate > now) {
        return {
          isLocked: true,
          lockedUntil: unlockDate,
          reason: `Withdrawals are currently locked. Withdrawals will become available after ${lockDays} days (on ${formatDate(unlockDate.toISOString())}).`,
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
    if (busy || !user || !modal) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setErr('Please enter a valid amount greater than 0 UGX.')
      return
    }

    if (modal === 'withdraw') {
      const minW = platformSettings?.min_withdrawal ?? 10000
      if (amt < minW) {
        setErr(`Minimum withdrawal is UGX ${minW.toLocaleString('en-US')}.`)
        return
      }
      if (withdrawalLockInfo.isLocked) {
        setErr(
          withdrawalLockInfo.reason ||
            `Withdrawals are currently locked. Withdrawals will become available after ${
              platformSettings?.withdrawal_lock_days ?? 7
            } days.`
        )
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
      const method = paymentProvider === 'mtn' ? 'mtn_mobile_money' : 'airtel_money'
      const clientReference = modal === 'deposit' ? `DEP-${crypto.randomUUID()}` : undefined
      const rpcName = modal === 'deposit' ? 'request_deposit' : 'request_funds'
      const rpcPayload =
        modal === 'deposit'
          ? {
              p_amount: amt,
              p_method: method,
              p_phone: phoneContact.trim(),
              p_reference: clientReference,
            }
          : {
              p_type: modal,
              p_amount: amt,
              p_method: method,
              p_phone: phoneContact.trim(),
            }
      const { data, error } = await supabase.rpc(rpcName, rpcPayload)

      if (error) {
        const errorMessage = error.message || ''
        setErr(
          /reference|not-null|constraint/i.test(errorMessage)
            ? 'We could not create the request. Please try again.'
            : errorMessage.includes('Minimum')
            ? errorMessage
            : 'We could not submit your request. Please check the details and try again.'
        )
      } else {
        const providerName = paymentProvider === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money'
        const createdReference =
          modal === 'deposit' && data && typeof data === 'object' && 'reference' in data
            ? String(data.reference)
            : clientReference
        setSuccessMsg(
          `${modal === 'deposit' ? 'Deposit' : 'Withdrawal'} request for ${formatUGX(
            amt
          )} via ${providerName} submitted${
            createdReference ? ` with reference ${createdReference}` : ''
          }. Awaiting settlement confirmation.`
        )
        setAmount('')
        setModal(null)
        window.setTimeout(() => setSuccessMsg(''), 6000)

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

  const referralCode = profile?.referral_code || ''
  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/signup?ref=${referralCode}`
      : `https://feldwert.de/signup?ref=${referralCode}`

  const shareMessage = `Join me on Feldwert Capital to invest in verified agricultural opportunities. Use my referral invitation link: ${referralLink}`

  const handleShareReferral = () => {
    setShareMenuOpen(true)
  }

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Feldwert Capital - Agricultural Investments',
      text: shareMessage,
      url: referralLink,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        setShareMenuOpen(false)
        await navigator.share(shareData)
        setShareToast('Invitation shared successfully!')
        setTimeout(() => setShareToast(''), 3500)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setShareToast('Unable to open device sharing.')
          setTimeout(() => setShareToast(''), 3500)
        }
      }
    }
  }

  const handleShareTarget = (target: 'whatsapp' | 'telegram' | 'sms' | 'email') => {
    const encodedMessage = encodeURIComponent(shareMessage)
    const targetUrls = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage.replace(` ${referralLink}`, ''))}`,
      sms: `sms:?&body=${encodedMessage}`,
      email: `mailto:?subject=${encodeURIComponent('Your Feldwert Capital invitation')}&body=${encodedMessage}`,
    }

    window.open(targetUrls[target], '_blank', 'noopener,noreferrer')
    setShareMenuOpen(false)
  }

  const handleOpenReferralSignup = () => {
    if (!referralCode) return
    setShareMenuOpen(false)
    navigate(`/signup?ref=${encodeURIComponent(referralCode)}`)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      setShareToast('Referral link copied to clipboard!')
      setTimeout(() => {
        setCopiedLink(false)
        setShareToast('')
      }, 3500)
    } catch {
      setShareToast(`Referral Link: ${referralLink}`)
      setTimeout(() => setShareToast(''), 4500)
    }
  }

  const handleCopyCode = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopiedCode(true)
      setShareToast('Referral code copied to clipboard!')
      setTimeout(() => {
        setCopiedCode(false)
        setShareToast('')
      }, 3500)
    } catch {}
  }

  const activeInvestments = investments.filter(
    (i) => i.status === 'active' || i.status === 'pending'
  )
  const totalEarnings = wallet?.total_returns ?? 0
  const totalInvested = wallet?.total_invested ?? 0
  const availableBalance = wallet?.balance ?? 0
  const referralBonusTransactions = txs.filter(
    (t) =>
      t.type === 'referral_bonus' &&
      (t.status === 'approved' || t.status === 'completed')
  )
  const totalReferralEarnings = referralBonusTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  )
  const pendingReferralEarnings = referrals
    .filter((referral) => referral.status === 'pending')
    .reduce((sum, referral) => sum + Number(referral.bonus_amount || 0), 0)
  const activeReferralCount = referrals.filter((referral) => referral.status === 'approved').length

  return (
    <AppLayout
      activeTab={tab}
      onTabChange={handleTabSelect}
      onQuickDeposit={() => setModal('deposit')}
      onQuickWithdraw={() => setModal('withdraw')}
    >
      {successMsg && (
        <div className="fixed right-4 top-4 z-[60] max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 shadow-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}
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
                    Earn {platformSettings?.referral_bonus_pct ?? 10}% on Approved Deposits
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
            {/* Dedicated Wallet Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-3xl bg-forest-900 text-white p-7 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-forest-200">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-forest-300">
                      Available Balance
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      Live Ledger · UGX
                    </span>
                  </div>
                  <div className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
                    {formatUGX(availableBalance)}
                  </div>
                  <p className="mt-2 text-xs text-forest-200 leading-relaxed">
                    Direct balance sourced from your secure Supabase wallet account. Ready for farm investment allocations or withdrawal.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-forest-800">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="btn-wallet-deposit"
                      type="button"
                      onClick={() => {
                        setModal('deposit')
                        setErr('')
                        setMsg('')
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-forest-700 hover:bg-forest-600 py-3 text-xs font-bold text-white transition-colors shadow-xs"
                    >
                      <Plus className="h-4 w-4 text-gold-400" />
                      <span>Deposit</span>
                    </button>
                    <button
                      id="btn-wallet-withdraw"
                      type="button"
                      onClick={() => {
                        setModal('withdraw')
                        setErr('')
                        setMsg('')
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 py-3 text-xs font-bold text-stone-200 transition-colors"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span>Withdraw</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-forest-800/60 text-[11px]">
                    <div>
                      <span className="text-forest-400">Total Invested:</span>
                      <p className="font-bold text-white mt-0.5">{formatUGX(totalInvested)}</p>
                    </div>
                    <div>
                      <span className="text-forest-400">Total Returns:</span>
                      <p className="font-bold text-emerald-300 mt-0.5">+{formatUGX(totalEarnings)}</p>
                    </div>
                  </div>
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
                    Automated & Instant
                  </span>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Deposit funds directly using MTN Mobile Money or Airtel Money Uganda. Always provide your personal investor reference so the system matches your account balance.
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
                    <p className="text-[10px] text-ink-500 mt-0.5">Auto-credits wallet</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 p-4 bg-stone-50/50 flex items-center justify-between gap-4">
                  <div className="text-xs">
                    <span className="font-bold text-forest-950 block">Withdrawal Settlement Policy</span>
                    <span className="text-ink-500 text-[11px]">
                      Withdrawals are settled directly to the phone number registered on your profile.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModal('withdraw')
                      setErr('')
                      setMsg('')
                    }}
                    className="shrink-0 rounded-xl border border-forest-800 text-forest-800 hover:bg-forest-800 hover:text-white px-3.5 py-1.5 text-xs font-bold transition-colors"
                  >
                    Request Payout
                  </button>
                </div>
              </div>
            </div>

            {/* Complete Transaction Table */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-forest-950">
                  Transaction History
                </h3>
                <span className="text-xs text-ink-500 font-mono">
                  {txs.length} total records
                </span>
              </div>

              {txs.length === 0 ? (
                <p className="text-xs text-ink-500 py-6 text-center">No transaction records found in your Supabase account.</p>
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
          <div className="max-w-4xl mx-auto space-y-6 animate-fade">
            {/* Referral Hero / Program Summary */}
            <div className="rounded-3xl border border-stone-200 bg-white p-7 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
                    <Users className="h-6 w-6 text-forest-800" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-forest-950">
                      Investor Partner Network
                    </h2>
                    <p className="text-xs text-ink-500">
                      Earn bonus dividends by introducing investors to verified agricultural opportunities
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-2 border border-forest-200 self-start sm:self-auto">
                  <span className="text-xs text-forest-800 font-medium">Commission Rate:</span>
                  <span className="font-display text-lg font-bold text-forest-900">
                    {platformSettings?.referral_bonus_pct ?? 10}%
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                When a new investor registers using your referral code or direct link and funds an agricultural holding, you earn an automated{' '}
                <strong className="text-forest-950 font-bold">{platformSettings?.referral_bonus_pct ?? 10}% bonus</strong> credited directly to your wallet balance.
              </p>

              {/* Referral Code & Link Sharing Suite */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {/* Referral Code Card */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                      Your Referral Code
                    </span>
                    <span className="text-[10px] text-ink-400 font-mono">For signup forms</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2.5">
                    <span className="font-display text-2xl font-bold tracking-wider text-forest-950">
                      {referralCode || '—'}
                    </span>
                    <button
                      type="button"
                      id="btn-copy-referral-code"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shrink-0"
                    >
                      {copiedCode ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Referral Link Card */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                      Direct Referral Link
                    </span>
                    <span className="text-[10px] text-ink-400 font-mono">Auto-applies code</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-3 py-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="w-full bg-transparent text-xs text-ink-600 font-mono outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      id="btn-copy-referral-link"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 px-3 py-1.5 text-xs font-bold text-forest-900 transition-colors shrink-0"
                    >
                      {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prominent Direct Share Button */}
              <div className="rounded-2xl bg-forest-950 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-forest-300 uppercase tracking-wider">
                    Instant Social & App Invitation
                  </span>
                  <h4 className="font-display text-base sm:text-lg font-bold text-white">
                    Share directly with your contacts
                  </h4>
                  <p className="text-xs text-stone-300">
                    Opens WhatsApp, Messages, Telegram, Email, and installed apps on your device.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-share-referral"
                  onClick={handleShareReferral}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-forest-950 font-bold px-6 py-3.5 text-xs sm:text-sm shadow-md transition-colors shrink-0"
                >
                  <Share2 className="h-4 w-4 text-forest-950" />
                  <span>Share Referral Link</span>
                </button>
              </div>

              {/* Referral Metrics Grid (Real Supabase Data) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
                  <span className="text-[11px] text-ink-500 font-medium block">
                    Total Referrals
                  </span>
                  <div className="font-display text-2xl font-bold text-forest-950 mt-1">
                    {referredUsers.length}
                  </div>
                  <span className="text-[10px] text-ink-400">Registered from your code</span>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
                  <span className="text-[11px] text-ink-500 font-medium block">
                    Active / Depositing
                  </span>
                  <div className="font-display text-2xl font-bold text-forest-900 mt-1">
                    {activeReferralCount}
                  </div>
                  <span className="text-[10px] text-ink-400">Approved referral records</span>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
                  <span className="text-[11px] text-ink-500 font-medium block">
                    Total Referral Earnings
                  </span>
                  <div className="font-display text-2xl font-bold text-emerald-700 mt-1">
                    {formatUGX(totalReferralEarnings)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Credited to wallet</span>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
                  <span className="text-[11px] text-ink-500 font-medium block">
                    Pending Earnings
                  </span>
                  <div className="font-display text-2xl font-bold text-gold-600 mt-1">
                    {formatUGX(pendingReferralEarnings)}
                  </div>
                  <span className="text-[10px] text-ink-400">Awaiting approval</span>
                </div>
              </div>
            </div>

            {/* Referred Users Network Table */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-forest-950">
                    Referred Network
                  </h3>
                  <p className="text-xs text-ink-500">
                    Investors registered with your referral credentials
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 text-ink-600 text-xs px-2.5 py-0.5 font-medium">
                  {referredUsers.length} member{referredUsers.length === 1 ? '' : 's'}
                </span>
              </div>

              {referredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center space-y-3">
                  <Users className="h-8 w-8 text-stone-300 mx-auto" />
                  <p className="text-xs text-ink-500 max-w-sm mx-auto">
                    You have not referred any investors yet. Share your referral code or link to start earning dividends.
                  </p>
                  <button
                    type="button"
                    onClick={handleShareReferral}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-white px-4 py-2 text-xs font-bold transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share Your Link</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-ink-500 font-medium">
                        <th className="pb-3">Investor</th>
                        <th className="pb-3">Username</th>
                        <th className="pb-3">Joined Date</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {referredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-stone-50/50">
                          <td className="py-3.5 font-semibold text-forest-950">
                            {u.full_name || 'Agricultural Partner'}
                          </td>
                          <td className="py-3.5 font-mono text-ink-500">@{u.username}</td>
                          <td className="py-3.5 text-ink-500">{formatDate(u.created_at)}</td>
                          <td className="py-3.5 text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold capitalize">
                              {u.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Referral Commission Transactions Table */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-forest-950">
                    Commission Dividends
                  </h3>
                  <p className="text-xs text-ink-500">
                    Direct commission credits earned from referred investor holdings
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 text-ink-600 text-xs px-2.5 py-0.5 font-medium">
                  {referralBonusTransactions.length} payout{referralBonusTransactions.length === 1 ? '' : 's'}
                </span>
              </div>

              {referralBonusTransactions.length === 0 ? (
                <p className="text-xs text-ink-500 py-6 text-center">
                  No commission dividends recorded yet. Bonus payouts will appear here automatically when referred investors fund projects.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-ink-500 font-medium">
                        <th className="pb-3">Reference</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {referralBonusTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-stone-50/50">
                            <td className="py-3.5 font-mono text-[11px] text-forest-950 font-bold">
                              {t.reference}
                            </td>
                            <td className="py-3.5 text-ink-500">{formatDate(t.created_at)}</td>
                            <td className="py-3.5 text-right font-display font-bold text-emerald-700">
                              +{formatUGX(t.amount)}
                            </td>
                            <td className="py-3.5 text-right">
                              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold capitalize">
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
                ? `Initiate a secure deposit via Uganda Mobile Money. Minimum deposit: ${formatUGX(
                    platformSettings?.min_deposit ?? 10000
                  )}. After submitting, approve the prompt on your handset.`
                : withdrawalLockInfo.isLocked
                ? `Withdrawals are currently locked under platform security holding rules. Minimum withdrawal: ${formatUGX(
                    platformSettings?.min_withdrawal ?? 10000
                  )}.`
                : `Enter the amount to withdraw to your registered MTN or Airtel Mobile Money wallet. Minimum withdrawal: ${formatUGX(
                    platformSettings?.min_withdrawal ?? 10000
                  )}. Available balance: ${formatUGX(withdrawableBalance)}.`}
            </p>

            {modal === 'withdraw' && (
              <div
                className={`rounded-2xl p-4 mb-4 text-xs space-y-1.5 ${
                  withdrawalLockInfo.isLocked
                    ? 'border border-amber-300 bg-amber-50/90 text-amber-900'
                    : 'border border-stone-200 bg-stone-50 text-forest-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Lock
                      className={`h-4 w-4 shrink-0 ${
                        withdrawalLockInfo.isLocked ? 'text-amber-700' : 'text-forest-700'
                      }`}
                    />
                    <span>
                      {withdrawalLockInfo.isLocked
                        ? 'Withdrawal Lock Active'
                        : 'Withdrawal Status'}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      withdrawalLockInfo.isLocked
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {platformSettings?.withdrawal_lock_enabled &&
                    (platformSettings?.withdrawal_lock_days ?? 0) > 0
                      ? `${platformSettings.withdrawal_lock_days} Days Policy`
                      : 'No Lock'}
                  </span>
                </div>

                {withdrawalLockInfo.isLocked ? (
                  <>
                    <p className="text-[11px] font-medium text-amber-900">
                      Withdrawals are currently locked.
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Withdrawals will become available after{' '}
                      <span className="font-bold">
                        {platformSettings?.withdrawal_lock_days ?? 7} days
                      </span>{' '}
                      (on{' '}
                      <span className="font-bold">
                        {formatDate(withdrawalLockInfo.lockedUntil?.toISOString())}
                      </span>
                      ).
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-ink-600">
                    {platformSettings?.withdrawal_lock_enabled &&
                    (platformSettings?.withdrawal_lock_days ?? 0) > 0
                      ? `Holding period completed (${platformSettings.withdrawal_lock_days}-day lock satisfied). You can withdraw immediately.`
                      : 'Immediate withdrawals enabled (No Lock restriction active).'}
                  </p>
                )}

                <div className="pt-1.5 flex items-center justify-between text-[11px] font-semibold border-t border-stone-200/60">
                  <span className="text-ink-600">Minimum withdrawal:</span>
                  <span className="font-mono text-forest-900 font-bold">
                    {formatUGX(platformSettings?.min_withdrawal ?? 10000)}
                  </span>
                </div>
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
                    min={modal === 'withdraw' ? (platformSettings?.min_withdrawal ?? 10000) : 10000}
                    max={modal === 'withdraw' ? withdrawableBalance : 100000000}
                    step={1000}
                    placeholder={`e.g. ${modal === 'withdraw' ? (platformSettings?.min_withdrawal ?? 10000) : 500000}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={modal === 'withdraw' && withdrawalLockInfo.isLocked}
                    className="w-full rounded-xl border border-stone-300 py-3 pl-14 pr-4 font-display text-lg font-bold text-forest-950 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5">
                {(modal === 'withdraw'
                  ? Array.from(new Set([platformSettings?.min_withdrawal ?? 10000, 50000, 100000, 250000, 500000, 1000000]))
                  : [50000, 100000, 250000, 500000, 1000000, 2500000]
                ).map((preset) => (
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

      {/* ================= MODAL: REFERRAL SHARE OPTIONS ================= */}
      {shareMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fade"
          onClick={() => setShareMenuOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-fade-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-referral-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="share-referral-title" className="font-display text-xl font-bold text-forest-950">
                  Share your referral link
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Choose an app to invite someone to Feldwert Capital.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareMenuOpen(false)}
                className="rounded-full p-1 text-ink-400 hover:bg-stone-100 hover:text-ink-700"
                aria-label="Close share options"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleShareTarget('whatsapp')}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-forest-950">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTarget('telegram')}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Send className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-forest-950">Telegram</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTarget('sms')}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Smartphone className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-forest-950">Messages</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTarget('email')}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left transition-colors hover:border-rose-300 hover:bg-rose-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-forest-950">Email</span>
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  handleCopyLink()
                  setShareMenuOpen(false)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-bold text-forest-900 transition-colors hover:bg-stone-50"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                onClick={handleOpenReferralSignup}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-forest-950 transition-colors hover:bg-gold-400"
              >
                <ExternalLink className="h-4 w-4" />
                Open signup page
              </button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-forest-700"
                >
                  <Share2 className="h-4 w-4" />
                  More sharing options
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-forest-950 text-white px-5 py-3 shadow-2xl border border-forest-800 text-xs font-semibold flex items-center gap-2.5 animate-fade-up">
          <CheckCircle2 className="h-4 w-4 text-gold-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}
    </AppLayout>
  )
}
