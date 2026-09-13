import { supabase } from './supabase'
import type { PlatformSettings } from './types'

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  min_deposit: 10000,
  min_withdrawal: 10000,
  withdrawal_lock_days: 7,
  withdrawal_lock_enabled: true,
  currency: 'UGX',
  referral_bonus_pct: 10,
  brand_name: 'Feldwert Capital',
}

/**
 * Retrieves the current platform settings from the Supabase/database source of truth.
 * Parses row-based platform_settings records into a strongly-typed PlatformSettings object.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase.from('platform_settings').select('*')
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { ...DEFAULT_PLATFORM_SETTINGS }
    }

    const settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS }
    for (const row of data as { key: string; value: any }[]) {
      const k = row.key
      const val = row.value
      if (k === 'min_withdrawal') {
        const n = Number(val)
        if (!isNaN(n) && n > 0) settings.min_withdrawal = n
      } else if (k === 'min_deposit') {
        const n = Number(val)
        if (!isNaN(n) && n > 0) settings.min_deposit = n
      } else if (k === 'referral_bonus_pct') {
        const n = Number(val)
        if (!isNaN(n) && n >= 0) settings.referral_bonus_pct = n
      } else if (k === 'withdrawal_lock_days') {
        const n = Number(val)
        if (!isNaN(n) && n >= 0) settings.withdrawal_lock_days = n
      } else if (k === 'withdrawal_lock_enabled') {
        settings.withdrawal_lock_enabled = Boolean(val)
      } else if (k === 'currency') {
        settings.currency = String(val)
      } else if (k === 'brand_name') {
        settings.brand_name = String(val)
      }
    }
    return settings
  } catch (err) {
    console.warn('[PlatformSettings] Failed to fetch settings from database:', err)
    return { ...DEFAULT_PLATFORM_SETTINGS }
  }
}

/**
 * Updates a platform setting directly in Supabase.
 * Enforces admin authorization via Supabase RLS / backend checks.
 */
export async function savePlatformSetting<K extends keyof PlatformSettings>(
  key: K,
  value: PlatformSettings[K]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('platform_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return { success: false, error: error.message || 'Failed to save setting to database.' }
    }

    // Dispatch global event for instant reactivity across open views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('platform-settings-updated', { detail: { key, value } })
      )
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error occurred while saving.' }
  }
}

/**
 * Batch updates multiple platform settings in Supabase.
 */
export async function saveMultiplePlatformSettings(
  patch: Partial<PlatformSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const entries = Object.entries(patch)
    for (const [key, val] of entries) {
      const res = await savePlatformSetting(key as keyof PlatformSettings, val)
      if (!res.success) {
        return res
      }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database update failed.' }
  }
}
