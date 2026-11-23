-- Multi-user learner profiles (display name, level, topic preferences, AI quota).
-- Users can read/update only their own display_name, level, and avoid_topics;
-- allow_ai and ai_daily_limit are managed exclusively by service_role.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  level text not null default 'beginner'
    check (level in ('zero', 'beginner', 'elementary', 'pre', 'inter', 'upper', 'adv')),
  avoid_topics text[] not null default '{}',
  allow_ai boolean not null default false,
  ai_daily_limit int not null default 120 check (ai_daily_limit between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id and allow_ai = false and ai_daily_limit = 120);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (user_id, display_name, level, avoid_topics) on public.profiles to authenticated;
grant update (display_name, level, avoid_topics) on public.profiles to authenticated;

insert into public.profiles (user_id, display_name, level, avoid_topics, allow_ai, ai_daily_limit)
values (
  '6cc7d3c7-d237-486e-94f8-3f951a0437c2',
  'Ali',
  'beginner',
  array['job', 'office', 'design', 'company'],
  true,
  120
)
on conflict (user_id) do nothing;
