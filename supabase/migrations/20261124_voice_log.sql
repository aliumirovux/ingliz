-- Voice diagnostics (owner only): one row per playback — which engine spoke, how far it got, and what ended it.
create table if not exists public.voice_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  eng text not null check (eng in ('apollo', 'synth', 'chirp')),
  txt text check (char_length(txt) <= 120),
  route text check (char_length(route) <= 60),
  exp_ms int not null default 0 check (exp_ms between 0 and 600000),
  got_ms int not null default 0 check (got_ms between 0 and 600000),
  why text check (char_length(why) <= 120),
  ua text check (char_length(ua) <= 200)
);
create index if not exists voice_log_user_at on public.voice_log (user_id, at desc);
alter table public.voice_log enable row level security;
create policy "voice_log own: read" on public.voice_log for select to authenticated using (user_id = (select auth.uid()));
create policy "voice_log own: insert" on public.voice_log for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.voice_log from anon, authenticated;
grant select, insert on public.voice_log to authenticated;
