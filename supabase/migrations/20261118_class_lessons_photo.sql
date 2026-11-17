-- «Dars tahlili»: yozuvsiz dars — faqat doska rasmlari (Claude o'qiydi, Gemini ishlatilmaydi).
-- kind = 'photo' qatorlari start'dan keyin darhol 'analyzing' ga o'tadi; tasdiqlangan so'z/qoidalar answers.review da.
alter table public.class_lessons add column if not exists kind text not null default 'audio';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'class_lessons_kind_check') then
    alter table public.class_lessons add constraint class_lessons_kind_check check (kind in ('audio', 'photo'));
  end if;
end $$;
