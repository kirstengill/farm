import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { formatUGX } from '../lib/format'
import type { FarmProject, Investment } from '../lib/types'
import AppLayout from '../components/AppLayout'
import InvestmentCard from '../components/InvestmentCard'
import InvestmentDetailModal from '../components/InvestmentDetailModal'

export default function Marketplace() {
  const { user, wallet, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [farms, setFarms] = useState<FarmProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFarm, setSelectedFarm] = useState<FarmProject | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'roi' | 'duration' | 'min_amount'>('roi')
  const [notification, setNotification] = useState<string | null>(null)

  // Load farms and user investments
  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        setFarms(data as FarmProject[])
        return
      }

      setFarms([])
    } catch (err) {
      console.error('Failed to load farm projects:', err)
      setFarms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFarms()
  }, [])

  // Filter & sort logic
  const filteredFarms = useMemo(() => {
    let list = [...farms]

    // Category filter
    if (selectedCategory !== 'All') {
      const target = selectedCategory.toLowerCase()
      list = list.filter((f) => {
        const cat = (f.category || '').toLowerCase()
        const name = (f.name || '').toLowerCase()
        if (target.includes('cattle')) {
          return cat.includes('cattle') || name.includes('cattle') || cat.includes('cow')
        }
        if (target.includes('pig')) {
          return cat.includes('pig') || name.includes('pig') || cat.includes('swine') || cat.includes('piggery')
        }
        if (target.includes('feed')) {
          return cat.includes('feed') || name.includes('feed') || cat.includes('grain')
        }
        if (target.includes('broiler')) {
          return cat.includes('broiler') || name.includes('broiler') || cat.includes('poultry')
        }
        return cat.includes(target)
      })
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      )
    }

    // Sort order
    list.sort((a, b) => {
      if (sortBy === 'roi') {
        return b.expected_return_pct - a.expected_return_pct
      }
      if (sortBy === 'duration') {
        return a.duration_months - b.duration_months
      }
      if (sortBy === 'min_amount') {
        return a.min_amount - b.min_amount
      }
      return 0
    })

    return list
  }, [farms, selectedCategory, searchQuery, sortBy])

  // Handle direct investment booking
  const handleConfirmInvest = async (projectId: string, amount: number): Promise<boolean> => {
    if (!user) {
      navigate('/signin')
      return false
    }

    const { error: fnErr } = await supabase.rpc('create_investment', {
      p_project_id: projectId,
      p_amount: amount,
    })

    if (fnErr) throw fnErr

    // Refresh wallet and farm projects
    await refreshProfile()
    await fetchFarms()

    setNotification(`Successfully allocated ${formatUGX(amount)} to program.`)
    setTimeout(() => setNotification(null), 5000)
    return true
  }

  const categoryOptions = [
    { key: 'All', label: 'All Programs', icon: '🌱' },
    { key: 'Cattle', label: 'Cattle Investment', icon: '🐄' },
    { key: 'Pig', label: 'Pig Farming', icon: '🐖' },
    { key: 'Feeds', label: 'Animal Feeds', icon: '🌾' },
    { key: 'Broilers', label: 'Broilers', icon: '🐔' },
  ]

  return (
    <AppLayout
      activeTab="marketplace"
      onQuickDeposit={() => navigate('/dashboard?tab=wallet')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Alert for quick feedback */}
        {notification && (
          <div className="rounded-2xl bg-forest-900 text-white p-4 shadow-md flex items-center justify-between gap-3 animate-fade-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-gold-400 shrink-0" />
              <p className="text-sm font-semibold">{notification}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs text-stone-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-forest-950 text-white p-6 sm:p-10 shadow-lg border border-forest-900">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-forest-800/80 px-3 py-1 text-xs font-semibold text-gold-300 border border-gold-500/30">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
              <span>Vetted Agribusiness Opportunities</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Agricultural Investment Programs
            </h1>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
              Directly fund high-performing operations in Cattle breeding, precision Animal Feed
              production, and bio-secure Broiler poultry with fixed periodic yields and asset-backed
              collateral.
            </p>
          </div>

          {/* Decorative background glows */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-forest-700/30 blur-3xl" />
          <div className="absolute right-40 top-0 w-60 h-60 rounded-full bg-gold-600/10 blur-2xl" />
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {categoryOptions.map((cat) => (
              <button
                key={cat.key}
                id={`filter-cat-${cat.key}`}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-forest-800 text-white shadow-xs'
                    : 'bg-stone-50 text-ink-600 hover:bg-stone-100 hover:text-forest-900 border border-stone-200/70'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Input & Sort Dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
              <input
                id="input-search-farms"
                type="text"
                placeholder="Search programs or regions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-xs sm:text-sm text-ink-900 placeholder-ink-400 focus:border-forest-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest-600/20"
              />
            </div>

            <div className="relative shrink-0">
              <select
                id="select-sort-programs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs sm:text-sm font-medium text-ink-700 focus:border-forest-600 focus:outline-none"
              >
                <option value="roi">Highest ROI %</option>
                <option value="duration">Shortest Duration</option>
                <option value="min_amount">Lowest Min. Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-96 rounded-2xl border border-stone-200 bg-white p-5 animate-pulse space-y-4"
              >
                <div className="h-48 rounded-xl bg-stone-200" />
                <div className="h-5 w-3/4 rounded-md bg-stone-200" />
                <div className="h-4 w-1/2 rounded-md bg-stone-100" />
                <div className="h-16 rounded-xl bg-stone-100" />
              </div>
            ))}
          </div>
        ) : filteredFarms.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-800">
              <Sprout className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="font-display text-lg font-bold text-forest-950">
                No investment programs found
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 mt-1">
                {searchQuery
                  ? `No programs matched "${searchQuery}". Try modifying your search or clearing category filters.`
                  : 'There are currently no active investment opportunities in this category.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Program Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFarms.map((project) => (
              <InvestmentCard
                key={project.id}
                project={project}
                onSelect={(p) => setSelectedFarm(p)}
                onInvestNow={(p) => setSelectedFarm(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail / Investment Modal with Timeline and Schedule Simulator */}
      <InvestmentDetailModal
        project={selectedFarm}
        wallet={wallet}
        isOpen={Boolean(selectedFarm)}
        onClose={() => setSelectedFarm(null)}
        onConfirmInvest={handleConfirmInvest}
        onGoToDeposit={() => navigate('/dashboard?tab=wallet')}
      />
    </AppLayout>
  )
}
