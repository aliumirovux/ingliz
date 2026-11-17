-- «Bugungi sahna»: har kuni bitta hayotiy vaziyat (dialog, 2 gap, rolli suhbat). Claude yozadi (sahna funksiyasi), sayt o'qiydi va progressni saqlaydi.
create table if not exists public.scenes (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  scene jsonb not null,
  progress jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  primary key (user_id, day)
);
alter table public.scenes enable row level security;
create policy "scenes o'ziniki: o'qish" on public.scenes for select to authenticated using (user_id = (select auth.uid()));
create policy "scenes o'ziniki: progress" on public.scenes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.scenes from anon, authenticated;
grant select on public.scenes to authenticated;
grant update (progress, done_at) on public.scenes to authenticated;
-- sahnadagi ovozli javoblar ham gapirish daqiqalariga qo'shiladi
alter table public.speak_log drop constraint if exists speak_log_src_check;
alter table public.speak_log add constraint speak_log_src_check check (src in ('dars', 'rep', 'sahna'));
