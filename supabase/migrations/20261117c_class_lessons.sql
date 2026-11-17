-- «Dars tahlili»: Inter Nation darsining yozuvi → Gemini (matn, ikki ovoz) → Claude (xatolar, mazmun).
-- Yozuvni faqat egasi (Ali) yuklaydi; ishlov «dars» edge function'da (service role). Audio matnga o'girilgach o'chiriladi.

create table if not exists public.class_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Tashkent')::date),
  status text not null default 'uploading'
    check (status in ('uploading', 'queued', 'transcribing', 'analyzing', 'done', 'error')),
  audio_path text,            -- dars-audio bucket ichida «<uid>/<id>.<ext>»; o'chirilgach null
  audio_bytes bigint,
  duration_s int,
  mime text,
  gemini_file text,           -- files/abc… (48 soatda o'zi ham o'chadi; biz darhol o'chiramiz)
  gemini_uri text,
  transcript jsonb,           -- {turns: [{t: "MM:SS", s: "T"|"S", x}], model}
  analysis jsonb,             -- {headline, said, rules[], mistakes[], content{}, model}
  answers jsonb not null default '{}'::jsonb,   -- sayt: xatoni qayta yozish natijalari {m0: {ok, a}}
  marks jsonb not null default '[]'::jsonb,     -- saytda yozishda «Muhim» bosilgan soniyalar
  photos jsonb not null default '[]'::jsonb,    -- doska rasmlari [{path, t}] (dars-rasm bucket), tahlildan keyin ham qoladi
  attempts int not null default 0,
  error text,
  locked_until timestamptz,
  audio_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists class_lessons_user_created on public.class_lessons (user_id, created_at desc);
create index if not exists class_lessons_active on public.class_lessons (status) where status in ('queued', 'transcribing', 'analyzing');

alter table public.class_lessons enable row level security;
drop policy if exists "class_lessons own select" on public.class_lessons;
create policy "class_lessons own select" on public.class_lessons for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "class_lessons own update" on public.class_lessons;
create policy "class_lessons own update" on public.class_lessons for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.class_lessons from anon, authenticated;
grant select on public.class_lessons to authenticated;
grant update (answers) on public.class_lessons to authenticated;

-- navbatdan bitta ishni olish (bir vaqtda ikki ishlovchi bir ishni olmasin)
create or replace function public.dars_claim()
returns setof public.class_lessons
language sql security definer set search_path = public as $$
  update public.class_lessons
     set locked_until = now() + interval '170 seconds', attempts = attempts + 1, updated_at = now()
   where id = (
     select id from public.class_lessons
      where status in ('queued', 'transcribing', 'analyzing')
        and (locked_until is null or locked_until < now())
      order by created_at
      limit 1
      for update skip locked)
  returning *;
$$;
revoke execute on function public.dars_claim() from public, anon, authenticated;
grant execute on function public.dars_claim() to service_role;

-- audio uchun yopiq bucket: 50 MB gacha, faqat audio; faqat egasi o'z papkasiga yozadi
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dars-audio', 'dars-audio', false, 52428800,
        array['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/opus', 'audio/webm', 'audio/flac'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dars-audio owner insert" on storage.objects;
create policy "dars-audio owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'dars-audio' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select auth.uid()) = '6cc7d3c7-d237-486e-94f8-3f951a0437c2'::uuid);
drop policy if exists "dars-audio owner select" on storage.objects;
create policy "dars-audio owner select" on storage.objects for select to authenticated
  using (bucket_id = 'dars-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- doska rasmlari: yopiq bucket, 6 MB gacha JPEG; faqat egasi o'z papkasiga
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dars-rasm', 'dars-rasm', false, 6291456, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "dars-rasm owner insert" on storage.objects;
create policy "dars-rasm owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'dars-rasm' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select auth.uid()) = '6cc7d3c7-d237-486e-94f8-3f951a0437c2'::uuid);
drop policy if exists "dars-rasm owner select" on storage.objects;
create policy "dars-rasm owner select" on storage.objects for select to authenticated
  using (bucket_id = 'dars-rasm' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- har daqiqa: navbatda ish bo'lsa ishlovchini uyg'otadi (ish bo'lmasa so'rov yuborilmaydi)
select cron.unschedule('dars-ishlov') where exists (select 1 from cron.job where jobname = 'dars-ishlov');
select cron.schedule('dars-ishlov', '* * * * *', $cron$
  select net.http_post(
    url := 'https://rqeirdempadfwirefyit.supabase.co/functions/v1/dars/tick',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb)
  where exists (select 1 from public.class_lessons
                 where (status in ('queued', 'transcribing', 'analyzing') and (locked_until is null or locked_until < now()))
                    or (audio_path is not null and created_at < now() - interval '3 days'));
$cron$);
