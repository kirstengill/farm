-- ============================================================
-- Videos Table & RLS Policies for Feldwert Capital
-- ============================================================

create table if not exists public.videos (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null default '',
  category text not null default 'Platform Guide',
  duration text not null default '3:00',
  thumbnail_url text not null default '',
  video_url text not null default '',
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.videos enable row level security;

-- All users (authenticated and anonymous) can read published videos, or admin can read all
create policy "videos_select_policy" on public.videos
  for select using (published = true or public.is_admin());

-- Only admins can insert, update, or delete videos
create policy "videos_admin_write_policy" on public.videos
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed initial educational and investor guidance videos
insert into public.videos (id, title, description, category, duration, thumbnail_url, video_url, published, sort_order)
values
  ('vid-1', 'Welcome to Feldwert Capital & Agricultural Fintech', 'A comprehensive introduction to our institutional-grade agricultural investment ecosystem, capital protection, and real-asset backing.', 'Getting Started', '2:45', 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', true, 1),
  ('vid-2', 'How Cattle & Pasture Breeding Yields Work', 'Discover how Angus and Simmental breeding herds deliver biometric weight gains, calving multipliers, and consistent quarterly revenue.', 'Investment Programs', '3:50', 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', true, 2),
  ('vid-3', 'MTN & Airtel Mobile Money Deposit Guide', 'Step-by-step walkthrough on depositing Ugandan Shillings (UGX) via USSD merchant codes (*165*3# & *185*9#) with instantaneous verification.', 'Deposits & Withdrawals', '3:15', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', true, 3),
  ('vid-4', 'Animal Feeds Milling & Processing Economics', 'How grain processing, high-protein pellets, and essential agricultural supply chains create defensive, non-correlated investment returns.', 'How Investing Works', '4:10', 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', true, 4),
  ('vid-5', 'Broiler Poultry Fast-Turnover Cycles & Biosecurity', 'Inside automated climate-controlled broiler units: rapid 60-day turnover cycles, strict isolation, and pre-negotiated retail contracts.', 'Investment Programs', '4:45', 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4', true, 5),
  ('vid-6', 'Security Safeguards & Capital Holding Protocols', 'Detailed overview of the 7-day security holding rule, anti-fraud verifications, and how capital reserves protect your portfolio.', 'Platform Guide', '3:20', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', true, 6)
on conflict (id) do nothing;
