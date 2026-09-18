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
  const m = Number(durationMonths) || 1
  return m * 30
}

export function formatDurationDays(durationMonths: number | null | undefined): string {
  return `${durationToDays(durationMonths)} Days`
}

export function calculateInvestmentSchedule(
  amount: number,
  returnPct: number,
  durationMonths: number
) {
  const totalReturn = Math.round((amount * returnPct) / 100)
  const totalPayout = amount + totalReturn
  const durationDays = durationToDays(durationMonths)
  const monthlyReturn = durationMonths > 0 ? Math.round(totalReturn / durationMonths) : 0
  const dailyReturn = durationMonths > 0 ? Math.round(totalReturn / (durationMonths * 30)) : 0
  const dailyRatePct =
    durationMonths > 0 ? (returnPct / (durationMonths * 30)).toFixed(3) : '0.000'
  const monthlyRatePct = durationMonths > 0 ? (returnPct / durationMonths).toFixed(2) : '0.00'

  const startDate = new Date()
  const completionDate = new Date()
  completionDate.setMonth(completionDate.getMonth() + durationMonths)

  return {
    amount,
    returnPct,
    durationMonths,
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
