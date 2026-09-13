import { useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Coins,
  DollarSign,
  Info,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'
import type { FarmProject, Wallet } from '../lib/types'
import { formatUGX, formatDate } from '../lib/format'
import FarmImage from './FarmImage'
import { farmArtFor } from '../lib/farmArt'
import InvestmentScheduleTimeline from './InvestmentScheduleTimeline'

interface InvestmentDetailModalProps {
  project: FarmProject | null
  wallet: Wallet | null
  isOpen: boolean
  onClose: () => void
  onConfirmInvest: (projectId: string, amount: number) => Promise<boolean>
  onGoToDeposit?: () => void
}

export default function InvestmentDetailModal({
  project,
  wallet,
  isOpen,
  onClose,
  onConfirmInvest,
  onGoToDeposit,
}: InvestmentDetailModalProps) {
  if (!isOpen || !project) return null

  const minAmt = project.min_amount || 100
  const maxAmt = project.max_amount || 10000

  const [investAmount, setInvestAmount] = useState<number>(minAmt)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Calculations from backend parameters
  const returnPct = project.expected_return_pct || 14
  const durationMonths = project.duration_months || 12
  const calcTotalReturn = Math.round(((investAmount * returnPct) / 100) * 100) / 100
  const calcTotalPayout = investAmount + calcTotalReturn
  const calcDailyReturn =
    durationMonths > 0
      ? Math.round((calcTotalReturn / (durationMonths * 30)) * 100) / 100
      : 0
  const calcMonthlyReturn =
    durationMonths > 0
      ? Math.round((calcTotalReturn / durationMonths) * 100) / 100
      : 0
  const dailyRatePct = durationMonths > 0 ? (returnPct / (durationMonths * 30)).toFixed(2) : '0.00'

  const startDate = new Date().toISOString()
  const completionDate = new Date(
    new Date().setMonth(new Date().getMonth() + durationMonths)
  ).toISOString()

  const availableBalance = wallet?.balance ?? 0
  const hasSufficientFunds = availableBalance >= investAmount

  const fundedPct =
    project.target_amount > 0
      ? Math.min(100, Math.round((project.funded_amount / project.target_amount) * 100))
      : 0

  const handleInvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (investAmount < minAmt) {
      setErrorMsg(`Minimum investment is ${formatUGX(minAmt)}`)
      return
    }
    if (investAmount > maxAmt) {
      setErrorMsg(`Maximum investment is ${formatUGX(maxAmt)}`)
      return
    }
    if (!hasSufficientFunds) {
      setErrorMsg(
        `Insufficient wallet balance. You have ${formatUGX(
          availableBalance
        )}, but need ${formatUGX(investAmount)}.`
      )
      return
    }

    setSubmitting(true)
    try {
      const ok = await onConfirmInvest(project.id, investAmount)
      if (ok) {
        setSuccessMsg(
          `Investment of ${formatUGX(investAmount)} in ${project.name} successfully booked!`
        )
        setTimeout(() => {
          onClose()
        }, 1800)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Investment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      id="investment-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest-950/70 backdrop-blur-sm overflow-y-auto animate-fade"
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar with Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            id="btn-close-detail-modal"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Large Category Banner Image */}
          <div className="relative h-64 sm:h-72 w-full bg-stone-900">
            <FarmImage
              src={project.image_url || farmArtFor(project.name || project.category)}
              alt={project.name}
              className="h-full w-full object-cover"
              eager
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-800/90 px-3 py-1 text-xs font-semibold text-gold-300 border border-gold-500/30 backdrop-blur-md">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
                  <span>{project.category} Program</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-stone-100 backdrop-blur-md">
                  <MapPin className="h-3 w-3 text-gold-400" />
                  {project.location}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-semibold">
                  Status: {project.status}
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {project.name}
              </h2>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* Description & High-Level Highlights */}
            <div>
              <p className="text-sm sm:text-base text-ink-600 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Current Program Funding Progress */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Current Funding Progress
                </span>
                <span className="text-sm font-bold text-forest-900">
                  {formatUGX(project.funded_amount)} / {formatUGX(project.target_amount)} ({fundedPct}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-forest-600 to-forest-500 transition-all duration-700"
                  style={{ width: `${fundedPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                <span>Program Min: {formatUGX(project.min_amount)}</span>
                <span>
                  Program Max: {project.max_amount ? formatUGX(project.max_amount) : 'Flexible'}
                </span>
              </div>
            </div>

            {/* Dynamic Investment Amount Calculator */}
            <div className="rounded-2xl border-2 border-forest-800/15 bg-forest-50/40 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-forest-950">
                    Configure Investment Amount
                  </h3>
                  <p className="text-xs text-ink-500">
                    Set your desired capital allocation to simulate real-time projected returns.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-ink-500">Your Wallet Balance:</span>
                  <div className="font-semibold text-forest-900 text-sm flex items-center gap-1 justify-end">
                    <WalletIcon className="h-3.5 w-3.5 text-forest-700" />
                    {formatUGX(availableBalance)}
                  </div>
                </div>
              </div>

              {/* Amount Input with Quick Presets */}
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-900 font-bold text-xs">
                    UGX
                  </span>
                  <input
                    id="input-invest-amount"
                    type="number"
                    min={minAmt}
                    max={maxAmt}
                    step={10000}
                    value={investAmount || ''}
                    onChange={(e) => setInvestAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-14 pr-4 font-display text-xl font-bold text-forest-950 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[minAmt, minAmt * 2, 500000, 1000000, maxAmt].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInvestAmount(preset)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        investAmount === preset
                          ? 'bg-forest-800 text-white'
                          : 'bg-white border border-stone-200 text-forest-900 hover:bg-forest-50'
                      }`}
                    >
                      {formatUGX(preset)}
                    </button>
                  ))}
                  {availableBalance > 0 && availableBalance <= maxAmt && (
                    <button
                      type="button"
                      onClick={() => setInvestAmount(Math.max(minAmt, availableBalance))}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-gold-100 text-gold-800 border border-gold-300 hover:bg-gold-200"
                    >
                      Max Available ({formatUGX(availableBalance)})
                    </button>
                  )}
                </div>
              </div>

              {/* Financial Returns Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-forest-900/10">
                <div className="rounded-xl bg-white p-3 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-ink-500 block">Daily Return</span>
                  <span className="font-display text-base font-bold text-forest-900 block mt-0.5">
                    +{formatUGX(calcDailyReturn)}
                  </span>
                  <span className="text-[10px] text-forest-600 block">~{dailyRatePct}% / day</span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-ink-500 block">Monthly Yield</span>
                  <span className="font-display text-base font-bold text-forest-900 block mt-0.5">
                    +{formatUGX(calcMonthlyReturn)}
                  </span>
                  <span className="text-[10px] text-ink-500 block">per 30-day cycle</span>
                </div>

                <div className="rounded-xl bg-white p-3 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-ink-500 block">Total Profit ROI</span>
                  <span className="font-display text-base font-bold text-emerald-700 block mt-0.5">
                    +{formatUGX(calcTotalReturn)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">+{returnPct}% Expected</span>
                </div>

                <div className="rounded-xl bg-forest-900 text-white p-3 border border-forest-800">
                  <span className="text-[10px] font-bold uppercase text-forest-300 block">Total Payout</span>
                  <span className="font-display text-base font-bold text-gold-400 block mt-0.5">
                    {formatUGX(calcTotalPayout)}
                  </span>
                  <span className="text-[10px] text-forest-200 block">Capital + Yield</span>
                </div>
              </div>
            </div>

            {/* Investment Schedule Timeline */}
            <InvestmentScheduleTimeline
              amount={investAmount}
              durationMonths={durationMonths}
              returnPct={returnPct}
              dailyReturn={calcDailyReturn}
              totalReturn={calcTotalReturn}
              startDate={startDate}
              completionDate={completionDate}
            />

            {/* Error or Success feedback banners */}
            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMsg}</p>
                  {!hasSufficientFunds && onGoToDeposit && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onGoToDeposit()
                      }}
                      className="mt-2 text-xs font-bold text-red-800 underline hover:text-red-950"
                    >
                      Deposit funds to your wallet now →
                    </button>
                  )}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <p className="font-semibold">{successMsg}</p>
              </div>
            )}

            {/* Trust and Risk Mitigation Note */}
            <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-4 text-xs text-ink-600 border border-stone-200">
              <ShieldCheck className="h-4 w-4 text-forest-700 shrink-0 mt-0.5" />
              <p>
                Operated under German agricultural standards with certified animal welfare and
                biosecurity compliance. Projected returns and timelines are contractual and
                managed by Feldwert Capital GmbH.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer / Invest Action */}
        <div className="sticky bottom-0 z-20 border-t border-stone-200 bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div>
            <span className="text-xs text-ink-500 block">Total Capital Commitment</span>
            <div className="font-display text-xl font-bold text-forest-950">
              {formatUGX(investAmount)}{' '}
              <span className="text-xs font-normal text-ink-500">
                (Payout: {formatUGX(calcTotalPayout)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-stone-50"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-investment"
              type="button"
              disabled={submitting || investAmount < minAmt || investAmount > maxAmt}
              onClick={handleInvestSubmit}
              className="inline-flex items-center justify-center rounded-xl bg-forest-800 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>Processing...</span>
              ) : (
                <span>Confirm & Invest {formatUGX(investAmount)}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
