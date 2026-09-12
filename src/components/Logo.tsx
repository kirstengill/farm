export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${light ? 'text-white' : ''}`}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-800">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold-500" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V6l6 4.5L16 6v13" />
        </svg>
      </span>
      <span className={`font-display text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-forest-950'}`}>
        Feldwert<span className={`${light ? 'text-gold-400' : 'text-gold-600'}`}>&nbsp;Capital</span>
      </span>
    </span>
  )
}


export function LogoLight() {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-500">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-forest-950" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V6l6 4.5L16 6v13" />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-white">
        Feldwert<span className="text-gold-400">&nbsp;Capital</span>
      </span>
    </span>
  )
}
