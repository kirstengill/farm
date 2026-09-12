import type { ReactNode } from 'react'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${light ? 'bg-gold-500' : 'bg-forest-800'}`}>
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${light ? 'text-forest-950' : 'text-gold-500'}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V6l6 4.5L16 6v13" />
        </svg>
      </span>
      <span className={`font-display text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-forest-900'}`}>
        Feldwert<span className={light ? 'text-gold-400' : 'text-gold-600'}>&nbsp;Capital</span>
      </span>
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-forest-800 text-white hover:bg-forest-700 shadow-sm',
    secondary: 'border border-forest-800/20 text-forest-900 bg-white hover:border-forest-800/50',
    ghost: 'text-forest-800 hover:bg-forest-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Input({
  label,
  hint,
  className = '',
  ...rest
}: { label?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink-600">{label}</span>}
      <input
        className={`w-full rounded-lg border-clay-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder-ink-600/40 outline-none transition-colors focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15 ${className}`}
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-ink-600/70">{hint}</span>}
    </label>
  )
}

export function Progress({ pct }: { pct: number }) {
  const v = Math.min(100, Math.max(0, pct))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-forest-50">
      <div className="shimmer h-full rounded-full transition-all duration-700" style={{ width: `${v}%` }} />
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-forest-50 text-forest-700 ring-forest-600/20',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    approved: 'bg-forest-50 text-forest-700 ring-forest-600/20',
    rejected: 'bg-red-50 text-red-700 ring-red-600/20',
    funded: 'bg-gold-100 text-gold-600 ring-gold-600/20',
    inactive: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    matured: 'bg-gold-100 text-gold-600 ring-gold-600/20',
    completed: 'bg-forest-50 text-forest-700 ring-forest-600/20',
    cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function Loader({ full = false }: { full?: boolean }) {
  return (
    <div className={`grid place-items-center ${full ? 'min-h-screen' : 'py-16'}`}>
      <Spinner className="h-8 w-8 text-forest-700" />
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border-dashed border-clay-200 bg-clay-100/40 p-10 text-center">
      <p className="font-display text-lg font-semibold text-forest-900">{title}</p>
      <p className="mt-1 text-sm text-ink-600">{body}</p>
    </div>
  )
}
