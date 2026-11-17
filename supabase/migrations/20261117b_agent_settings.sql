-- Repetitor: Telegram eslatma sozlamalari (faqat service role; saytdan o'qilmaydi)
create table if not exists public.agent_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tg_chat_id bigint,
  reminded_on date,
  updated_at timestamptz not null default now()
);
alter table public.agent_settings enable row level security;
revoke all on public.agent_settings from anon, authenticated;
comment on table public.agent_settings is 'Repetitor agenti: Telegram chat id va oxirgi kechki eslatma kuni. Faqat repetitor funksiyasi (service role) ishlatadi.';

-- Kechki eslatma: har kuni 20:00 (Toshkent) = 15:00 UTC
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('repetitor-kechki-eslatma', '0 15 * * *',
  $$ select net.http_post(url := 'https://rqeirdempadfwirefyit.supabase.co/functions/v1/repetitor/remind', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb) $$);
