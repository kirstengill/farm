import { supabase } from './supabase'
import type { Profile, Wallet } from './types'

/**
 * Username-based authentication.
 * Supabase Auth requires an email identifier internally; we synthesize a
 * hidden email from the username so users never see or enter an email.
 * The real login identifier is always the username.
 */

const normalizeLocalPart = (username: string) =>
  username.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'user'

const emailFromUsername = (username: string) => `${normalizeLocalPart(username)}@example.com`
const legacyEmailFromUsername = (username: string) => `${normalizeLocalPart(username)}@users.feldwert.de`

export const normalizeUsername = (u: string) => u.trim().toLowerCase()

export const isAdminProfile = (profile: Partial<Profile> | null | undefined) =>
  Boolean(profile && (profile.role === 'admin' || profile.is_admin === true))

export async function signUpWithUsername(opts: {
  username: string
  password: string
  fullName: string
  phone: string
  referralCode?: string
}) {
  const username = normalizeUsername(opts.username)
  const email = emailFromUsername(username)

  const { data, error } = await supabase.auth.signUp({
    email,
    password: opts.password,
    options: {
      data: {
        username,
        full_name: opts.fullName,
        phone: opts.phone,
        referral_code: opts.referralCode?.trim() || null,
      },
    },
  })
  if (error) throw error

  if (data.session) {
    const { error: bonusError } = await supabase.rpc('award_signup_bonus')
    if (bonusError) throw bonusError
  }

  return data
}

export async function signInWithUsername(username: string, password: string) {
  const uname = normalizeUsername(username)
  const candidates = [emailFromUsername(uname), legacyEmailFromUsername(uname)]

  for (const email of candidates) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return data
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      continue
    }
    throw error
  }

  throw new Error('Invalid username or password.')
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (data) {
    return {
      ...data,
      is_admin: isAdminProfile(data as Profile),
    } as Profile
  }
  return data as Profile | null
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Wallet | null
}

export async function signOut() {
  await supabase.auth.signOut()
}

/**
 * Sends a password recovery email to the hidden recovery address tied to a
 * username, if the user stored one. Falls back to a support message.
 */
export async function resetPassword(username: string): Promise<string> {
  const uname = normalizeUsername(username)
  const candidates = [emailFromUsername(uname), legacyEmailFromUsername(uname)]

  for (const email of candidates) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (!error) return `Recovery link sent to the address registered for “${uname}”.`
  }

  throw new Error('No recovery address found for this username. Contact support.')
}
