import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Coins,
  Compass,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Share2,
  Shield,
  Sprout,
  User,
  Video,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'
import { useAuth } from '../state/auth'
import { formatUGX } from '../lib/format'
import { Logo } from './Logo'

interface AppLayoutProps {
  children: ReactNode
  activeTab?: string
  onTabChange?: (tab: string) => void
  onQuickDeposit?: () => void
  onQuickWithdraw?: () => void
}

export default function AppLayout({
  children,
  activeTab = 'overview',
  onTabChange,
  onQuickDeposit,
  onQuickWithdraw,
}: AppLayoutProps) {
  const { user, profile, wallet, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isMarketplace = location.pathname === '/marketplace'
  const isDashboard = location.pathname === '/dashboard'
  const isVideos = location.pathname === '/videos'
  const isAdmin = location.pathname === '/admin'

  const handleNavClick = (key: string, path?: string) => {
    setMobileMenuOpen(false)
    if (path) {
      navigate(path)
      return
    }
    if (onTabChange) {
      onTabChange(key)
    } else {
      navigate(`/dashboard?tab=${key}`)
    }
  }

  const navItems = [
    {
      id: 'nav-dashboard',
      key: 'overview',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: isDashboard && activeTab === 'overview',
      action: () => handleNavClick('overview', '/dashboard'),
    },
    {
      id: 'nav-investments',
      key: 'marketplace',
      label: 'Investments',
      icon: Sprout,
      badge: 'Active',
      isActive: isMarketplace || (isDashboard && activeTab === 'farms'),
      action: () => handleNavClick('marketplace', '/marketplace'),
    },
    {
      id: 'nav-videos',
      key: 'videos',
      label: 'Videos',
      icon: Video,
      badge: 'New',
      isActive: isVideos || (isDashboard && activeTab === 'videos'),
      action: () => handleNavClick('videos', '/videos'),
    },
    {
      id: 'nav-transactions',
      key: 'wallet',
      label: 'Transactions',
      icon: WalletIcon,
      isActive: isDashboard && activeTab === 'wallet',
      action: () => handleNavClick('wallet', '/dashboard?tab=wallet'),
    },
    {
      id: 'nav-referrals',
      key: 'referrals',
      label: 'Referrals',
      icon: Share2,
      isActive: isDashboard && activeTab === 'referrals',
      action: () => handleNavClick('referrals', '/dashboard?tab=referrals'),
    },
    {
      id: 'nav-profile',
      key: 'settings',
      label: 'Profile',
      icon: User,
      isActive: isDashboard && activeTab === 'settings',
      action: () => handleNavClick('settings', '/dashboard?tab=settings'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-ink-900 flex flex-col md:flex-row antialiased">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col shrink-0 border-r border-stone-200/80 bg-white p-5 sticky top-0 h-screen z-30 justify-between">
        <div className="space-y-6">
          {/* Logo */}
          <div className="pb-4 border-b border-stone-100">
            <Link to="/dashboard" className="block focus:outline-none">
              <Logo />
            </Link>
          </div>

          {/* User Quick Card */}
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-800 font-display font-bold text-white shadow-xs">
              {(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-bold text-forest-950">
                  {profile?.full_name || profile?.username || 'Investor'}
                </p>
                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              </div>
              <p className="truncate text-[11px] text-ink-500 font-mono">
                @{profile?.username || 'investor'}
              </p>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Platform Menu
            </span>
            <div className="pt-1.5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    id={item.id}
                    type="button"
                    onClick={item.action}
                    className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      item.isActive
                        ? 'bg-forest-800 text-white shadow-xs'
                        : 'text-ink-600 hover:bg-forest-50/70 hover:text-forest-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          item.isActive ? 'text-gold-400' : 'text-forest-700 group-hover:text-forest-900'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          item.isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-forest-100 text-forest-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Admin link if user has admin privileges */}
          {profile?.is_admin && (
            <div className="pt-2">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Administration
              </span>
              <div className="pt-1.5">
                <Link
                  to="/admin"
                  id="nav-admin"
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isAdmin
                      ? 'bg-forest-950 text-gold-400 shadow-xs'
                      : 'text-ink-600 hover:bg-forest-50 hover:text-forest-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gold-500" />
                    <span>Admin Operations</span>
                  </div>
                  <span className="rounded-md bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-700">
                    Staff
                  </span>
                </Link>
              </div>
            </div>
          )}

          {/* Quick Wallet Summary Card */}
          <div className="rounded-2xl border border-forest-800/15 bg-forest-900 text-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-forest-200">
              <span className="flex items-center gap-1.5">
                <WalletIcon className="h-3.5 w-3.5 text-gold-400" />
                <span>Wallet Balance</span>
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                UGX
              </span>
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              {formatUGX(wallet?.balance ?? 0)}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-forest-800">
              <button
                type="button"
                onClick={onQuickDeposit || (() => handleNavClick('wallet', '/dashboard?tab=wallet'))}
                className="flex items-center justify-center gap-1 rounded-lg bg-forest-700 hover:bg-forest-600 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="h-3 w-3 text-gold-400" />
                <span>Deposit</span>
              </button>
              <button
                type="button"
                onClick={onQuickWithdraw || (() => handleNavClick('wallet', '/dashboard?tab=wallet'))}
                className="flex items-center justify-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs font-semibold text-stone-200 transition-colors"
              >
                <ArrowUpRight className="h-3 w-3" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer / Sign Out */}
        <div className="pt-4 border-t border-stone-100">
          <button
            id="btn-sidebar-signout"
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MOBILE TOP HEADER ================= */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-xs">
        <Link to="/dashboard" className="focus:outline-none">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          {/* Quick Balance Pill */}
          <Link
            to="/dashboard?tab=wallet"
            className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-bold text-forest-900 border border-forest-200"
          >
            <Coins className="h-3.5 w-3.5 text-gold-600" />
            <span>{formatUGX(wallet?.balance ?? 0)}</span>
          </Link>

          {/* Quick Deposit Trigger */}
          <button
            type="button"
            onClick={onQuickDeposit || (() => handleNavClick('wallet', '/dashboard?tab=wallet'))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-800 text-white"
            title="Deposit funds"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Mobile Menu Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-ink-700 hover:bg-stone-50"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bottom-[65px] z-30 bg-white/95 backdrop-blur-md p-5 overflow-y-auto border-b border-stone-200 space-y-4 animate-fade">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs text-ink-500 font-medium">Logged in as:</p>
            <p className="font-display text-base font-bold text-forest-950 mt-0.5">
              {profile?.full_name || profile?.username}
            </p>
            <p className="text-xs text-ink-500 font-mono">@{profile?.username}</p>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold ${
                    item.isActive ? 'bg-forest-800 text-white' : 'text-ink-700 hover:bg-forest-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-md bg-forest-100 text-forest-800 px-2 py-0.5 text-xs font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}

            {profile?.is_admin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-forest-900 hover:bg-gold-50 border border-gold-200"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-gold-600" />
                  <span>Admin Operations</span>
                </div>
                <span className="rounded-md bg-gold-200 text-forest-900 px-2 py-0.5 text-xs">
                  Staff
                </span>
              </Link>
            )}
          </div>

          <div className="pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-sm font-bold text-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 min-w-0 pb-20 md:pb-10">
        {children}
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      {/* Exactly 5 items as requested: Dashboard, Investments, Transactions, Referrals, Profile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={`bottom-${item.id}`}
              id={`bottom-${item.id}`}
              type="button"
              onClick={item.action}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold transition-all min-w-[58px] ${
                item.isActive
                  ? 'text-forest-800 font-bold'
                  : 'text-ink-500 hover:text-forest-700'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  item.isActive ? 'bg-forest-100 text-forest-800' : 'text-ink-500'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
