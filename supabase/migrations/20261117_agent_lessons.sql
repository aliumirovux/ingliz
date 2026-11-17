-- «Repetitor» agenti (Claude Console Managed Agent) har kuni ertalab yozadigan shaxsiy dars.
-- Agent yozadi (repetitor edge function, service role orqali). Sayt faqat o'z egasining darsini o'qiydi
-- va faqat javoblar (answers, done_at) ustunini yangilaydi.
create table if not exists public.agent_lessons (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  lesson jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.agent_lessons enable row level security;

create policy "agent_lessons: egasi o'qiydi" on public.agent_lessons
  for select to authenticated using (user_id = auth.uid());

create policy "agent_lessons: egasi javob yozadi" on public.agent_lessons
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- foydalanuvchi faqat javob ustunlarini o'zgartira oladi; darsning o'zini faqat agent (service role) yozadi
revoke insert, update, delete on public.agent_lessons from anon, authenticated;
grant select on public.agent_lessons to authenticated;
grant update (answers, done_at) on public.agent_lessons to authenticated;

comment on table public.agent_lessons is 'Repetitor agenti tayyorlagan kunlik shaxsiy dars (faqat Ali). Agent yozadi, sayt javoblarni saqlaydi.';
