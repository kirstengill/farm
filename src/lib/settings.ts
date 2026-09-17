import { supabase } from './supabase'
import type { PlatformSettings } from './types'

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  min_deposit: 10000,
  min_withdrawal: 10000,
  withdrawal_lock_days: 0,
  withdrawal_lock_enabled: false,
  currency: 'UGX',
  referral_bonus_pct: 10,
  brand_name: 'Feldwert Capital',
}

/**
 * Retrieves the current platform settings from the Supabase/database source of truth.
 * Reads the canonical platform_settings row.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase.from('platform_settings').select('*')
    if (error) {
      throw new Error(error.message || 'Failed to load platform settings from database.')
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      throw new Error('Platform settings are unavailable.')
    }

    const lockDays = Number(row.withdrawal_lock_days)
    if (!Number.isFinite(lockDays) || lockDays < 0 || typeof row.withdrawal_lock_enabled !== 'boolean') {
      throw new Error('Platform settings are missing canonical withdrawal lock values.')
    }

    return {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...row,
      withdrawal_lock_days: lockDays,
      withdrawal_lock_enabled: row.withdrawal_lock_enabled,
    } as PlatformSettings
  } catch (err) {
    console.error('[PlatformSettings] Failed to fetch settings from database:', err)
    throw err instanceof Error ? err : new Error('Failed to load platform settings from database.')
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
    const { error } = await supabase
      .from('platform_settings')
      .update({ [key]: value, updated_at: new Date().toISOString() })

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
