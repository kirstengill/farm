export const formatUGX = (n: number | null | undefined) => {
  const val = Math.round(n ?? 0)
  return `UGX ${val.toLocaleString('en-US')}`
}

// Backwards-compatible alias so existing component imports render UGX without error
export const formatEUR = formatUGX

export const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export const formatRelativeDays = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const target = new Date(iso).getTime()
  const diffDays = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Matured'
  if (diffDays === 1) return '1 day remaining'
  return `${diffDays} days remaining`
}

export function durationToDays(durationMonths: number | null | undefined): number {
  const m = Number(durationMonths)
  if (!Number.isFinite(m) || m <= 0) return 30
  return Math.max(1, Math.round(m * 30))
}

export function formatDurationDays(durationMonths: number | null | undefined): string {
  const m = Number(durationMonths)
  const days = durationToDays(durationMonths)
  if (Number.isFinite(m) && m > 0 && m < 1) {
    return `${days} Days (${m} mo)`
  }
  return `${days} Days`
}

export function calculateInvestmentSchedule(
  amount: number,
  returnPct: number,
  durationMonths: number
) {
  const m = Number(durationMonths) > 0 ? Number(durationMonths) : 1
  const durationDays = durationToDays(m)
  const totalReturn = Math.round((amount * returnPct) / 100)
  const totalPayout = amount + totalReturn
  const monthlyReturn = m > 0 ? Math.round(totalReturn / m) : 0
  const dailyReturn = durationDays > 0 ? Math.round(totalReturn / durationDays) : 0
  const dailyRatePct =
    durationDays > 0 ? (returnPct / durationDays).toFixed(3) : '0.000'
  const monthlyRatePct = m > 0 ? (returnPct / m).toFixed(2) : '0.00'

  const startDate = new Date()
  const completionDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

  return {
    amount,
    returnPct,
    durationMonths: m,
    durationDays,
    totalReturn,
    totalPayout,
    monthlyReturn,
    dailyReturn,
    dailyRatePct,
    monthlyRatePct,
    startDate: startDate.toISOString(),
    completionDate: completionDate.toISOString(),
  }
}

/**
 * Standardize Uganda phone number display
 * Supports 077..., 070..., +256...
 */
export function formatUgandaPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const cleaned = phone.replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('+256') && cleaned.length === 13) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  return phone
}
