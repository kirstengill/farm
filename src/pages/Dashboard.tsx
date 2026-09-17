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
  Unlock,
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
import { calculateInvestmentDailyReturn } from '../lib/investmentReturns'
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
  const [platformSettingsError, setPlatformSettingsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Wallet deposit/withdraw modal state
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null)
  const [paymentProvider, setPaymentProvider] = useState<'mtn' | 'airtel'>('mtn')
  const [phoneContact, setPhoneContact] = useState('')
  const [depositTxRef, setDepositTxRef] = useState('')
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
  const [claimBusyId, setClaimBusyId] = useState<string | null>(null)

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
        setPlatformSettingsError(null)
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
      setPlatformSettingsError(e instanceof Error ? e.message : 'Failed to load platform settings.')
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
        setPlatformSettingsError(null)
      }).catch((e) => {
        setPlatformSettingsError(e instanceof Error ? e.message : 'Failed to load platform settings.')
      })
    }

    // Automatically re-fetch wallet & transactions when approved/credited from admin
    const handleFundsUpdate = () => {
      loadDashboardData()
    }

    window.addEventListener('platform-settings-updated', handleSettingsUpdate)
    window.addEventListener('wallet-balance-updated', handleFundsUpdate)
    window.addEventListener('storage', handleFundsUpdate)
    window.addEventListener('focus', handleFundsUpdate)

    return () => {
      window.removeEventListener('platform-settings-updated', handleSettingsUpdate)
      window.removeEventListener('wallet-balance-updated', handleFundsUpdate)
      window.removeEventListener('storage', handleFundsUpdate)
      window.removeEventListener('focus', handleFundsUpdate)
    }
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

  const withdrawableBalance = wallet?.balance ?? 0

  // Handle deposit or withdrawal request
  const submitWalletOp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !user || !modal) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setErr('Please enter a valid amount greater than 0 UGX.')
      return
    }

    if (modal === 'deposit' && !phoneContact.trim()) {
      setErr('Please enter your Registered Mobile Money Number.')
      return
    }

    if (modal === 'withdraw') {
      const minW = platformSettings?.min_withdrawal ?? 10000
      if (amt < minW) {
        setErr(`Minimum withdrawal is UGX ${minW.toLocaleString('en-US')}.`)
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
      const cleanedPhone = phoneContact.replace(/\D/g, '')
      const phoneSuffix = cleanedPhone.length >= 6 ? cleanedPhone.slice(-6) : cleanedPhone
      const clientReference =
        modal === 'deposit'
          ? depositTxRef.trim() ||
            `DEP-${phoneSuffix ? phoneSuffix + '-' : ''}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
          : undefined
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
              p_type: 'withdrawal',
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
          )} via ${providerName} (${phoneContact.trim()}) submitted${
            createdReference ? ` with reference ${createdReference}` : ''
          }. Awaiting settlement confirmation.`
        )
        setAmount('')
        setDepositTxRef('')
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

  const claimInvestmentReturns = async (investment: Investment) => {
    if (claimBusyId) return
    setClaimBusyId(investment.id)
    setErr('')
    try {
      const { data, error } = await supabase.rpc('claim_investment_returns', {
        p_investment_id: investment.id,
      })
      if (error) throw error
      const claimedAmount = Number(data || 0)
      setSuccessMsg(
        claimedAmount > 0
          ? `${formatUGX(claimedAmount)} in daily returns has been added to your wallet.`
          : 'There are no new daily returns available to claim.'
      )
      await loadDashboardData()
      window.setTimeout(() => setSuccessMsg(''), 5000)
    } catch (error: any) {
      setErr(error.message || 'Unable to claim returns.')
    } finally {
      setClaimBusyId(null)
    }
  }

  const [simulatingId, setSimulatingId] = useState<string | null>(null)

  const simulateAccrual = async (investment: Investment, advanceLock: boolean = false) => {
    if (simulatingId) return
    setSimulatingId(investment.id)
    setErr('')
    try {
      const { error } = await supabase.rpc('simulate_investment_earning_days', {
        p_investment_id: investment.id,
        p_additional_days: 1,
        advance_lock: advanceLock,
      })
      if (error) throw error
      await loadDashboardData()
      setSuccessMsg(
        advanceLock
          ? `Simulated 1 day elapsed and unlocked returns for ${investment.reference}!`
          : `Simulated +1 day accrual (+${formatUGX(investment.daily_return)}) for ${investment.reference}. Returns accumulated!`
      )
      window.setTimeout(() => setSuccessMsg(''), 4500)
    } catch (e: any) {
      setErr(e.message || 'Failed to simulate accrual')
    } finally {
      setSimulatingId(null)
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

  const totalAccumulatedReturns = activeInvestments.reduce(
    (sum, inv) => sum + Number(inv.accumulated_return || 0),
    0
  )
  const totalLockedReturns = activeInvestments.reduce(
    (sum, inv) => sum + Number(inv.locked_return ?? 0),
    0
  )
  const totalClaimableReturns = activeInvestments.reduce(
    (sum, inv) => sum + Number(inv.claimable_return ?? 0),
    0
  )
  const totalClaimedReturns = activeInvestments.reduce(
    (sum, inv) => sum + Number(inv.claimed_return ?? 0),
    0
  )
  const totalDailyReturnRunRate = activeInvestments.reduce(
    (sum, inv) => sum + Number(inv.daily_return ?? 0),
    0
  )

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
        <div className="fixed right-4 top-4 z-[60] max-w-md rounded-xl border border-emerald-800 bg-emerald-950/80 p-3 text-xs font-semibold text-emerald-200 shadow-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-900 px-3 py-0.5 text-xs font-semibold text-forest-300">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-500" />
                Verified Investor Portfolio
              </span>
              <span className="text-xs text-stone-400 font-mono">ID: {profile?.username}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              Investor Overview
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 bg-forest-900 px-4 py-2 text-xs sm:text-sm font-semibold text-stone-200 hover:bg-stone-800 transition-colors"
            >
              <Sprout className="h-4 w-4 text-forest-500" />
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
          <div className="rounded-2xl bg-forest-900 border border-stone-800 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-medium uppercase tracking-wider">Available Withdrawable</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg bg-stone-800 text-forest-500`}
              >
                <ArrowDownLeft className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {formatUGX(withdrawableBalance)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
              <span>MTN / Airtel Money</span>
              <button
                type="button"
                onClick={() => setModal('withdraw')}
                className="text-forest-500 hover:text-forest-400 font-semibold"
              >
                Withdraw →
              </button>
            </div>
          </div>

          {/* Active Capital Deployed */}
          <div className="rounded-2xl bg-forest-900 border border-stone-800 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-medium uppercase tracking-wider">Active Investments</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-800 text-emerald-500">
                <Sprout className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {formatUGX(totalInvested)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
              <span>{activeInvestments.length} Active Program{activeInvestments.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                onClick={() => handleTabSelect('farms')}
                className="text-forest-500 hover:text-forest-400 font-semibold"
              >
                View Holdings →
              </button>
            </div>
          </div>

          {/* Total Earnings / Returns */}
          <div className="rounded-2xl bg-forest-900 border border-stone-800 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-medium uppercase tracking-wider">Total Earnings</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-emerald-500">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
              +{formatUGX(totalEarnings)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
              <span>Cumulative Yield</span>
              <span className="text-emerald-500 font-medium">Verified Payouts</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="border-b border-stone-800">
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
                      : 'bg-forest-900 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800'
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
            <div className="rounded-3xl border border-stone-800 bg-forest-900 p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                    Active Investment Programs
                  </h2>
                  <p className="text-xs text-stone-400">
                    Your real-time operations, daily accrued returns, and milestone maturity schedules.
                  </p>
                </div>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-forest-500 hover:text-forest-400"
                >
                  <span>Explore New Programs</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              {investments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-800 bg-forest-950/50 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-900 text-forest-500">
                    <Sprout className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    No active agricultural holdings
                  </h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
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
                        className="flex flex-col rounded-2xl border border-stone-800 bg-forest-950/40 p-4 hover:border-forest-700 transition-all hover:bg-forest-900 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-stone-800">
                            <FarmImage
                              src={farm?.image_url || farmArtFor(farm?.name || farm?.category)}
                              alt={farm?.name || 'Investment'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-500">
                                {farm?.category || 'Agri Investment'}
                              </span>
                              <span className="rounded-full bg-forest-900 text-forest-400 px-2 py-0.5 text-[10px] font-bold">
                                {inv.status}
                              </span>
                            </div>
                            <h4 className="truncate font-display text-base font-bold text-white">
                              {farm?.name || 'Managed Farm Project'}
                            </h4>
                            <p className="text-[11px] text-stone-400 truncate">
                              Ref: {inv.reference}
                            </p>
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="grid grid-cols-4 gap-2 rounded-xl bg-forest-900 p-2.5 border border-stone-800 text-center">
                          <div>
                            <span className="text-[10px] text-stone-400 block">Principal</span>
                            <span className="font-semibold text-xs text-white">
                              {formatUGX(inv.amount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Daily Return</span>
                            <span className="font-semibold text-xs text-emerald-400">
                              +{formatUGX(inv.daily_return)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Accumulated</span>
                            <span className="font-semibold text-xs text-emerald-400">
                              +{formatUGX(inv.accumulated_return)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Claimable</span>
                            <span className="font-semibold text-xs text-gold-400">
                              {formatUGX(inv.claimable_return)}
                            </span>
                          </div>
                        </div>

                        {/* Claim Status & Lock Indicator */}
                        {platformSettingsError ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                            Unable to load the current withdrawal lock setting: {platformSettingsError}
                          </div>
                        ) : platformSettings ? (() => {
                          const lockEnabled = platformSettings?.withdrawal_lock_enabled ?? true
                          const lockDays = lockEnabled ? (platformSettings?.withdrawal_lock_days ?? 0) : 0
                          const returnUnlockDate = new Date(
                            new Date(inv.start_date || inv.created_at).getTime() + lockDays * 86400000
                          )
                          const returnsUnlocked = lockDays === 0 || returnUnlockDate <= new Date()
                          const daysUntilUnlock = Math.max(
                            1,
                            Math.ceil((returnUnlockDate.getTime() - Date.now()) / 86400000)
                          )

                          return (
                            <div className="space-y-2">
                              {!returnsUnlocked && (
                                <div className="flex items-center justify-between rounded-xl bg-amber-50/80 border border-amber-200/70 px-3 py-1.5 text-[11px] text-amber-900">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>Withdrawal Lock ({lockDays}d hold)</span>
                                  </span>
                                  <span className="font-semibold">
                                    Unlocks {formatDate(returnUnlockDate.toISOString())} ({daysUntilUnlock}d)
                                  </span>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvForTimeline(inv)}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white py-2 text-xs font-semibold text-forest-900 hover:bg-stone-50"
                                >
                                  <Clock className="h-3.5 w-3.5 text-forest-600" />
                                  <span>Lifecycle</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => claimInvestmentReturns(inv)}
                                  disabled={!returnsUnlocked || (inv.claimable_return ?? 0) <= 0 || claimBusyId === inv.id}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-forest-800 py-2 text-xs font-bold text-white hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Coins className="h-3.5 w-3.5 text-gold-400" />
                                  <span>
                                    {claimBusyId === inv.id
                                      ? 'Claiming…'
                                      : !returnsUnlocked
                                      ? 'Locked'
                                      : (inv.claimable_return ?? 0) > 0
                                      ? `Claim ${formatUGX(inv.claimable_return)}`
                                      : 'Claimed'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )
                        })() : (
                          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-600">
                            Loading the current withdrawal lock setting...
                          </div>
                        )}
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
                              <div>{t.reference}</div>
                              {((t.meta as any)?.phone || (t.meta as any)?.mobile_number) && (
                                <div className="text-[10px] text-emerald-600 font-mono">
                                  {String((t.meta as any)?.phone || (t.meta as any)?.mobile_number)}
                                </div>
                              )}
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
                  if (platformSettingsError || !platformSettings) {
                    return (
                      <div
                        key={inv.id}
                        className={`rounded-3xl border px-6 py-5 text-xs ${
                          platformSettingsError
                            ? 'border-red-200 bg-red-50 text-red-800'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}
                      >
                        {platformSettingsError
                          ? `Unable to load the current withdrawal lock setting: ${platformSettingsError}`
                          : 'Loading the current withdrawal lock setting...'}
                      </div>
                    )
                  }
                  const durationMonths = farm?.duration_months || 12
                  const returnPct = farm?.expected_return_pct || 14
                  const daysRemaining = formatRelativeDays(inv.maturity_date)
                  const lockDays = platformSettings.withdrawal_lock_enabled
                    ? platformSettings.withdrawal_lock_days
                    : 0
                  const returnUnlockDate = new Date(
                    new Date(inv.start_date || inv.created_at).getTime() + lockDays * 86400000
                  )
                  const returnsUnlocked = lockDays === 0 || returnUnlockDate <= new Date()
                  const daysUntilUnlock = Math.max(
                    1,
                    Math.ceil((returnUnlockDate.getTime() - Date.now()) / 86400000)
                  )

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
                            +{formatUGX(inv.accumulated_return)} accumulated return
                          </span>
                          <span className="block text-xs text-emerald-700 font-semibold">
                            +{formatUGX(inv.daily_return)} daily return
                          </span>
                          <span className="block text-xs text-ink-500">
                            {inv.earning_days ?? 0} days earned · {formatUGX(inv.claimable_return)} claimable
                          </span>
                          <span className="block text-xs text-ink-500">
                            Earning period: {daysRemaining}
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

                      {!returnsUnlocked && (
                        <div className="flex items-center justify-between rounded-xl bg-amber-50/80 border border-amber-200/70 px-4 py-2 text-xs text-amber-900">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>Withdrawal Lock Active ({lockDays} days holding period)</span>
                          </span>
                          <span className="font-semibold">
                            Unlocks {formatDate(returnUnlockDate.toISOString())} ({daysUntilUnlock}d remaining)
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => claimInvestmentReturns(inv)}
                        disabled={!returnsUnlocked || (inv.claimable_return ?? 0) <= 0 || claimBusyId === inv.id}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-forest-800/15 bg-white py-2 text-xs font-semibold text-forest-800 hover:bg-forest-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        <span>
                          {claimBusyId === inv.id
                            ? 'Claiming...'
                            : !returnsUnlocked
                            ? `Withdrawal Lock Active (Unlocks ${formatDate(returnUnlockDate.toISOString())})`
                            : (inv.claimable_return ?? 0) > 0
                            ? `Claim ${formatUGX(inv.claimable_return)} Daily Returns`
                            : 'All Daily Returns Claimed'}
                        </span>
                      </button>
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
              <div className="rounded-3xl border border-stone-800 bg-forest-900 p-7 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-stone-500">
                      Available Balance
                    </span>
                    <span className="rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-800/50">
                      Live Ledger · UGX
                    </span>
                  </div>
                  <div className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
                    {formatUGX(availableBalance)}
                  </div>
                  <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                    Direct balance sourced from your secure Supabase wallet account. Ready for farm investment allocations or withdrawal.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-stone-800">
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

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800/60 text-[11px]">
                    <div>
                      <span className="text-stone-500">Total Invested:</span>
                      <p className="font-bold text-white mt-0.5">{formatUGX(totalInvested)}</p>
                    </div>
                    <div>
                      <span className="text-stone-500">Total Returns:</span>
                      <p className="font-bold text-emerald-400 mt-0.5">+{formatUGX(totalEarnings)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit Bank Wire / Mobile Money Reference Information */}
              <div className="lg:col-span-2 rounded-3xl border border-stone-800 bg-forest-900 p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-forest-500" />
                    <h3 className="font-display text-base font-bold text-white">
                      Uganda Mobile Money Settlement Details
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-950/40 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-800/50">
                    Automated & Instant
                  </span>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Deposit funds directly using MTN Mobile Money or Airtel Money Uganda. Always provide your personal investor reference so the system matches your account balance.
                </p>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-xs border border-stone-200">
                  <div>
                    <span className="text-stone-400 font-medium">MTN MoMo Merchant</span>
                    <p className="font-bold text-white mt-0.5">Code: 984210</p>
                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">Dial *165*3#</p>
                  </div>
                  <div>
                    <span className="text-stone-400 font-medium">Airtel Money Pay</span>
                    <p className="font-bold text-white mt-0.5">Code: 771920</p>
                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">Dial *185*9#</p>
                  </div>
                  <div>
                    <span className="text-stone-400 font-medium">Personal Reference</span>
                    <p className="font-bold text-gold-400 font-mono mt-0.5">{profile?.username}-DEP</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Auto-credits wallet</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-800 p-4 bg-forest-950/40 flex items-center justify-between gap-4">
                  <div className="text-xs">
                    <span className="font-bold text-white block">Withdrawal Settlement Policy</span>
                    <span className="text-stone-400 text-[11px]">
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
                    className="shrink-0 rounded-xl border border-forest-800 text-forest-500 hover:bg-forest-800 hover:text-white px-3.5 py-1.5 text-xs font-bold transition-colors"
                  >
                    Request Payout
                  </button>
                </div>
              </div>
            </div>

            {/* Complete Transaction Table */}
            <div className="rounded-3xl border border-stone-800 bg-forest-900 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Transaction History
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  {txs.length} total records
                </span>
              </div>

              {txs.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">No transaction records found in your Supabase account.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-400 font-medium">
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Reference</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {txs.map((t) => (
                        <tr key={t.id} className="hover:bg-stone-900/50">
                          <td className="py-3.5 font-semibold text-white capitalize">
                            {t.type.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 text-stone-400">{formatDate(t.created_at)}</td>
                          <td className="py-3.5 font-mono text-[11px] text-stone-400">
                            <div>{t.reference}</div>
                            {((t.meta as any)?.phone || (t.meta as any)?.mobile_number) && (
                              <div className="text-[10px] text-emerald-400 font-mono">
                                {String((t.meta as any)?.phone || (t.meta as any)?.mobile_number)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 text-right font-display font-bold text-white">
                            {t.type === 'withdrawal' || t.type === 'investment' ? '-' : '+'}
                            {formatUGX(t.amount)}
                          </td>
                          <td className="py-3.5 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                t.status === 'approved' || t.status === 'completed'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                  : t.status === 'pending'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                                  : 'bg-red-950 text-red-300 border border-red-800/50'
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
            <div className="rounded-3xl border border-stone-800 bg-forest-900 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-900 text-forest-500 border border-stone-800">
                    <Users className="h-6 w-6 text-forest-500" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">
                      Investor Partner Network
                    </h2>
                    <p className="text-xs text-stone-400">
                      Earn bonus dividends by introducing investors to verified agricultural opportunities
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl bg-forest-950 px-4 py-2 border border-stone-800 self-start sm:self-auto">
                  <span className="text-xs text-stone-400 font-medium">Commission Rate:</span>
                  <span className="font-display text-lg font-bold text-gold-400">
                    {platformSettings?.referral_bonus_pct ?? 10}%
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                When a new investor registers using your referral code or direct link and funds an agricultural holding, you earn an automated{' '}
                <strong className="text-white font-bold">{platformSettings?.referral_bonus_pct ?? 10}% bonus</strong> credited directly to your wallet balance.
              </p>

              {/* Referral Code & Link Sharing Suite */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {/* Referral Code Card */}
                <div className="rounded-2xl border border-stone-800 bg-forest-950/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Your Referral Code
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">For signup forms</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-forest-900 border border-stone-800 px-4 py-2.5">
                    <span className="font-display text-2xl font-bold tracking-wider text-gold-400">
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
                <div className="rounded-2xl border border-stone-800 bg-forest-950/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Direct Referral Link
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Auto-applies code</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-forest-900 border border-stone-800 px-3 py-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="w-full bg-transparent text-xs text-stone-300 font-mono outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      id="btn-copy-referral-link"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 px-3 py-1.5 text-xs font-bold text-stone-200 transition-colors shrink-0"
                    >
                      {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prominent Direct Share Button */}
              <div className="rounded-2xl bg-forest-950 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-stone-800">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
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
                <div className="rounded-2xl bg-forest-900 p-4 border border-stone-800">
                  <span className="text-[11px] text-stone-400 font-medium block">
                    Total Referrals
                  </span>
                  <div className="font-display text-2xl font-bold text-white mt-1">
                    {referredUsers.length}
                  </div>
                  <span className="text-[10px] text-stone-500">Registered from your code</span>
                </div>

                <div className="rounded-2xl bg-forest-900 p-4 border border-stone-800">
                  <span className="text-[11px] text-stone-400 font-medium block">
                    Active / Depositing
                  </span>
                  <div className="font-display text-2xl font-bold text-forest-500 mt-1">
                    {activeReferralCount}
                  </div>
                  <span className="text-[10px] text-stone-500">Approved referral records</span>
                </div>

                <div className="rounded-2xl bg-forest-900 p-4 border border-stone-800">
                  <span className="text-[11px] text-stone-400 font-medium block">
                    Total Referral Earnings
                  </span>
                  <div className="font-display text-2xl font-bold text-emerald-400 mt-1">
                    {formatUGX(totalReferralEarnings)}
                  </div>
                  <span className="text-[10px] text-emerald-500 font-medium">Credited to wallet</span>
                </div>

                <div className="rounded-2xl bg-forest-900 p-4 border border-stone-800">
                  <span className="text-[11px] text-stone-400 font-medium block">
                    Pending Earnings
                  </span>
                  <div className="font-display text-2xl font-bold text-gold-400 mt-1">
                    {formatUGX(pendingReferralEarnings)}
                  </div>
                  <span className="text-[10px] text-stone-500">Awaiting approval</span>
                </div>
              </div>
            </div>

            {/* Referred Users Network Table */}
            <div className="rounded-3xl border border-stone-800 bg-forest-900 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Referred Network
                  </h3>
                  <p className="text-xs text-stone-400">
                    Investors registered with your referral credentials
                  </p>
                </div>
                <span className="rounded-full bg-stone-800 text-stone-300 text-xs px-2.5 py-0.5 font-medium">
                  {referredUsers.length} member{referredUsers.length === 1 ? '' : 's'}
                </span>
              </div>

              {referredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-800 p-8 text-center space-y-3">
                  <Users className="h-8 w-8 text-stone-600 mx-auto" />
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
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
                      <tr className="border-b border-stone-800 text-stone-400 font-medium">
                        <th className="pb-3">Investor</th>
                        <th className="pb-3">Username</th>
                        <th className="pb-3">Joined Date</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {referredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-stone-900/50">
                          <td className="py-3.5 font-semibold text-white">
                            {u.full_name || 'Agricultural Partner'}
                          </td>
                          <td className="py-3.5 font-mono text-stone-400">@{u.username}</td>
                          <td className="py-3.5 text-stone-400">{formatDate(u.created_at)}</td>
                          <td className="py-3.5 text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2.5 py-0.5 text-[10px] font-bold capitalize">
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
            <div className="rounded-3xl border border-stone-800 bg-forest-900 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Commission Dividends
                  </h3>
                  <p className="text-xs text-stone-400">
                    Direct commission credits earned from referred investor holdings
                  </p>
                </div>
                <span className="rounded-full bg-stone-800 text-stone-300 text-xs px-2.5 py-0.5 font-medium">
                  {referralBonusTransactions.length} payout{referralBonusTransactions.length === 1 ? '' : 's'}
                </span>
              </div>

              {referralBonusTransactions.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  No commission dividends recorded yet. Bonus payouts will appear here automatically when referred investors fund projects.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-400 font-medium">
                        <th className="pb-3">Reference</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {referralBonusTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-stone-900/50">
                            <td className="py-3.5 font-mono text-[11px] text-white font-bold">
                              {t.reference}
                            </td>
                            <td className="py-3.5 text-stone-400">{formatDate(t.created_at)}</td>
                            <td className="py-3.5 text-right font-display font-bold text-emerald-400">
                              +{formatUGX(t.amount)}
                            </td>
                            <td className="py-3.5 text-right">
                              <span className="inline-flex items-center rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2.5 py-0.5 text-[10px] font-bold capitalize">
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
            <div className="rounded-3xl border border-stone-800 bg-forest-900 p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-800 text-white font-display text-2xl font-bold">
                  {(profile?.full_name || profile?.username || 'I')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    {profile?.full_name || profile?.username}
                  </h2>
                  <p className="text-xs text-stone-400">@{profile?.username} · Verified Account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-800">
                <div className="rounded-xl bg-forest-950/40 p-3.5 border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Full Name</span>
                  <p className="font-semibold text-sm text-white mt-0.5">
                    {profile?.full_name || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-forest-950/40 p-3.5 border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Phone Contact</span>
                  <p className="font-semibold text-sm text-white mt-0.5">
                    {profile?.phone || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-forest-950/40 p-3.5 border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Role / Status</span>
                  <p className="font-semibold text-sm text-white mt-0.5 capitalize">
                    {profile?.role || 'Investor'}
                  </p>
                </div>
                <div className="rounded-xl bg-forest-950/40 p-3.5 border border-stone-800">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Registered Since</span>
                  <p className="font-semibold text-sm text-white mt-0.5">
                    {formatDate(profile?.created_at)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                <span className="text-xs text-stone-400">End your current session safely</span>
                <button
                  id="btn-signout-settings"
                  type="button"
                  onClick={signOut}
                  className="rounded-xl bg-red-950/40 text-red-300 px-4 py-2 text-xs font-bold hover:bg-red-900/60 transition-colors border border-red-800/50"
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
            className="w-full max-w-md rounded-3xl bg-forest-900 p-6 sm:p-7 shadow-2xl border border-stone-800 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-800 text-gold-400">
                  {modal === 'deposit' ? <Plus className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <h3 className="font-display text-xl font-bold text-white capitalize">
                  {modal === 'deposit' ? 'Deposit Funds' : 'Request Withdrawal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full p-1 text-stone-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed mb-4">
              {modal === 'deposit'
                ? `Initiate a secure deposit via Uganda Mobile Money. Minimum deposit: ${formatUGX(
                    platformSettings?.min_deposit ?? 10000
                  )}. After submitting, approve the prompt on your handset.`
                : `Enter the amount to withdraw to your registered MTN or Airtel Mobile Money wallet. Minimum withdrawal: ${formatUGX(
                    platformSettings?.min_withdrawal ?? 10000
                  )}. Available balance: ${formatUGX(withdrawableBalance)}.`}
            </p>

            {modal === 'withdraw' && (
              <div
                className="rounded-2xl border border-stone-800 bg-forest-950/40 p-4 mb-4 text-xs space-y-1.5 text-white"
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 shrink-0 text-forest-500" />
                    <span>Withdrawal Status</span>
                  </div>
                  <span
                    className="rounded-full bg-emerald-950/40 text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-800/50"
                  >
                    Available
                  </span>
                </div>

                <p className="text-[11px] text-stone-400">Withdrawals are available subject to your wallet balance.</p>

                <div className="pt-1.5 flex items-center justify-between text-[11px] font-semibold border-t border-stone-800/60">
                  <span className="text-stone-400">Minimum withdrawal:</span>
                  <span className="font-mono text-gold-400 font-bold">
                    {formatUGX(platformSettings?.min_withdrawal ?? 10000)}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={submitWalletOp} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                  Select Mobile Money Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('mtn')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition-all ${
                      paymentProvider === 'mtn'
                        ? 'border-amber-400 bg-amber-950/40 text-amber-300 shadow-xs ring-1 ring-amber-400'
                        : 'border-stone-700 bg-forest-900 text-stone-300 hover:bg-stone-800'
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
                        ? 'border-red-400 bg-red-950/40 text-red-300 shadow-xs ring-1 ring-red-400'
                        : 'border-stone-700 bg-forest-900 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-red-500 border border-red-600 shrink-0" />
                    <span>Airtel Money</span>
                  </button>
                </div>
              </div>

              {/* Phone contact */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                  Registered Mobile Money Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +256 772 123456"
                    value={phoneContact}
                    onChange={(e) => setPhoneContact(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-forest-900 py-2.5 pl-10 pr-4 text-xs font-medium text-white focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-400">
                  This phone number is added to your transaction record so the admin can verify your deposit.
                </p>
              </div>

              {modal === 'deposit' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                    Mobile Money Transaction ID / Carrier Ref (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 19827364501 or leave blank to auto-generate"
                    value={depositTxRef}
                    onChange={(e) => setDepositTxRef(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-forest-900 py-2.5 px-3.5 text-xs font-medium text-white focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Amount (UGX)
                  </label>
                  {modal === 'withdraw' && (
                    <span className="text-[11px] text-stone-400">
                      Max: {formatUGX(withdrawableBalance)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gold-400">
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
                    className="w-full rounded-xl border border-stone-700 bg-forest-900 py-3 pl-14 pr-4 font-display text-lg font-bold text-white focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:bg-stone-800 disabled:text-stone-400"
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
                    disabled={modal === 'withdraw' && preset > withdrawableBalance}
                    onClick={() => setAmount(String(preset))}
                    className="rounded-lg border border-stone-700 bg-forest-900 px-2.5 py-1 text-[11px] font-semibold text-stone-200 hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {formatUGX(preset)}
                  </button>
                ))}
              </div>

              {modal === 'deposit' && (
                <div className="rounded-xl bg-forest-950/40 border border-stone-800 p-3 text-[11px] text-stone-300 space-y-1">
                  <div className="flex justify-between font-semibold text-white">
                    <span>Merchant Pay Code:</span>
                    <span className="font-mono font-bold">
                      {paymentProvider === 'mtn' ? '984210 (MTN)' : '771920 (Airtel)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Payment Reference:</span>
                    <span className="font-mono font-bold text-gold-400">{profile?.username}-DEP</span>
                  </div>
                </div>
              )}

              {err && (
                <div className="rounded-xl bg-red-950/40 border border-red-800/50 p-3 text-xs font-semibold text-red-300">
                  {err}
                </div>
              )}

              {msg && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/50 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{msg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex-1 rounded-xl border border-stone-700 py-2.5 text-xs font-bold text-stone-300 hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-funds"
                  type="submit"
                  disabled={
                    busy ||
                    !amount ||
                    (modal === 'withdraw' && withdrawableBalance <= 0)
                  }
                  className="flex-1 rounded-xl bg-forest-800 py-2.5 text-xs font-bold text-white hover:bg-forest-700 disabled:opacity-50"
                >
                  {busy
                    ? 'Processing...'
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
            className="w-full max-w-2xl rounded-3xl bg-forest-900 p-6 sm:p-7 shadow-2xl border border-stone-800 animate-fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-white">
                Investment Contract Lifecycle
              </h3>
              <button
                type="button"
                onClick={() => setSelectedInvForTimeline(null)}
                className="rounded-full p-1 text-stone-400 hover:text-white"
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
            className="w-full max-w-md rounded-3xl bg-forest-900 p-6 shadow-2xl border border-stone-800 animate-fade-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-referral-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="share-referral-title" className="font-display text-xl font-bold text-white">
                  Share your referral link
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-400">
                  Choose an app to invite someone to Feldwert Capital.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareMenuOpen(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
                aria-label="Close share options"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleShareTarget('whatsapp')}
                className="flex items-center gap-3 rounded-2xl border border-stone-800 p-3 text-left transition-colors hover:border-emerald-700 hover:bg-emerald-950/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-white">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTarget('telegram')}
                className="flex items-center gap-3 rounded-2xl border border-stone-800 p-3 text-left transition-colors hover:border-sky-700 hover:bg-sky-950/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-950/40 text-sky-400">
                  <Send className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-white">Telegram</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTarget('sms')}
                className="flex items-center gap-3 rounded-2xl border border-stone-800 p-3 text-left transition-colors hover:border-amber-700 hover:bg-amber-950/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/40 text-amber-400">
                  <Smartphone className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-white">Messages</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareTarget('email')}
                className="flex items-center gap-3 rounded-2xl border border-stone-800 p-3 text-left transition-colors hover:border-rose-700 hover:bg-rose-950/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/40 text-rose-400">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-white">Email</span>
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  handleCopyLink()
                  setShareMenuOpen(false)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-700 px-4 py-2.5 text-xs font-bold text-stone-200 transition-colors hover:bg-stone-800"
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
