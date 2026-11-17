-- vaqtinchalik xatolar (server band, limit) uchun kutishlar soni: urinishlarga qo'shilmaydi
alter table public.class_lessons add column if not exists waits smallint not null default 0;
