import { useState, useEffect } from 'react'
import {
  Check,
  AlertCircle,
  Lock,
  Percent,
  Coins,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react'
import { getPlatformSettings, savePlatformSetting, saveMultiplePlatformSettings } from '../lib/settings'
import type { PlatformSettings } from '../lib/types'
import { formatUGX } from '../lib/format'

const LOCK_PRESETS = [
  { label: 'No Lock', days: 0 },
  { label: '1 Day', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
]

const REF_PRESETS = [10, 15, 20, 25]
const MIN_WITHDRAWAL_PRESETS = [5000, 10000, 20000, 50000]

export default function AdminPlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Local draft edit states
  const [minWithdrawalInput, setMinWithdrawalInput] = useState<string>('')
  const [withdrawalLockDays, setWithdrawalLockDays] = useState<number>(7)
  const [isCustomDays, setIsCustomDays] = useState(false)
  const [customDaysInput, setCustomDaysInput] = useState<string>('')
  const [referralPctInput, setReferralPctInput] = useState<string>('')

  // Section busy states
  const [savingMinWithdrawal, setSavingMinWithdrawal] = useState(false)
  const [savingWithdrawalLock, setSavingWithdrawalLock] = useState(false)
  const [savingReferralPct, setSavingReferralPct] = useState(false)

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    section: 'min_withdrawal' | 'withdrawal_lock' | 'referral' | 'global'
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await getPlatformSettings()
      setSettings(data)
      setMinWithdrawalInput(String(data.min_withdrawal))
      setReferralPctInput(String(data.referral_bonus_pct))

      const days = data.withdrawal_lock_enabled ? data.withdrawal_lock_days : 0
      setWithdrawalLockDays(days)
      const matchingPreset = LOCK_PRESETS.find((p) => p.days === days)
      if (matchingPreset) {
        setIsCustomDays(false)
        setCustomDaysInput('')
      } else {
        setIsCustomDays(true)
        setCustomDaysInput(String(days))
      }
    } catch (err: any) {
      setFeedback({
        section: 'global',
        type: 'error',
        text: err?.message || 'Failed to load platform settings from database.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  // Auto-dismiss feedback after 4.5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // ================= SAVE HANDLERS =================

  const handleSaveMinWithdrawal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const amt = parseInt(minWithdrawalInput, 10)

    if (isNaN(amt) || amt <= 0) {
      setFeedback({
        section: 'min_withdrawal',
        type: 'error',
        text: 'Minimum withdrawal must be a valid positive UGX amount (greater than 0).',
      })
      return
    }

    setSavingMinWithdrawal(true)
    setFeedback(null)
    try {
      const res = await savePlatformSetting('min_withdrawal', amt)
      if (!res.success) throw new Error(res.error)

      setSettings((prev) => (prev ? { ...prev, min_withdrawal: amt } : null))
      setFeedback({
        section: 'min_withdrawal',
        type: 'success',
        text: `Minimum withdrawal successfully updated to ${formatUGX(amt)} in Supabase.`,
      })
    } catch (err: any) {
      setFeedback({
        section: 'min_withdrawal',
        type: 'error',
        text: err?.message || 'Failed to save minimum withdrawal setting.',
      })
    } finally {
      setSavingMinWithdrawal(false)
    }
  }

  const handleSaveWithdrawalLock = async (daysToSave?: number) => {
    let days = typeof daysToSave === 'number' ? daysToSave : withdrawalLockDays
    if (isCustomDays && typeof daysToSave !== 'number') {
      const parsed = parseInt(customDaysInput, 10)
      if (isNaN(parsed) || parsed < 0) {
        setFeedback({
          section: 'withdrawal_lock',
          type: 'error',
          text: 'Lock duration must be a valid non-negative number of days.',
        })
        return
      }
      days = parsed
    }

    if (days < 0) {
      setFeedback({
        section: 'withdrawal_lock',
        type: 'error',
        text: 'Withdrawal lock cannot be negative.',
      })
      return
    }

    setSavingWithdrawalLock(true)
    setFeedback(null)
    try {
      const lockEnabled = days > 0
      const res = await saveMultiplePlatformSettings({
        withdrawal_lock_days: days,
        withdrawal_lock_enabled: lockEnabled,
      })
      if (!res.success) throw new Error(res.error)

      setSettings((prev) =>
        prev
          ? {
              ...prev,
              withdrawal_lock_days: days,
              withdrawal_lock_enabled: lockEnabled,
            }
          : null
      )
      setWithdrawalLockDays(days)

      setFeedback({
        section: 'withdrawal_lock',
        type: 'success',
        text:
          days === 0
            ? 'Withdrawal lock disabled ("No Lock"). Users can now withdraw immediately subject to balance rules.'
            : `Withdrawal lock updated to ${days} Day${days === 1 ? '' : 's'} in Supabase database.`,
      })
    } catch (err: any) {
      setFeedback({
        section: 'withdrawal_lock',
        type: 'error',
        text: err?.message || 'Failed to save withdrawal lock setting.',
      })
    } finally {
      setSavingWithdrawalLock(false)
    }
  }

  const handleSaveReferralPct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const pct = parseFloat(referralPctInput)

    if (isNaN(pct) || pct < 0 || pct > 100) {
      setFeedback({
        section: 'referral',
        type: 'error',
        text: 'Referral commission must be a valid percentage between 0% and 100%.',
      })
      return
    }

    setSavingReferralPct(true)
    setFeedback(null)
    try {
      const res = await savePlatformSetting('referral_bonus_pct', pct)
      if (!res.success) throw new Error(res.error)

      setSettings((prev) => (prev ? { ...prev, referral_bonus_pct: pct } : null))
      setFeedback({
        section: 'referral',
        type: 'success',
        text: `Referral commission rate successfully updated to ${pct}% in Supabase.`,
      })
    } catch (err: any) {
      setFeedback({
        section: 'referral',
        type: 'error',
        text: err?.message || 'Failed to save referral commission rate.',
      })
    } finally {
      setSavingReferralPct(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-stone-400 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        <p className="text-xs">Loading platform settings from Supabase database...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Database className="h-4 w-4" />
            </span>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Platform Settings
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Centrally configure financial thresholds, withdrawal hold periods, and referral percentages. Changes are stored in Supabase and enforced platform-wide.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Database Source of Truth</span>
          </span>
          <button
            type="button"
            onClick={async () => {
              setSyncing(true)
              await loadSettings()
              setSyncing(false)
            }}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-stone-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {feedback?.section === 'global' && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-500/40'
              : 'bg-red-950/60 text-red-200 border border-red-500/40'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ================= GROUP 1: WITHDRAWAL SETTINGS ================= */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-800 text-gold-400 border border-gold-400/20">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">
                Withdrawal Settings
              </h3>
              <p className="text-xs text-stone-400">
                Control user payout minimums and anti-fraud capital lock periods.
              </p>
            </div>
          </div>
        </div>

        {/* SETTING 1: Minimum Withdrawal */}
        <div className="rounded-2xl bg-black/25 border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Minimum Withdrawal Amount</h4>
                <span className="rounded-full bg-forest-700/60 border border-forest-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  Active: {formatUGX(settings?.min_withdrawal ?? 10000)}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                The lowest amount a verified user can withdraw in a single mobile money transaction.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveMinWithdrawal} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  UGX
                </span>
                <input
                  id="admin-input-min-withdrawal"
                  type="number"
                  min={1}
                  step={1000}
                  value={minWithdrawalInput}
                  onChange={(e) => setMinWithdrawalInput(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-14 pr-4 font-mono text-sm font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                id="btn-save-min-withdrawal"
                type="submit"
                disabled={savingMinWithdrawal || minWithdrawalInput === String(settings?.min_withdrawal)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 py-2.5 px-5 text-xs font-bold text-white shadow-sm transition-all"
              >
                {savingMinWithdrawal ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Amount</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-stone-400 font-medium">Quick Presets:</span>
              {MIN_WITHDRAWAL_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setMinWithdrawalInput(String(amt))
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    minWithdrawalInput === String(amt)
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-stone-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {formatUGX(amt)}
                </button>
              ))}
            </div>
          </form>

          {feedback?.section === 'min_withdrawal' && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-950/70 text-red-300 border border-red-500/40'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>

        {/* SETTING 2: Withdrawal Lock */}
        <div className="rounded-2xl bg-black/25 border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Withdrawal Lock Duration</h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    settings?.withdrawal_lock_enabled && (settings?.withdrawal_lock_days ?? 0) > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {settings?.withdrawal_lock_enabled && (settings?.withdrawal_lock_days ?? 0) > 0
                    ? `${settings.withdrawal_lock_days} Days Active`
                    : 'No Lock (Immediate)'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Holding period before new capital or newly registered user balances can be withdrawn.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Standard Preset Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {LOCK_PRESETS.map((preset) => {
                const isSelected = !isCustomDays && withdrawalLockDays === preset.days
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => {
                      setIsCustomDays(false)
                      setWithdrawalLockDays(preset.days)
                      setCustomDaysInput('')
                      // Direct quick save on preset click
                      handleSaveWithdrawalLock(preset.days)
                    }}
                    disabled={savingWithdrawalLock}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-400'
                        : 'bg-white/5 text-stone-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">
                      {preset.days === 0 ? 'Immediate' : `${preset.days}d period`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Custom Days Input Option */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-custom-lock"
                  checked={isCustomDays}
                  onChange={(e) => {
                    setIsCustomDays(e.target.checked)
                    if (e.target.checked) {
                      setCustomDaysInput(String(withdrawalLockDays || 7))
                    }
                  }}
                  className="rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label htmlFor="chk-custom-lock" className="text-xs text-stone-300 font-medium">
                  Custom number of days:
                </label>
              </div>

              {isCustomDays && (
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="admin-input-custom-days"
                      type="number"
                      min={0}
                      step={1}
                      value={customDaysInput}
                      onChange={(e) => setCustomDaysInput(e.target.value)}
                      placeholder="e.g. 21"
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-2 px-3 text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                      Days
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveWithdrawalLock()}
                    disabled={savingWithdrawalLock}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white"
                  >
                    Apply Custom
                  </button>
                </div>
              )}
            </div>
          </div>

          {feedback?.section === 'withdrawal_lock' && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-950/70 text-red-300 border border-red-500/40'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= GROUP 2: REFERRAL SETTINGS ================= */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400 border border-gold-400/30">
              <Percent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">
                Referral & Commission Settings
              </h3>
              <p className="text-xs text-stone-400">
                Define the dividend percentage awarded to investors introducing verified capital.
              </p>
            </div>
          </div>
        </div>

        {/* SETTING 3: Referral Commission Percentage */}
        <div className="rounded-2xl bg-black/25 border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Referral Bonus Percentage</h4>
                <span className="rounded-full bg-gold-500/20 border border-gold-500/30 px-2 py-0.5 text-[10px] font-mono text-gold-300 font-bold">
                  Active: {settings?.referral_bonus_pct ?? 10.0}%
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Referrers receive this percentage of each approved deposit made by a referred user. For example, 10% of a UGX 100,000 approved deposit is UGX 10,000.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveReferralPct} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  id="admin-input-referral-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={referralPctInput}
                  onChange={(e) => setReferralPctInput(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-4 pr-10 font-mono text-sm font-bold text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gold-400">
                  %
                </span>
              </div>

              <button
                id="btn-save-referral-pct"
                type="submit"
                disabled={savingReferralPct || referralPctInput === String(settings?.referral_bonus_pct)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gold-600 hover:bg-gold-500 disabled:opacity-40 disabled:hover:bg-gold-600 py-2.5 px-5 text-xs font-bold text-white shadow-sm transition-all"
              >
                {savingReferralPct ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Rate</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-stone-400 font-medium">Standard Rates:</span>
              {REF_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setReferralPctInput(String(pct))}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    referralPctInput === String(pct)
                      ? 'bg-gold-500/30 text-gold-200 border border-gold-500/50'
                      : 'bg-white/5 text-stone-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </form>

          {feedback?.section === 'referral' && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-950/70 text-red-300 border border-red-500/40'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
