-- «Darsdagi lahza» va repetitor «Gapirish»: ovoz chiqarib mashq natijalari va gapirish soniyalari
create table if not exists public.speak_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Asia/Tashkent')::date),
  src text not null check (src in ('dars', 'rep')),
  lesson_id uuid,
  item text check (char_length(item) <= 300),
  lat_ms int check (lat_ms between 0 and 120000),
  hints smallint not null default 0 check (hints between 0 and 3),
  score smallint check (score between 0 and 100),
  secs int not null default 0 check (secs between 0 and 3600)
);
create index if not exists speak_log_user_at on public.speak_log (user_id, at desc);
alter table public.speak_log enable row level security;
create policy "speak_log o'ziniki: o'qish" on public.speak_log for select to authenticated using (user_id = (select auth.uid()));
create policy "speak_log o'ziniki: yozish" on public.speak_log for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.speak_log from anon, authenticated;
grant select, insert on public.speak_log to authenticated;
