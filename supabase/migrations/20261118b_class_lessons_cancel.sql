-- «Dars tahlili»: ishlovni bekor qilish — yangi holat «cancelled» (yozuv 3 kun turadi, qayta boshlasa bo'ladi).
-- Ishlovchi «cancelled» qatorni qayta yozmaydi (dars funksiyasidagi patch: status=neq.cancelled).
alter table public.class_lessons drop constraint if exists class_lessons_status_check;
alter table public.class_lessons add constraint class_lessons_status_check
  check (status in ('uploading', 'queued', 'transcribing', 'analyzing', 'done', 'error', 'cancelled'));
