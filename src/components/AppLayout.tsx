import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Plus,
  Share2,
  Shield,
  Sprout,
  User,
  Wallet as WalletIcon,
} from 'lucide-react'
import { useAuth } from '../state/auth'
import { formatUGX } from '../lib/format'
import { isAdminProfile } from '../lib/auth'
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
  const { profile, wallet, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isMarketplace = location.pathname === '/marketplace'
  const isDashboard = location.pathname === '/dashboard'
  const isAdmin = location.pathname === '/admin'
  const userIsAdmin = isAdminProfile(profile)

  const handleNavClick = (key: string, path?: string) => {
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
      id: 'nav-wallet',
      key: 'wallet',
      label: 'Wallet',
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
    <div className="min-h-screen bg-forest-950 text-stone-100 flex flex-col antialiased">
      {/* ================= USER DASHBOARD TOP NAVIGATION ================= */}
      <header className="sticky top-0 z-40 flex items-center border-b border-stone-800/80 bg-forest-900 px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs">
        <Link to="/dashboard" className="focus:outline-none">
          <Logo light />
        </Link>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        {/* ================= DESKTOP SIDEBAR ================= */}
        <aside className="hidden md:flex md:w-64 lg:w-72 flex-col shrink-0 border-r border-stone-800/80 bg-forest-900 p-5 sticky top-[57px] h-[calc(100vh-57px)] z-30 justify-between">
          <div className="space-y-6">

          {/* User Quick Card */}
          <div className="rounded-2xl border border-stone-800/80 bg-stone-900/70 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-800 font-display font-bold text-white shadow-xs">
              {(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-bold text-white">
                  {profile?.full_name || profile?.username || 'Investor'}
                </p>
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              </div>
              <p className="truncate text-[11px] text-stone-400 font-mono">
                @{profile?.username || 'investor'}
              </p>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
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
                        : 'text-stone-300 hover:bg-stone-800/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          item.isActive ? 'text-gold-400' : 'text-forest-500 group-hover:text-forest-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          item.isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-forest-900 text-forest-300'
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
          {userIsAdmin && (
            <div className="pt-2">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Administration
              </span>
              <div className="pt-1.5">
                <Link
                  to="/admin"
                  id="nav-admin"
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isAdmin
                      ? 'bg-forest-950 text-gold-400 shadow-xs'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gold-500" />
                    <span>Admin Operations</span>
                  </div>
                  <span className="rounded-md bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-400">
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
        <div className="pt-4 border-t border-stone-800">
          <button
            id="btn-sidebar-signout"
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-300 hover:bg-red-900/30 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

        {/* ================= MAIN CONTENT AREA ================= */}
        <main className="flex-1 min-w-0 pb-20 md:pb-10">
          {children}
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      {/* Exactly 5 items as requested: Dashboard, Investments, Transactions, Referrals, Profile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-forest-900/95 backdrop-blur-md border-t border-stone-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
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
                  ? 'text-gold-400 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  item.isActive ? 'bg-forest-800 text-gold-400' : 'text-stone-400'
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
