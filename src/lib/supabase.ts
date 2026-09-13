import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const hasCredentials = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project')
)

if (!hasCredentials) {
  console.info(
    '[Feldwert Capital] Supabase environment variables not configured. Using persistent in-memory/localStorage mock mode for preview.'
  )
}

export const supabase = hasCredentials
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : (mockSupabase as any)

export const isUsingMock = !hasCredentials

