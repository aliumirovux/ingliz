-- pg_cron job'lari (repetitor/remind va dars/tick) uchun avtomatik generatsiya qilinadigan cron_key.
-- agent_settings jadvali anon/authenticated dan yopilgan (faqat service_role va Postgres pg_cron o'qiy oladi).
alter table public.agent_settings
  add column if not exists cron_key text not null default encode(extensions.gen_random_bytes(32), 'hex');

select cron.schedule(
  'repetitor-kechki-eslatma',
  '0 15 * * *',
  $$ select net.http_post(
    url := 'https://rqeirdempadfwirefyit.supabase.co/functions/v1/repetitor/remind',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select cron_key from public.agent_settings limit 1)
    ),
    body := '{}'::jsonb
  ) $$
);

select cron.schedule(
  'dars-ishlov',
  '* * * * *',
  $$ select net.http_post(
    url := 'https://rqeirdempadfwirefyit.supabase.co/functions/v1/dars/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select cron_key from public.agent_settings limit 1)
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from public.class_lessons
    where (status in ('queued', 'transcribing', 'analyzing') and (locked_until is null or locked_until < now()))
       or (audio_path is not null and created_at < now() - interval '3 days')) $$
);
