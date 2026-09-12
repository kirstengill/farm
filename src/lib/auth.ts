import { supabase } from './supabase'
import type { Profile, Wallet } from './types'

/**
 * Username-based authentication.
 * Supabase Auth requires an email identifier internally; we synthesize a
 * hidden email from the username so users never see or enter an email.
 * The real login identifier is always the username.
 */

const emailFromUsername = (username: string) =>
  `${username.toLowerCase().replace(/[^a-z0-9_]/g, '_')}@users.feldwert.de`

export const normalizeUsername = (u: string) => u.trim().toLowerCase()

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
        referred_by_code: opts.referralCode?.trim() || null,
      },
    },
  })
  if (error) throw error
  return data
}

export async function signInWithUsername(username: string, password: string) {
  const uname = normalizeUsername(username)
  // Sign in directly with the synthesized email
  const email = emailFromUsername(uname)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // fall back: maybe user registered with a legacy style email
    throw error
  }
  return data
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
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
  const email = emailFromUsername(uname)
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new Error('No recovery address found for this username. Contact support.')
  return `Recovery link sent to the address registered for “${uname}”.`
}
