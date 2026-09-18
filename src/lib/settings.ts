import { supabase } from './supabase'
import type { PlatformSettings } from './types'

export const DEPOSIT_PHONE = '0763445008'
export const DEPOSIT_RECIPIENT_NAME = 'Huzairu Ssali'
export const WHATSAPP_HELPLINE = '0763445008'
export const WHATSAPP_HELPLINE_INTERNATIONAL = '+256763445008'
export const WHATSAPP_LINK = 'https://wa.me/256763445008'

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  min_deposit: 10000,
  min_withdrawal: 10000,
  withdrawal_lock_days: 0,
  withdrawal_lock_enabled: false,
  currency: 'UGX',
  referral_bonus_pct: 10,
  brand_name: 'Feldwert Capital',
  deposit_phone: DEPOSIT_PHONE,
  deposit_recipient_name: DEPOSIT_RECIPIENT_NAME,
  whatsapp_helpline: WHATSAPP_HELPLINE,
}

/**
 * Retrieves the current platform settings from the Supabase/database source of truth.
 * Reads the canonical platform_settings row.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', true)
      .single()
    if (error) {
      throw new Error(error.message || 'Failed to load platform settings from database.')
    }

    const row = data
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
      .eq('id', true)

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
    const { error } = await supabase
      .from('platform_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', true)

    if (error) {
      return { success: false, error: error.message || 'Failed to save settings to database.' }
    }

    if (typeof window !== 'undefined') {
      for (const [key, value] of Object.entries(patch)) {
        window.dispatchEvent(
          new CustomEvent('platform-settings-updated', { detail: { key, value } })
        )
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database update failed.' }
  }
}
