/**
 * Investment Daily Returns & Accrual Engine
 * 
 * Implements a progressive investment-amount-based daily return model:
 * - Investment of UGX 15,000 -> UGX 5,000/day (33.33% daily return)
 * - Investment of UGX 20,000 -> UGX 7,500/day (37.50% daily return)
 * - Progressive tiers for higher investments ensuring proportionally higher daily returns.
 * - Supports arbitrary amounts continuously.
 */

export function calculateInvestmentDailyReturn(amount: number): number {
  if (!amount || amount <= 0) return 0
  const a = Math.round(amount)

  if (a < 15000) {
    return Math.round(a / 3)
  }
  if (a <= 20000) {
    return Math.round(5000 + (a - 15000) * 0.5)
  }
  if (a <= 50000) {
    return Math.round(7500 + (a - 20000) * 0.4)
  }
  if (a <= 100000) {
    return Math.round(19500 + (a - 50000) * 0.42)
  }
  if (a <= 500000) {
    return Math.round(40500 + (a - 100000) * 0.44)
  }
  return Math.round(216500 + (a - 500000) * 0.46)
}

export interface InvestmentAccrualStatus {
  dailyReturn: number
  earningDays: number
  accumulatedReturn: number
  lockedReturn: number
  claimableReturn: number
  claimedReturn: number
  isLocked: boolean
  unlockDate: Date
  daysUntilUnlock: number
  nextAccrualTime: Date
}

export function computeInvestmentAccrual(params: {
  amount: number
  dailyReturn?: number | null
  startDate: string | number | Date
  maturityDate?: string | number | Date | null
  claimedReturn?: number | null
  lockDays: number
  lockEnabled?: boolean
  currentEarningDays?: number | null
}): InvestmentAccrualStatus {
  const amount = Number(params.amount) || 0
  const dailyReturn =
    params.dailyReturn != null && params.dailyReturn > 0
      ? Number(params.dailyReturn)
      : calculateInvestmentDailyReturn(amount)

  const startDate = new Date(params.startDate)
  const claimedReturn = Number(params.claimedReturn) || 0
  const lockEnabled = params.lockEnabled ?? true
  const lockDays = lockEnabled ? Math.max(0, Number(params.lockDays) || 0) : 0

  const now = Date.now()
  const unlockTime = startDate.getTime() + lockDays * 86400000
  const unlockDate = new Date(unlockTime)
  const isLocked = lockDays > 0 && now < unlockTime
  const daysUntilUnlock = Math.max(0, Math.ceil((unlockTime - now) / 86400000))

  // Calculate elapsed earning days
  const startDay = new Date(startDate).setHours(0, 0, 0, 0)
  const today = new Date().setHours(0, 0, 0, 0)
  const maturityTime = params.maturityDate ? new Date(params.maturityDate).getTime() : now + 365 * 86400000
  const maturityDay = new Date(maturityTime).setHours(0, 0, 0, 0)

  const naturalDays = Math.max(1, Math.floor((Math.min(today, maturityDay) - startDay) / 86400000) + 1)
  const earningDays = Math.max(naturalDays, Number(params.currentEarningDays) || 0)

  // Accumulated returns earned to date
  const accumulatedReturn = Math.round(dailyReturn * earningDays * 100) / 100

  // Locked vs Claimable
  let lockedReturn = 0
  let claimableReturn = 0

  if (isLocked) {
    lockedReturn = Math.max(0, Math.round((accumulatedReturn - claimedReturn) * 100) / 100)
    claimableReturn = 0
  } else {
    lockedReturn = 0
    claimableReturn = Math.max(0, Math.round((accumulatedReturn - claimedReturn) * 100) / 100)
  }

  // Next accrual calculation: end of current earning day (midnight tonight)
  const nextAccrual = new Date()
  nextAccrual.setHours(23, 59, 59, 999)

  return {
    dailyReturn,
    earningDays,
    accumulatedReturn,
    lockedReturn,
    claimableReturn,
    claimedReturn,
    isLocked,
    unlockDate,
    daysUntilUnlock,
    nextAccrualTime: nextAccrual,
  }
}
