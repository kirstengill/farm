import { ArrowRight, Calendar, CheckCircle2, Clock, Coins, DollarSign, TrendingUp } from 'lucide-react'
import { formatUGX, formatDate } from '../lib/format'
import { calculateInvestmentDailyReturn } from '../lib/investmentReturns'

interface TimelineProps {
  amount: number
  durationMonths: number
  returnPct: number
  dailyReturn?: number
  totalReturn?: number
  startDate?: string | null
  completionDate?: string | null
  compact?: boolean
  className?: string
}

export default function InvestmentScheduleTimeline({
  amount,
  durationMonths,
  returnPct,
  dailyReturn,
  totalReturn,
  startDate,
  completionDate,
  compact = false,
  className = '',
}: TimelineProps) {
  const durationDays = Math.max(1, durationMonths) * 30
  const calcDailyReturn = dailyReturn ?? calculateInvestmentDailyReturn(amount)
  const calcTotalReturn =
    totalReturn ?? Math.round(calcDailyReturn * durationDays * 100) / 100

  const sDate = startDate ? new Date(startDate) : new Date()
  const cDate = completionDate
    ? new Date(completionDate)
    : new Date(new Date().setMonth(new Date().getMonth() + durationMonths))

  const dailyRatePct = durationMonths > 0 ? (returnPct / (durationMonths * 30)).toFixed(2) : '0.00'

  if (compact) {
    return (
      <div className={`rounded-xl border border-forest-900/10 bg-forest-950/40 p-3.5 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-stone-200 mb-2.5">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-forest-500" />
            Investment Schedule
          </span>
          <span className="text-forest-400 font-medium">{durationDays} Days Duration</span>
        </div>

        {/* Compact Horizontal Flow */}
        <div className="grid grid-cols-5 gap-1 items-center text-center">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">Principal</span>
            <span className="text-xs font-bold text-white mt-0.5">{formatUGX(amount)}</span>
          </div>

          <div className="flex justify-center text-forest-500">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">Period</span>
            <span className="text-xs font-bold text-stone-200 mt-0.5">{durationDays} Days</span>
          </div>

          <div className="flex justify-center text-forest-500">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-gold-500 font-medium">Net Return</span>
            <span className="text-xs font-bold text-white mt-0.5">+{formatUGX(calcTotalReturn)}</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <span>Est. Daily: <strong className="text-stone-200">{formatUGX(calcDailyReturn)}</strong> ({dailyRatePct}%/d)</span>
          <span>ROI: <strong className="text-emerald-500 font-bold">+{returnPct}%</strong></span>
        </div>
      </div>
    )
  }

  const steps = [
    {
      label: 'Investment Amount',
      value: formatUGX(amount),
      sub: 'Allocated Capital',
      icon: DollarSign,
      color: 'bg-forest-900 text-stone-200 border-stone-700',
    },
    {
      label: 'Investment Period',
      value: `${durationDays} Days`,
      sub: `Started ${formatDate(sDate.toISOString())}`,
      icon: Calendar,
      color: 'bg-forest-900 text-stone-200 border-stone-700',
    },
    {
      label: 'Daily Return',
      value: `+${formatUGX(calcDailyReturn)}`,
      sub: `~${dailyRatePct}% yield per day`,
      icon: Coins,
      color: 'bg-gold-900/40 text-gold-300 border-gold-700',
    },
    {
      label: 'Total Expected Return',
      value: `+${formatUGX(calcTotalReturn)}`,
      sub: `Total ROI: +${returnPct}%`,
      icon: TrendingUp,
      color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    },
    {
      label: 'Completion Date',
      value: formatDate(cDate.toISOString()),
      sub: 'Principal + Profit Payout',
      icon: CheckCircle2,
      color: 'bg-forest-800 text-white border-forest-700',
    },
  ]

  return (
    <div className={`rounded-2xl border border-stone-800 bg-forest-900 p-5 sm:p-6 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h4 className="font-display text-base sm:text-lg font-bold text-white">
            Investment Schedule & Lifecycle
          </h4>
          <p className="text-xs text-stone-400 mt-0.5">
            Clear, transparent milestone flow from capital allocation to maturity payout.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-forest-950 px-3 py-1 text-xs font-semibold text-stone-300 border border-stone-800">
          <Clock className="h-3.5 w-3.5 text-forest-500" />
          {durationDays} Days Program
        </span>
      </div>

      {/* Desktop / Tablet Timeline Flow */}
      <div className="relative hidden md:grid grid-cols-5 gap-3">
        {/* Continuous Connecting Line */}
        <div className="absolute top-6 left-10 right-10 h-0.5 bg-gradient-to-r from-forest-500 via-gold-500 to-forest-700 z-0" />

        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 shadow-xs transition-transform hover:scale-105 ${step.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="mt-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                {step.label}
              </span>
              <span className="mt-1 font-display text-sm sm:text-base font-bold text-white">
                {step.value}
              </span>
              <span className="mt-0.5 text-[11px] text-stone-400 font-medium">
                {step.sub}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile Vertical Timeline Flow */}
      <div className="md:hidden space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isLast = idx === steps.length - 1
          return (
            <div key={idx} className="flex items-start gap-3 relative">
              {!isLast && (
                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-stone-800" />
              )}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 shadow-xs z-10 ${step.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    {step.label}
                  </span>
                  <span className="font-display text-sm font-bold text-white">
                    {step.value}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{step.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Financial Summary Highlight Banner */}
      <div className="mt-6 rounded-xl bg-forest-950 text-white p-4 flex flex-wrap items-center justify-between gap-3 border border-stone-800">
        <div>
          <span className="text-xs text-stone-400">Total Projected Payout at Maturity</span>
          <div className="font-display text-xl sm:text-2xl font-bold text-gold-400">
            {formatUGX(amount + calcTotalReturn)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-stone-400">Net Expected Profit</span>
          <div className="text-base sm:text-lg font-bold text-emerald-400">
            +{formatUGX(calcTotalReturn)} (+{returnPct}%)
          </div>
        </div>
      </div>
    </div>
  )
}
