import { Calendar, ChevronRight, Coins, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import type { FarmProject } from '../lib/types'
import { formatUGX } from '../lib/format'
import FarmImage from './FarmImage'
import { farmArtFor } from '../lib/farmArt'

interface InvestmentCardProps {
  project: FarmProject
  onSelect: (project: FarmProject) => void
  onInvestNow?: (project: FarmProject) => void
}

export default function InvestmentCard({
  project,
  onSelect,
  onInvestNow,
}: InvestmentCardProps) {
  // Category styling and iconography
  const getCategoryMeta = (cat: string = '') => {
    const s = cat.toLowerCase()
    if (s.includes('cattle') || s.includes('cow') || s.includes('beef') || s.includes('dairy')) {
      return {
        badge: 'bg-emerald-900/90 text-emerald-100 border-emerald-700',
        accentBorder: 'border-emerald-600/30',
        tag: 'Cattle Investment',
        icon: '🐄',
        highlight: 'Pasture Cattle Herd',
      }
    }
    if (s.includes('feed') || s.includes('grain') || s.includes('pellet')) {
      return {
        badge: 'bg-amber-900/90 text-amber-100 border-amber-700',
        accentBorder: 'border-amber-600/30',
        tag: 'Animal Feed Investment',
        icon: '🌾',
        highlight: 'Feed & Silage Mill',
      }
    }
    if (s.includes('broiler') || s.includes('poultry') || s.includes('chicken')) {
      return {
        badge: 'bg-orange-900/90 text-orange-100 border-orange-700',
        accentBorder: 'border-orange-600/30',
        tag: 'Broiler Investment',
        icon: '🐔',
        highlight: 'Poultry Operations',
      }
    }
    return {
      badge: 'bg-forest-900/90 text-forest-100 border-forest-700',
      accentBorder: 'border-forest-600/30',
      tag: project.category || 'Agri Investment',
      icon: '🌱',
      highlight: 'Managed Operation',
    }
  }

  const meta = getCategoryMeta(project.category)

  // Calculations strictly from backend values
  const fundedPct =
    project.target_amount > 0
      ? Math.min(100, Math.round((project.funded_amount / project.target_amount) * 100))
      : 0

  // Use the product's configured daily return at the minimum investment.
  const refAmount = project.min_amount || 100
  const durationMonths = project.duration_months || 1
  const dailyReturnRef = project.daily_return ?? Math.round(
    (refAmount * project.expected_return_pct) / (100 * durationMonths * 30)
  )
  const expectedTotalProfit = Math.round(dailyReturnRef * durationMonths * 30 * 100) / 100
  const dailyRatePct = ((dailyReturnRef / refAmount) * 100).toFixed(2)

  return (
    <div
      id={`farm-card-${project.id}`}
      className="group relative flex flex-col rounded-2xl border border-stone-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-forest-600/40 hover:shadow-xl overflow-hidden"
    >
      {/* Visual Image Header */}
      <div className="relative h-56 w-full overflow-hidden bg-stone-100 cursor-pointer" onClick={() => onSelect(project)}>
        <FarmImage
          src={project.image_url || farmArtFor(project.name || project.category)}
          alt={`${project.name} - ${project.category}`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Gradient Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Category Badge & ROI Tag */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md border ${meta.badge}`}
          >
            <span>{meta.icon}</span>
            <span>{meta.tag}</span>
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-forest-950/85 px-3 py-1 text-xs font-bold text-gold-400 border border-gold-500/30 backdrop-blur-md shadow-xs">
            <TrendingUp className="h-3 w-3 text-gold-400" />
            +{project.expected_return_pct}% ROI
          </span>
        </div>

        {/* Title & Location over Image */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-center gap-1.5 text-stone-200 text-xs mb-1">
            <MapPin className="h-3 w-3 text-gold-400 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
          <h3 className="font-display text-lg font-bold text-white leading-snug drop-shadow-sm line-clamp-1">
            {project.name}
          </h3>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed mb-4">
          {project.description}
        </p>

        {/* Structured Financial Matrix */}
        <div className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-3.5 mb-4 space-y-3">
          {/* Row 1: Investment Amount & Duration */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-stone-200/60">
            <div>
              <span className="text-[11px] font-medium text-ink-500 block">Min. Investment</span>
              <span className="font-display text-base font-bold text-forest-950">
                {formatUGX(project.min_amount)}
              </span>
              <span className="text-[10px] text-ink-500 block">
                Max {project.max_amount ? formatUGX(project.max_amount) : 'No Limit'}
              </span>
            </div>

            <div className="border-l border-stone-200/60 pl-3">
              <span className="text-[11px] font-medium text-ink-500 block">Investment Schedule</span>
              <div className="inline-flex items-center gap-1 text-forest-800 font-semibold text-sm mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-forest-600" />
                <span>{project.duration_months} Months</span>
              </div>
              <span className="text-[10px] text-forest-600 font-medium block">Fixed Term</span>
            </div>
          </div>

          {/* Row 2: Daily Return & Total Expected Return */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-medium text-ink-500 block">Daily Yield</span>
              <div className="inline-flex items-center gap-1 text-forest-900 font-bold text-sm">
                <Coins className="h-3.5 w-3.5 text-gold-600" />
                <span>~{dailyRatePct}% / day</span>
              </div>
              <span className="text-[10px] text-ink-500 block">
                +{formatUGX(dailyReturnRef)}/d on {formatUGX(refAmount)}
              </span>
            </div>

            <div className="border-l border-stone-200/60 pl-3">
              <span className="text-[11px] font-medium text-ink-500 block">Total Expected Return</span>
              <span className="font-display text-sm font-bold text-emerald-800 block">
                +{formatUGX(expectedTotalProfit)} Total
              </span>
              <span className="text-[10px] text-emerald-700 font-medium block">
                +{formatUGX(expectedTotalProfit)} on min
              </span>
            </div>
          </div>
        </div>

        {/* Investment Funding Progress */}
        <div className="mb-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-600">
              Funded: <strong className="text-forest-900">{formatUGX(project.funded_amount)}</strong>
            </span>
            <span className="font-bold text-forest-700">{fundedPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-forest-600 to-forest-500 transition-all duration-500"
              style={{ width: `${fundedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-ink-500">
            <span>Target: {formatUGX(project.target_amount)}</span>
            <span className="text-forest-700 font-medium">Status: {project.status}</span>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="mt-auto grid grid-cols-2 gap-2.5 pt-2 border-t border-stone-100">
          <button
            id={`btn-details-${project.id}`}
            type="button"
            onClick={() => onSelect(project)}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-forest-800/20 bg-white px-3.5 py-2.5 text-xs font-semibold text-forest-900 transition-colors hover:bg-forest-50 focus:outline-none"
          >
            <span>View Details</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            id={`btn-invest-${project.id}`}
            type="button"
            onClick={() => (onInvestNow ? onInvestNow(project) : onSelect(project))}
            className="inline-flex items-center justify-center rounded-xl bg-forest-800 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-forest-700 hover:shadow-md focus:outline-none active:scale-98"
          >
            <span>Invest Now</span>
          </button>
        </div>
      </div>
    </div>
  )
}
