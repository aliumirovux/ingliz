-- agent_lessons: evaluate auth.uid() once per query instead of once per row (Supabase advisor "auth_rls_initplan").
-- Same rules as before: the owner reads and answers only their own lessons.
alter policy "agent_lessons: egasi o'qiydi" on public.agent_lessons
  using (user_id = (select auth.uid()));

alter policy "agent_lessons: egasi javob yozadi" on public.agent_lessons
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
