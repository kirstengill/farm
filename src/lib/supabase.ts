import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const hasCredentials = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    /^https?:\/\/.+/.test(supabaseUrl) &&
    !supabaseUrl.includes('your-project')
)

const shouldUseMock = !hasCredentials

if (shouldUseMock) {
  console.info(
    '[Feldwert Capital] Using the local preview mock backend for this environment.'
  )
}

export const supabase = shouldUseMock
  ? (mockSupabase as any)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })

export const isUsingMock = shouldUseMock

