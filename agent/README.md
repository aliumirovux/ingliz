# Repetitor agenti (Claude Console · Managed Agents)

Har kuni 06:30 da (Toshkent) agent Ali'ning natijalarini o'qiydi, shaxsiy dars tuzadi va saytga yozadi. Sayt uni «Bugun» sahifasida, «Bugungi dars» kartasi tepasida ko'rsatadi.

```
Console deployment (06:30) ─► agent sessiyasi (Opus 5.5, xotira bilan)
      │  GET  /functions/v1/repetitor/data    (x-agent-key)
      │  POST /functions/v1/repetitor/lesson  (x-agent-key)
      ▼
Supabase: progress (o'qiladi) · agent_lessons (yoziladi)
      ▼
easywords.uz: «Repetitor darsi» kartasi → #repetitor → javoblar agent_lessons.answers ga
```

## Fayllar

| Fayl | Nima |
|---|---|
| `repetitor.md` | Agent ta'rifi: model, asboblar, system prompt |
| `kunlik-xabar.md` | Har kungi deployment xabari (cron 30 6 * * *, Asia/Tashkent) |
| `xotira/` | Memory store'ning boshlang'ich fayllari |
| `namuna-dars.json` | Dars shakli namunasi (sayt testi ham shu bilan) |
| `../supabase/functions/repetitor/` | Agent uchun ikki eshik (data, lesson) |
| `../supabase/migrations/20261117_agent_lessons.sql` | `agent_lessons` jadvali va RLS |

## Sozlash tartibi (bir marta)

1. **Supabase**: migratsiyani qo'llash; `repetitor` funksiyasini `verify_jwt = false` bilan deploy qilish; secretlar: `AGENT_KEY` (tasodifiy 48 belgi), `OWNER_ID` (Ali'ning user id).
2. **Console → Credential vaults**: «Easy English» vault, `environment_variable` turidagi kalit: `secret_name = EE_AGENT_KEY`, qiymati = `AGENT_KEY`, allowed host `rqeirdempadfwirefyit.supabase.co`, faqat header'da.
3. **Console → Environments**: «easy-english», networking `limited`, allowed hosts: `rqeirdempadfwirefyit.supabase.co`, `easywords.uz`.
4. **Console → Memory**: «Ali ingliz» store, `xotira/` dagi fayllar bilan.
5. **Console → Agents**: `repetitor.md` dagi ta'rif.
6. **Console → Deployments**: cron `30 6 * * *`, timezone `Asia/Tashkent`, budget `max_list_cost` = 100 (≈ $1) har ishga tushishga, memory store (read_write) va vault ulangan, xabar — `kunlik-xabar.md`.
7. Bir marta qo'lda «Run» → saytda karta chiqqanini tekshirish.

## Xavfsizlik

- `AGENT_KEY` sandboxda ochiq turmaydi: vault uni faqat chiquvchi so'rov sarlavhasiga qo'yadi.
- Kalit faqat shu ikki eshikni ochadi: Ali'ning xulosasini o'qish va bitta kunlik darsni yozish. Boshqa foydalanuvchilar, `progress` ga yozish — yo'q.
- Saytdagi foydalanuvchi darsni o'zgartira olmaydi, faqat javoblarini yozadi (ustun darajasidagi huquq).
- Console'da to'lov kartasi yo'q: Max krediti tugasa, agent to'xtaydi, pul yechilmaydi.
