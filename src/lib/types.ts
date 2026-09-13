export type FarmCategory = 'pig_farming' | 'goat_farming' | string

export type FarmStatus = 'active' | 'inactive' | 'funded' | 'archived' | string

export interface Profile {
  id: string
  username: string
  full_name: string
  phone: string | null
  role: 'user' | 'admin'
  status: 'active' | 'blocked'
  is_admin?: boolean
  referral_code: string
  referred_by: string | null
  withdrawal_locked_until?: string | null
  created_at: string
}

export interface Wallet {
  user_id: string
  balance: number
  total_invested: number
  total_returns: number
  updated_at: string
}

export interface FarmProject {
  id: string
  slug: string
  name: string
  category: FarmCategory
  description: string
  location: string
  image_url: string
  status: FarmStatus
  min_amount: number
  max_amount: number | null
  expected_return_pct: number
  duration_months: number
  target_amount: number
  funded_amount: number
  created_at: string
}

export interface Investment {
  id: string
  user_id: string
  farm_id: string
  project_id?: string
  amount: number
  status: 'pending' | 'active' | 'matured' | 'cancelled' | 'rejected'
  expected_return: number
  reference: string
  start_date: string | null
  maturity_date: string | null
  created_at: string
  farm?: FarmProject
}

export type TxType = 'deposit' | 'withdrawal' | 'investment' | 'return' | 'referral_bonus' | 'adjustment'

export type TxStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface Transaction {
  id: string
  user_id: string
  type: TxType
  amount: number
  status: TxStatus
  reference: string
  method: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  bonus_amount: number
  status: 'pending' | 'approved'
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string | null
  title: string
  body: string
  read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  admin_id: string
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface PlatformSettings {
  min_deposit: number
  min_withdrawal: number
  withdrawal_lock_days: number
  withdrawal_lock_enabled: boolean
  currency: string
  referral_bonus_pct: number
  brand_name: string
}

export interface VideoItem {
  id: string
  title: string
  description: string
  category: string
  duration: string
  thumbnail_url: string
  video_url: string
  published: boolean
  sort_order?: number
  created_at: string
}

export const formatCurrency = (n: number | null | undefined) =>
  `UGX ${Math.round(n ?? 0).toLocaleString('en-US')}`

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
