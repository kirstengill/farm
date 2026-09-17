import { farmArtFor } from './farmArt'
import type {
  FarmProject,
  Investment,
  Profile,
  Transaction,
  Wallet,
  AppNotification,
  VideoItem,
  Referral,
} from './types'

// Default seed videos for agricultural fintech investment platform
const DEFAULT_VIDEOS: VideoItem[] = [
  {
    id: 'vid-1',
    title: 'Welcome to Feldwert Capital & Agricultural Fintech',
    description:
      'A comprehensive introduction to our institutional-grade agricultural investment ecosystem, capital protection, and real-asset backing.',
    category: 'Getting Started',
    duration: '2:45',
    thumbnail_url:
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    published: true,
    sort_order: 1,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'vid-2',
    title: 'How Cattle & Pasture Breeding Yields Work',
    description:
      'Discover how Angus and Simmental breeding herds deliver biometric weight gains, calving multipliers, and consistent quarterly revenue.',
    category: 'Investment Programs',
    duration: '3:50',
    thumbnail_url:
      'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    published: true,
    sort_order: 2,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'vid-3',
    title: 'MTN & Airtel Mobile Money Deposit Guide',
    description:
      'Step-by-step walkthrough on depositing Ugandan Shillings (UGX) via USSD merchant codes (*165*3# & *185*9#) with instantaneous verification.',
    category: 'Deposits & Withdrawals',
    duration: '3:15',
    thumbnail_url:
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    published: true,
    sort_order: 3,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'vid-4',
    title: 'Animal Feeds Milling & Processing Economics',
    description:
      'How grain processing, high-protein pellets, and essential agricultural supply chains create defensive, non-correlated investment returns.',
    category: 'How Investing Works',
    duration: '4:10',
    thumbnail_url:
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    published: true,
    sort_order: 4,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'vid-5',
    title: 'Broiler Poultry Fast-Turnover Cycles & Biosecurity',
    description:
      'Inside automated climate-controlled broiler units: rapid 60-day turnover cycles, strict isolation, and pre-negotiated retail contracts.',
    category: 'Investment Programs',
    duration: '4:45',
    thumbnail_url:
      'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    published: true,
    sort_order: 5,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'vid-6',
    title: 'Security Safeguards & Capital Holding Protocols',
    description:
      'Detailed overview of the 7-day security holding rule, anti-fraud verifications, and how capital reserves protect your portfolio.',
    category: 'Platform Guide',
    duration: '3:20',
    thumbnail_url:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    video_url:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    published: true,
    sort_order: 6,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

// Default seed data with Cattle, Animal Feeds, and Broilers programs in UGX
const DEFAULT_FARMS: FarmProject[] = [
  {
    id: 'farm-1',
    slug: 'bavarian-angus-cattle',
    name: 'Bavarian Angus Cattle Breeding',
    category: 'Cattle',
    description:
      'Pasture-raised organic Angus cattle program with guaranteed regional processing off-take contracts and biosecurity tracking.',
    location: 'Allgäu, Bavaria, Germany',
    image_url: farmArtFor('cattle'),
    status: 'active',
    min_amount: 30000,
    max_amount: 25000000,
    expected_return_pct: 16.5,
    duration_months: 12,
    daily_return: 13.75,
    target_amount: 300000000,
    funded_amount: 215000000,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'farm-2',
    slug: 'rhineland-protein-feed',
    name: 'Rhineland Bio-Feed & Grain Mills',
    category: 'Animal Feeds',
    description:
      'State-of-the-art pelleting and nutrient-dense silage production facility supplying commercial livestock clusters across Western Germany.',
    location: 'North Rhine-Westphalia, Germany',
    image_url: farmArtFor('feeds'),
    status: 'active',
    min_amount: 15000,
    max_amount: 15000000,
    expected_return_pct: 13.8,
    duration_months: 6,
    daily_return: 11.5,
    target_amount: 180000000,
    funded_amount: 118000000,
    created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'farm-3',
    slug: 'saxon-broiler-poultry',
    name: 'Saxon Precision Broiler Farm',
    category: 'Broilers',
    description:
      'Automated climate-controlled poultry housing operating fast 60-day turnover cycles with pre-contracted supermarket distribution.',
    location: 'Saxony, Germany',
    image_url: farmArtFor('broilers'),
    status: 'active',
    min_amount: 20000,
    max_amount: 10000000,
    expected_return_pct: 15.2,
    duration_months: 3,
    daily_return: 33.78,
    target_amount: 140000000,
    funded_amount: 94000000,
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'farm-4',
    slug: 'alpine-simmental-cattle',
    name: 'Alpine Simmental Dairy & Cattle Herd',
    category: 'Cattle',
    description:
      'Dual-purpose high-yield Simmental herd on alpine pastures delivering stable monthly milk yield dividends and livestock valuation growth.',
    location: 'Upper Bavaria, Germany',
    image_url: farmArtFor('cattle'),
    status: 'active',
    min_amount: 30000,
    max_amount: 20000000,
    expected_return_pct: 14.0,
    duration_months: 9,
    daily_return: 15.56,
    target_amount: 220000000,
    funded_amount: 165000000,
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'farm-5',
    slug: 'danube-alfalfa-feed',
    name: 'Danube Alfalfa & High-Protein Pellets',
    category: 'Animal Feeds',
    description:
      'Commercial dehydrated alfalfa and high-protein grain processing plant with multi-season harvest storage and direct farm delivery logistics.',
    location: 'Danube Valley, Germany',
    image_url: farmArtFor('feeds'),
    status: 'active',
    min_amount: 15000,
    max_amount: 18000000,
    expected_return_pct: 12.5,
    duration_months: 8,
    daily_return: 7.81,
    target_amount: 160000000,
    funded_amount: 82000000,
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'farm-6',
    slug: 'brandenburg-organic-broilers',
    name: 'Brandenburg Organic Broiler Facility',
    category: 'Broilers',
    description:
      'Pasture-rotated organic broiler chicken enterprise producing certified free-range poultry for metropolitan retail distribution.',
    location: 'Brandenburg, Germany',
    image_url: farmArtFor('broilers'),
    status: 'active',
    min_amount: 20000,
    max_amount: 12000000,
    expected_return_pct: 17.0,
    duration_months: 4,
    daily_return: 28.33,
    target_amount: 175000000,
    funded_amount: 122500000,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'farm-7',
    slug: 'bavarian-ridge-pig-farm',
    name: 'Bavarian Ridge Modern Pig Farm',
    category: 'Pig Farming',
    description:
      'A modern bio-secure and free-range pig farming operation in the Bavarian countryside with pre-contracted premium pork supply agreements.',
    location: 'Lower Bavaria, Germany',
    image_url: farmArtFor('pig'),
    status: 'active',
    min_amount: 30000,
    max_amount: 15000000,
    expected_return_pct: 16.5,
    duration_months: 6,
    daily_return: 27.5,
    target_amount: 250000000,
    funded_amount: 145000000,
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
  },
]

interface AuthUser {
  id: string
  email: string
  password?: string
  user_metadata?: Record<string, any>
}

interface DBState {
  users: AuthUser[]
  profiles: Profile[]
  wallets: Wallet[]
  farm_projects: FarmProject[]
  investments: Investment[]
  transactions: Transaction[]
  referrals: Referral[]
  notifications: AppNotification[]
  videos: VideoItem[]
  platform_settings: { key: string; value: any; updated_at: string }[]
}

const STORAGE_KEY = 'feldwert_mock_db_v3_ugx'
const SESSION_KEY = 'feldwert_mock_session_v3'

function getInitialState(): DBState {
  const adminId = 'usr-admin-01'
  const demoId = 'usr-demo-01'

  // Current default lock is 3 days
  const userCreatedAt = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()

  return {
    users: [
      {
        id: adminId,
        email: 'admin@users.feldwert.de',
        password: 'password123',
        user_metadata: {
          username: 'admin',
          full_name: 'Administrator',
          phone: '+256 772 000001',
        },
      },
      {
        id: demoId,
        email: 'demo@users.feldwert.de',
        password: 'password123',
        user_metadata: {
          username: 'demo',
          full_name: 'Demo Investor',
          phone: '+256 775 432109',
        },
      },
    ],
    profiles: [
      {
        id: adminId,
        username: 'admin',
        full_name: 'Administrator',
        phone: '+256 772 000001',
        role: 'admin',
        status: 'active',
        is_admin: true,
        referral_code: 'FW-ADMIN1',
        referred_by: null,
        withdrawal_locked_until: null,
        created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: demoId,
        username: 'demo',
        full_name: 'Demo Investor',
        phone: '+256 775 432109',
        role: 'user',
        status: 'active',
        is_admin: false,
        referral_code: 'FW-DEMO88',
        referred_by: null,
        withdrawal_locked_until: null,
        created_at: userCreatedAt,
      },
    ],
    wallets: [
      {
        user_id: adminId,
        balance: 150000000,
        total_invested: 0,
        total_returns: 0,
        updated_at: new Date().toISOString(),
      },
      {
        user_id: demoId,
        balance: 4200000,
        total_invested: 1500000,
        total_returns: 247500,
        updated_at: new Date().toISOString(),
      },
    ],
    farm_projects: [...DEFAULT_FARMS],
    investments: [
      {
        id: 'inv-demo-1',
        user_id: demoId,
        farm_id: 'farm-1',
        amount: 1500000,
        status: 'active',
        expected_return: 247500,
        daily_return: 687.5,
        returns_claimed_through: null,
        earning_days: 0,
        accumulated_return: 0,
        claimable_return: 0,
        claimed_return: 0,
        reference: 'INV-DEMO1',
        start_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        maturity_date: new Date(Date.now() + 335 * 24 * 3600 * 1000).toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        farm: DEFAULT_FARMS[0],
      },
    ],
    transactions: [
      {
        id: 'tx-init-1',
        user_id: demoId,
        type: 'deposit',
        amount: 5700000,
        status: 'approved',
        reference: 'TX-MTN01',
        method: 'mtn_mobile_money',
        meta: { phone: '+256 775 432109', network: 'MTN', country: 'Uganda' },
        created_at: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'tx-init-2',
        user_id: demoId,
        type: 'investment',
        amount: 1500000,
        status: 'completed',
        reference: 'TX-INV01',
        method: 'wallet',
        meta: { farm_id: 'farm-1' },
        created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'tx-init-3',
        user_id: demoId,
        type: 'deposit',
        amount: 500000,
        status: 'pending',
        reference: 'TX-AIRTEL01',
        method: 'airtel_money',
        meta: { phone: '+256 702 987654', network: 'Airtel', country: 'Uganda' },
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
    referrals: [],
    notifications: [
      {
        id: 'notif-1',
        user_id: demoId,
        title: 'Welcome to Feldwert Capital',
        body: 'Your account is ready for Uganda Mobile Money deposits and farm investments.',
        read: false,
        created_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        user_id: demoId,
        title: 'Investment Confirmed',
        body: 'You invested UGX 1,500,000 in Bavarian Angus Cattle Breeding.',
        read: false,
        created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      },
    ],
    videos: [...DEFAULT_VIDEOS],
    platform_settings: [
      { key: 'referral_bonus_pct', value: 10, updated_at: new Date().toISOString() },
      { key: 'min_deposit', value: 10000, updated_at: new Date().toISOString() },
      { key: 'min_withdrawal', value: 10000, updated_at: new Date().toISOString() },
      { key: 'withdrawal_lock_days', value: 7, updated_at: new Date().toISOString() },
      { key: 'withdrawal_lock_enabled', value: true, updated_at: new Date().toISOString() },
      { key: 'currency', value: 'UGX', updated_at: new Date().toISOString() },
      { key: 'brand_name', value: 'Feldwert Capital', updated_at: new Date().toISOString() },
    ],
  }
}

function loadState(): DBState {
  if (typeof window === 'undefined') return getInitialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const init = getInitialState()
      saveState(init)
      return init
    }
    const parsed: DBState = JSON.parse(raw)
    parsed.referrals = parsed.referrals || []

    for (const profile of parsed.profiles || []) {
      if (typeof profile.full_name === 'string' && /anthony|mugenyi/i.test(profile.full_name)) {
        profile.full_name = 'Demo Investor'
      }
    }
    for (const user of parsed.users || []) {
      const fullName = user.user_metadata?.full_name
      if (typeof fullName === 'string' && /anthony|mugenyi/i.test(fullName)) {
        user.user_metadata = {
          ...(user.user_metadata || {}),
          full_name: 'Demo Investor',
        }
      }
    }

    // Ensure platform_settings has all required keys
    parsed.platform_settings = parsed.platform_settings || []
    const requiredKeys: Record<string, any> = {
      referral_bonus_pct: 10,
      min_deposit: 10000,
      min_withdrawal: 10000,
      withdrawal_lock_days: 7,
      withdrawal_lock_enabled: true,
      currency: 'UGX',
      brand_name: 'Feldwert Capital',
    }
    let modified = false
    for (const [k, defaultVal] of Object.entries(requiredKeys)) {
      const existing = parsed.platform_settings.find((s) => s.key === k)
      if (!existing) {
        parsed.platform_settings.push({ key: k, value: defaultVal, updated_at: new Date().toISOString() })
        modified = true
      }
    }
    if (modified) {
      saveState(parsed)
    }
    // Validate core collections are present so the marketplace and videos remain populated after a browser reset
    if (!parsed.farm_projects || parsed.farm_projects.length === 0) {
      parsed.farm_projects = [...DEFAULT_FARMS]
      modified = true
    }
    if (!parsed.videos || parsed.videos.length === 0) {
      parsed.videos = [...DEFAULT_VIDEOS]
      modified = true
    }
    if (modified) {
      saveState(parsed)
    }
    return parsed
  } catch {
    return getInitialState()
  }
}

function saveState(state: DBState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Failed to persist mock DB state', err)
  }
}

function getStoredSessionUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveStoredSessionUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  } catch {}
}

type AuthListener = (event: string, session: any) => void
const authListeners = new Set<AuthListener>()

function notifyAuthChange(event: string, session: any) {
  authListeners.forEach((l) => {
    try {
      l(event, session)
    } catch {}
  })
}

class MockQueryBuilder {
  private tableName: keyof DBState
  private filters: ((row: any) => boolean)[] = []
  private sortFn: ((a: any, b: any) => number) | null = null
  private limitCount: number | null = null
  private columns: string = '*'

  constructor(tableName: keyof DBState) {
    this.tableName = tableName
  }

  select(columns: string = '*') {
    this.columns = columns
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row: any) => row[column] === value)
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    const asc = options?.ascending ?? true
    this.sortFn = (a: any, b: any) => {
      const valA = a[column]
      const valB = b[column]
      if (valA < valB) return asc ? -1 : 1
      if (valA > valB) return asc ? 1 : -1
      return 0
    }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  private executeQuery(): any[] {
    const state = loadState()
    let data: any[] = (state[this.tableName] || []) as any[]

    for (const filter of this.filters) {
      data = data.filter(filter)
    }

    if (this.sortFn) {
      data = [...data].sort(this.sortFn)
    }

    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount)
    }

    // Handle join queries like profiles select('*, wallets(balance)')
    if (this.tableName === 'profiles' && this.columns.includes('wallets')) {
      data = data.map((p) => {
        const wallet = state.wallets.find((w) => w.user_id === p.id)
        return {
          ...p,
          wallets: wallet ? { balance: wallet.balance } : { balance: 0 },
        }
      })
    }

    // Attach farm object to investments if needed
    if (this.tableName === 'investments') {
      data = data.map((inv) => {
        const farm = state.farm_projects.find((f) => f.id === inv.farm_id)
        return { ...inv, farm: farm || inv.farm }
      })
    }

    return data
  }

  async single() {
    const rows = this.executeQuery()
    const item = rows[0] ?? null
    return { data: item, error: item ? null : { message: 'Row not found' } }
  }

  async maybeSingle() {
    const rows = this.executeQuery()
    return { data: rows[0] ?? null, error: null }
  }

  async insert(recordOrRecords: any) {
    const state = loadState()
    const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords]
    const list = (state[this.tableName] as any[]) || []

    const inserted: any[] = []
    for (const item of records) {
      const fullItem = {
        id: item.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: item.created_at || new Date().toISOString(),
        ...item,
      }
      list.unshift(fullItem)
      inserted.push(fullItem)
    }

    state[this.tableName] = list as any
    saveState(state)
    return { data: Array.isArray(recordOrRecords) ? inserted : inserted[0], error: null }
  }

  async update(patch: any) {
    const state = loadState()
    const currentUser = getStoredSessionUser()
    const currentProfile = currentUser ? state.profiles.find((p) => p.id === currentUser.id) : null

    if (this.tableName === 'platform_settings') {
      if (!currentProfile || (currentProfile.role !== 'admin' && !currentProfile.is_admin)) {
        return {
          data: null,
          error: { message: 'Unauthorized. Administrator privileges required to modify platform settings.' },
        }
      }
    }

    const list = (state[this.tableName] as any[]) || []
    let updatedCount = 0

    state[this.tableName] = list.map((item) => {
      let matches = true
      for (const filter of this.filters) {
        if (!filter(item)) {
          matches = false
          break
        }
      }
      if (matches) {
        updatedCount++
        return { ...item, ...patch, updated_at: new Date().toISOString() }
      }
      return item
    }) as any

    saveState(state)
    return { data: updatedCount, error: null }
  }

  async delete() {
    const state = loadState()
    const currentUser = getStoredSessionUser()
    const currentProfile = currentUser ? state.profiles.find((p) => p.id === currentUser.id) : null

    if (this.tableName === 'platform_settings') {
      if (!currentProfile || (currentProfile.role !== 'admin' && !currentProfile.is_admin)) {
        return {
          data: null,
          error: { message: 'Unauthorized. Administrator privileges required to modify platform settings.' },
        }
      }
    }

    const list = (state[this.tableName] as any[]) || []

    state[this.tableName] = list.filter((item) => {
      for (const filter of this.filters) {
        if (filter(item)) return false
      }
      return true
    }) as any

    saveState(state)
    return { data: null, error: null }
  }

  async upsert(recordOrRecords: any) {
    const state = loadState()
    const currentUser = getStoredSessionUser()
    const currentProfile = currentUser ? state.profiles.find((p) => p.id === currentUser.id) : null

    if (this.tableName === 'platform_settings') {
      if (!currentProfile || (currentProfile.role !== 'admin' && !currentProfile.is_admin)) {
        return {
          data: null,
          error: { message: 'Unauthorized. Administrator privileges required to modify platform settings.' },
        }
      }
    }

    const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords]
    const list = (state[this.tableName] as any[]) || []

    for (const r of records) {
      const keyProp = 'key' in r ? 'key' : 'id'
      const existingIdx = list.findIndex((item) => item[keyProp] === r[keyProp])
      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...r,
          updated_at: new Date().toISOString(),
        }
      } else {
        list.push({
          ...r,
          updated_at: new Date().toISOString(),
        })
      }
    }

    state[this.tableName] = list as any
    saveState(state)
    return { data: recordOrRecords, error: null }
  }

  then(resolve: (result: any) => void) {
    const data = this.executeQuery()
    resolve({ data, error: null })
  }
}

export const mockSupabase = {
  auth: {
    async getUser() {
      const user = getStoredSessionUser()
      return { data: { user }, error: null }
    },

    async getSession() {
      const user = getStoredSessionUser()
      return { data: { session: user ? { access_token: 'mock-token', user } : null }, error: null }
    },

    async signUp(params: {
      email?: string
      password?: string
      options?: { data?: Record<string, any> }
    }) {
      const state = loadState()
      const rawUser = params.options?.data?.username || 'user'
      const username = rawUser.toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const userId = `usr-${username}-${Date.now().toString(36)}`

      const existing = state.users.find((u) => u.email === params.email)
      if (existing) {
        return { data: { user: null, session: null }, error: { message: 'Username already taken' } }
      }

      const newUser: AuthUser = {
        id: userId,
        email: params.email || `${username}@users.feldwert.de`,
        password: params.password,
        user_metadata: {
          username,
          full_name: params.options?.data?.full_name || username,
          phone: params.options?.data?.phone || '',
        },
      }
      state.users.push(newUser)

      const refCode = `FW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const referralCode = String(
        params.options?.data?.referral_code || params.options?.data?.referred_by_code || ''
      ).trim()
      const referrerProfile = state.profiles.find(
        (profile) => profile.referral_code.toUpperCase() === referralCode.toUpperCase()
      )
      const newProfile: Profile = {
        id: userId,
        username,
        full_name: params.options?.data?.full_name || username,
        phone: params.options?.data?.phone || null,
        role: 'user',
        status: 'active',
        is_admin: false,
        referral_code: refCode,
        referred_by: referrerProfile && referrerProfile.id !== userId ? referrerProfile.id : null,
        withdrawal_locked_until: null,
        created_at: new Date().toISOString(),
      }
      state.profiles.push(newProfile)

      const newWallet: Wallet = {
        user_id: userId,
        balance: 0,
        total_invested: 0,
        total_returns: 0,
        updated_at: new Date().toISOString(),
      }
      state.wallets.push(newWallet)

      state.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: userId,
        title: 'Account Created',
        body: 'Welcome to Feldwert Capital. Deposit funds via MTN or Airtel Mobile Money to begin investing.',
        read: false,
        created_at: new Date().toISOString(),
      })

      saveState(state)
      saveStoredSessionUser(newUser)

      const session = { access_token: 'mock-token', user: newUser }
      notifyAuthChange('SIGNED_IN', session)
      return { data: { user: newUser, session }, error: null }
    },

    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      const state = loadState()
      const normalized = email.toLowerCase().trim()
      const user = state.users.find(
        (u) =>
          u.email.toLowerCase() === normalized ||
          u.user_metadata?.username?.toLowerCase() === normalized
      )

      if (!user) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        }
      }

      if (user.password !== password) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        }
      }

      saveStoredSessionUser(user)
      const session = { access_token: 'mock-token', user }
      notifyAuthChange('SIGNED_IN', session)
      return { data: { user, session }, error: null }
    },

    async signOut() {
      saveStoredSessionUser(null)
      notifyAuthChange('SIGNED_OUT', null)
      return { error: null }
    },

    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback)
            },
          },
        },
      }
    },

    async resetPasswordForEmail(email: string) {
      console.log('[MockSupabase] Password reset sent to', email)
      return { error: null }
    },
  },

  from(tableName: keyof DBState) {
    return new MockQueryBuilder(tableName)
  },

  async rpc(fnName: string, args?: Record<string, any>) {
    const state = loadState()
    const currentUser = getStoredSessionUser()
    const userId = currentUser?.id

    if (fnName === 'request_funds' || fnName === 'request_deposit') {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } }
      const rawType = fnName === 'request_deposit' ? 'deposit' : String(args?.p_type || 'deposit')
      const p_type: 'deposit' | 'withdrawal' = rawType.toLowerCase().startsWith('withdraw') ? 'withdrawal' : 'deposit'
      const p_amount = Number(args?.p_amount)
      const p_method = (args?.p_method as string) || 'mtn_mobile_money'
      const p_phone = (args?.p_phone as string) || ''
      const p_reference = (args?.p_reference as string) || ''

      if (p_amount <= 0 || isNaN(p_amount)) {
        return { data: null, error: { message: 'Please enter a valid amount greater than UGX 0.' } }
      }

      // Check configured minimum
      const minKey = p_type === 'deposit' ? 'min_deposit' : 'min_withdrawal'
      const minSetting = state.platform_settings.find((s) => s.key === minKey)
      const minVal = Number(minSetting?.value ?? 10000)

      if (p_amount < minVal) {
        return {
          data: null,
          error: {
            message: `Minimum ${p_type} is UGX ${minVal.toLocaleString('en-US')}.`,
          },
        }
      }

      const userProfile = state.profiles.find((p) => p.id === userId)
      if (userProfile?.status === 'blocked') {
        return { data: null, error: { message: 'Your account is restricted. Contact support.' } }
      }

      if (p_type === 'withdrawal') {
        const wallet = state.wallets.find((w) => w.user_id === userId)
        if (!wallet || wallet.balance < p_amount) {
          return {
            data: null,
            error: {
              message: `Insufficient withdrawable balance. Available: UGX ${(wallet?.balance ?? 0).toLocaleString('en-US')}.`,
            },
          }
        }
      }

      const methodLabel = p_method === 'airtel_money' ? 'Airtel Money' : 'MTN Mobile Money'
      const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      const tx: Transaction = {
        id: txId,
        user_id: userId,
        type: p_type,
        amount: p_amount,
        status: 'pending',
        reference:
          p_reference ||
          `TX-${p_method === 'airtel_money' ? 'AIR' : 'MTN'}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        method: p_method,
        meta: {
          phone: p_phone,
          provider: methodLabel,
          country: 'Uganda',
          network: p_method === 'airtel_money' ? 'Airtel' : 'MTN',
        },
        created_at: new Date().toISOString(),
      }
      state.transactions.unshift(tx)

      state.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: userId,
        title: `${p_type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request Submitted`,
        body: `Your ${p_type} of UGX ${p_amount.toLocaleString('en-US')} via ${methodLabel} (${p_phone}) is pending verification.`,
        read: false,
        created_at: new Date().toISOString(),
      })

      saveState(state)
      return {
        data:
          fnName === 'request_deposit'
            ? tx
            : `Request submitted — your ${p_type} of UGX ${p_amount.toLocaleString('en-US')} via ${methodLabel} is pending review.`,
        error: null,
      }
    }

    if (fnName === 'admin_review_funds') {
      const p_tx_id = args?.p_tx_id
      const isApproved = args?.p_approve === true || args?.p_action === 'approve'
      const tx = state.transactions.find((t) => t.id === p_tx_id)

      if (!tx) return { data: null, error: { message: 'Transaction not found' } }

      tx.status = isApproved ? 'approved' : 'rejected'
      const wallet = state.wallets.find((w) => w.user_id === tx.user_id)

      if (isApproved && wallet) {
        if (tx.type === 'deposit') {
          wallet.balance += Number(tx.amount)

          const investorProfile = state.profiles.find((profile) => profile.id === tx.user_id)
          const referrerProfile = investorProfile?.referred_by
            ? state.profiles.find((profile) => profile.id === investorProfile.referred_by)
            : null
          const setting = state.platform_settings.find((row) => row.key === 'referral_bonus_pct')
          const bonusPct = Math.max(0, Math.min(100, Number(setting?.value ?? 10)))
          const bonusAmount = Math.round((Number(tx.amount) * bonusPct) / 100)
          const alreadyPaid = state.transactions.some(
            (transaction) =>
              transaction.type === 'referral_bonus' &&
              String((transaction.meta as any)?.source_deposit_id) === String(tx.id)
          )

          if (referrerProfile && referrerProfile.id !== tx.user_id) {
            const referral: Referral = {
              id: `ref-${tx.id}`,
              referrer_id: referrerProfile.id,
              referred_id: tx.user_id,
              bonus_amount: bonusAmount,
              status: 'approved',
              created_at: new Date().toISOString(),
            }
            const existingReferral = state.referrals.find(
              (row) => row.referrer_id === referral.referrer_id && row.referred_id === referral.referred_id
            )
            if (existingReferral) {
              existingReferral.bonus_amount = bonusAmount
              existingReferral.status = 'approved'
            } else {
              state.referrals.unshift(referral)
            }

            if (bonusAmount > 0 && !alreadyPaid) {
              const referrerWallet = state.wallets.find((row) => row.user_id === referrerProfile.id)
              if (referrerWallet) {
                referrerWallet.balance += bonusAmount
                referrerWallet.total_returns += bonusAmount
                referrerWallet.updated_at = new Date().toISOString()
              }
              state.transactions.unshift({
                id: `tx-ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                user_id: referrerProfile.id,
                type: 'referral_bonus',
                amount: bonusAmount,
                status: 'completed',
                reference: `REF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                method: 'wallet',
                meta: {
                  source_deposit_id: tx.id,
                  referred_id: tx.user_id,
                  deposit_amount: Number(tx.amount),
                  bonus_pct: bonusPct,
                },
                created_at: new Date().toISOString(),
              })
            }
          }
        } else if (tx.type === 'withdrawal') {
          wallet.balance = Math.max(0, wallet.balance - Number(tx.amount))
        }
        wallet.updated_at = new Date().toISOString()
      }

      state.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: tx.user_id,
        title: isApproved ? `${tx.type} Approved` : `${tx.type} Rejected`,
        body: isApproved
          ? `Your ${tx.type} of UGX ${Number(tx.amount).toLocaleString('en-US')} has been approved.`
          : `Your ${tx.type} of UGX ${Number(tx.amount).toLocaleString('en-US')} was rejected.`,
        read: false,
        created_at: new Date().toISOString(),
      })

      saveState(state)
      return { data: null, error: null }
    }

    if (fnName === 'award_signup_bonus') {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } }

      let wallet = state.wallets.find((w) => w.user_id === userId)
      if (!wallet) {
        wallet = {
          user_id: userId,
          balance: 0,
          total_invested: 0,
          total_returns: 0,
          updated_at: new Date().toISOString(),
        }
        state.wallets.push(wallet)
      }

      const alreadyAwarded = state.transactions.some(
        (t) => t.user_id === userId && t.type === 'adjustment' && String((t.meta as any)?.signup_bonus) === 'true'
      )

      if (!alreadyAwarded) {
        wallet.balance += 5000
        wallet.updated_at = new Date().toISOString()
        state.transactions.unshift({
          id: `tx-bonus-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          type: 'adjustment',
          amount: 5000,
          status: 'completed',
          reference: `BONUS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          method: 'wallet',
          meta: { signup_bonus: true, reason: 'welcome_bonus', bonus_type: 'initial_account_bonus' },
          created_at: new Date().toISOString(),
        })
      }

      saveState(state)
      return { data: { awarded: true, balance: wallet.balance }, error: null }
    }

    if (fnName === 'credit_daily_investment_rewards') {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } }
      return { data: { ok: true }, error: null }
    }

    if (fnName === 'sync_investment_return_accruals') {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } }
      const lockSetting = state.platform_settings.find((setting) => setting.key === 'withdrawal_lock_days')
      const lockEnabledSetting = state.platform_settings.find((setting) => setting.key === 'withdrawal_lock_enabled')
      const lockEnabled = lockEnabledSetting ? Boolean(lockEnabledSetting.value) : true
      const lockDays = lockEnabled ? Math.max(0, Number(lockSetting?.value ?? 0)) : 0
      const dayMs = 86400000

      for (const investment of state.investments.filter((item) => item.status === 'active')) {
        const farm = state.farm_projects.find((item) => item.id === investment.farm_id)
        if (!farm) continue
        const startDay = new Date(investment.start_date || investment.created_at).setHours(0, 0, 0, 0)
        const currentDay = new Date().setHours(0, 0, 0, 0)
        const maturityDay = new Date(investment.maturity_date || Date.now()).setHours(0, 0, 0, 0)
        const daysSinceStart = Math.max(0, Math.floor((Math.min(currentDay, maturityDay) - startDay) / dayMs) + 1)
        const reward = Number(investment.daily_return || 0)
        const accumulated = Math.round(reward * daysSinceStart * 100) / 100

        investment.earning_days = daysSinceStart
        investment.accumulated_return = accumulated

        const startTime = new Date(investment.start_date || investment.created_at).getTime()
        const firstRewardTime = startTime + lockDays * dayMs
        const isLocked = Date.now() < firstRewardTime
        investment.claimable_return = isLocked
          ? 0
          : Math.max(0, accumulated - Number(investment.claimed_return || 0))
      }
      saveState(state)
      return { data: { ok: true }, error: null }
    }

    if (fnName === 'claim_investment_returns') {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } }
      const investment = state.investments.find(
        (inv) => inv.id === args?.p_investment_id && inv.user_id === userId
      )
      if (!investment) return { data: null, error: { message: 'Investment not found' } }
      if (investment.status !== 'active') return { data: null, error: { message: 'Investment is not active' } }

      const farm = state.farm_projects.find((f) => f.id === investment.farm_id)
      if (!farm) return { data: null, error: { message: 'Investment program not found' } }

      const lockSetting = state.platform_settings.find((setting) => setting.key === 'withdrawal_lock_days')
      const lockEnabledSetting = state.platform_settings.find((setting) => setting.key === 'withdrawal_lock_enabled')
      const lockEnabled = lockEnabledSetting ? Boolean(lockEnabledSetting.value) : true
      const lockDays = lockEnabled ? Math.max(0, Number(lockSetting?.value ?? 0)) : 0
      const startTime = new Date(investment.start_date || investment.created_at).getTime()
      const firstRewardTime = startTime + lockDays * 86400000

      if (Date.now() < firstRewardTime) {
        return {
          data: null,
          error: {
            message: `Returns claim locked until ${new Date(firstRewardTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
          },
        }
      }

      const reward = Number(investment.daily_return || 0)
      if (reward <= 0) return { data: 0, error: null }

      const dayMs = 86400000
      const startDay = new Date(investment.start_date || investment.created_at).setHours(0, 0, 0, 0)
      const currentDay = new Date().setHours(0, 0, 0, 0)
      const maturityDay = new Date(investment.maturity_date || Date.now()).setHours(0, 0, 0, 0)
      const daysSinceStart = Math.max(0, Math.floor((Math.min(currentDay, maturityDay) - startDay) / dayMs) + 1)
      investment.earning_days = daysSinceStart
      investment.accumulated_return = Math.round(reward * daysSinceStart * 100) / 100

      const claimableAmount = Math.max(
        0,
        Math.round((investment.accumulated_return - Number(investment.claimed_return || 0)) * 100) / 100
      )

      if (claimableAmount <= 0) {
        return { data: 0, error: { message: 'No new daily returns available to claim at this time.' } }
      }

      const wallet = state.wallets.find((w) => w.user_id === userId)
      if (wallet) {
        wallet.balance += claimableAmount
        wallet.total_returns += claimableAmount
        wallet.updated_at = new Date().toISOString()
      }

      const claimedThrough = new Date().toISOString().slice(0, 10)
      investment.returns_claimed_through = claimedThrough
      investment.claimed_return = Number(investment.claimed_return || 0) + claimableAmount
      investment.claimable_return = 0

      state.transactions.unshift({
        id: `tx-reward-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        type: 'return',
        amount: claimableAmount,
        status: 'completed',
        reference: `REWARD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        method: 'wallet',
        meta: {
          investment_id: investment.id,
          farm_id: farm.id,
          farm_name: farm.name,
          daily_return: reward,
          earning_days: daysSinceStart,
          source: 'daily_reward_claim',
        },
        created_at: new Date().toISOString(),
      })

      saveState(state)
      return { data: claimableAmount, error: null }
    }

    if (fnName === 'create_investment') {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } }
      const p_project_id = args?.p_project_id
      const p_amount = Number(args?.p_amount)

      const farm = state.farm_projects.find((f) => f.id === p_project_id)
      if (!farm) return { data: null, error: { message: 'Investment program not found' } }
      if (p_amount < farm.min_amount) {
        return { data: null, error: { message: `Minimum investment is UGX ${farm.min_amount.toLocaleString('en-US')}.` } }
      }

      const wallet = state.wallets.find((w) => w.user_id === userId)
      if (!wallet || wallet.balance < p_amount) {
        return { data: null, error: { message: 'Insufficient wallet balance' } }
      }

      const invId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      const dailyReturn = Number(
        farm.daily_return && farm.min_amount > 0
          ? Math.round(farm.daily_return * (p_amount / farm.min_amount) * 100) / 100
          : Math.round(
              (p_amount * (farm.expected_return_pct || 14)) /
                (100 * (farm.duration_months || 1) * 30) * 100
            ) / 100
      )
      const expReturn = Math.round(dailyReturn * (farm.duration_months || 1) * 30 * 100) / 100
      wallet.balance -= p_amount
      wallet.total_invested += p_amount
      wallet.updated_at = new Date().toISOString()

      farm.funded_amount += p_amount
      if (farm.target_amount > 0 && farm.funded_amount >= farm.target_amount) {
        farm.status = 'funded'
      }
      const inv: Investment = {
        id: invId,
        user_id: userId,
        farm_id: farm.id,
        amount: p_amount,
        status: 'active',
        expected_return: expReturn,
        daily_return: dailyReturn,
        returns_claimed_through: null,
        earning_days: 0,
        accumulated_return: 0,
        claimable_return: 0,
        claimed_return: 0,
        reference: `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        start_date: new Date().toISOString(),
        maturity_date: new Date(
          Date.now() + (farm.duration_months || 12) * 30 * 24 * 3600 * 1000
        ).toISOString(),
        created_at: new Date().toISOString(),
        farm,
      }
      state.investments.unshift(inv)

      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        type: 'investment',
        amount: p_amount,
        status: 'completed',
        reference: `INV-${invId.substring(4, 10).toUpperCase()}`,
        method: 'wallet',
        meta: { farm_id: farm.id, farm_name: farm.name },
        created_at: new Date().toISOString(),
      }
      state.transactions.unshift(tx)

      state.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: userId,
        title: 'Investment Confirmed',
        body: `You invested UGX ${p_amount.toLocaleString('en-US')} in ${farm.name}.`,
        read: false,
        created_at: new Date().toISOString(),
      })

      saveState(state)
      return { data: invId, error: null }
    }

    return { data: null, error: null }
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File | Blob) {
          try {
            // For mock preview, convert File/Blob to object URL or data URL
            let url = ''
            if (file instanceof File || file instanceof Blob) {
              url = URL.createObjectURL(file)
            } else {
              url = `https://storage.feldwert.de/${bucket}/${path}`
            }
            return { data: { path, fullPath: `${bucket}/${path}`, url }, error: null }
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Upload failed' } }
          }
        },
        getPublicUrl(path: string) {
          // If path is already a full URL or blob URL, return it
          if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
            return { data: { publicUrl: path } }
          }
          return {
            data: {
              publicUrl: `https://storage.feldwert.de/${bucket}/${path}`,
            },
          }
        },
      }
    },
  },
}
