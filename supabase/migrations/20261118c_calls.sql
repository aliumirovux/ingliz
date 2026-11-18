-- «Repetitorga qo'ng'iroq»: 5 daqiqalik ovozli suhbat. Har gap: Gemini (so'zma-so'z matn) → Claude (javob va tuzatish).
-- Qatorni «suhbat» edge function yozadi (service role). Sayt o'z qo'ng'iroqlarini o'qiydi va faqat «off» ni
-- o'zgartiradi (noto'g'ri eshitilgan tuzatishni «Bu xato emas» deb belgilash). Ovoz saqlanmaydi, faqat matn.
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Tashkent')::date),
  topic text check (char_length(topic) <= 80),
  turns jsonb not null default '[]'::jsonb,   -- [{r: "T"|"S", x: "gap", uz?: "tarjima"}]
  fixes jsonb not null default '[]'::jsonb,   -- [{you, fix, why, topic}]
  off jsonb not null default '[]'::jsonb,     -- fixes ichidagi «bu xato emas» deb belgilanganlar indekslari
  n_turns smallint not null default 0,        -- serverga kelgan gaplar soni (chegara uchun)
  secs int not null default 0 check (secs between 0 and 3600),  -- Ali gapirgan soniyalar
  model text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists calls_user_day on public.calls (user_id, day desc, created_at desc);

alter table public.calls enable row level security;
drop policy if exists "calls o'ziniki: o'qish" on public.calls;
create policy "calls o'ziniki: o'qish" on public.calls for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "calls o'ziniki: off" on public.calls;
create policy "calls o'ziniki: off" on public.calls for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.calls from anon, authenticated;
grant select on public.calls to authenticated;
grant update (off) on public.calls to authenticated;

comment on table public.calls is 'Repetitorga ovozli qo''ng''iroqlar (faqat Ali): gaplar matni va tuzatishlar. Ovoz saqlanmaydi.';

-- qo'ng'iroqdagi gapirish soniyalari ham «Bu hafta gapirdingiz» hisobiga qo'shiladi
alter table public.speak_log drop constraint if exists speak_log_src_check;
alter table public.speak_log add constraint speak_log_src_check check (src in ('dars', 'rep', 'sahna', 'call'));
