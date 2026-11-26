-- Shadowing (#soya): abzatsni diktor bilan birga aytish natijalari va gapirish soniyalari ham «Bu hafta gapirdingiz» hisobiga qo'shiladi
alter table public.speak_log drop constraint if exists speak_log_src_check;
alter table public.speak_log add constraint speak_log_src_check check (src in ('dars', 'rep', 'sahna', 'call', 'soya'));
