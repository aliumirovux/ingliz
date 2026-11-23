# Repetitor agenti (Claude Console · Managed Agents)

Har kuni 06:30 da (Toshkent) agent Ali'ning natijalarini o'qiydi, shaxsiy dars tuzadi va saytga yozadi. Sayt uni «Bugun» sahifasida, «Bugungi dars» kartasi tepasida ko'rsatadi.

```
Console deployment (06:30) ─► agent sessiyasi (Fable 5.2 · max effort, xotira bilan)
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

1. **Supabase**: migratsiyani qo'llash; `repetitor` funksiyasini `verify_jwt = false` bilan deploy qilish; secret: `AGENT_KEY` (tasodifiy uzun kalit; egasi kodda — OWNER_DEFAULT).
2. **Console → Credential vaults**: «Easy English» vault, `environment_variable` turidagi kalit: `secret_name = EE_AGENT_KEY`, qiymati = `AGENT_KEY`, allowed host `rqeirdempadfwirefyit.supabase.co`, faqat header'da.
3. **Console → Environments**: «easy-english», networking `limited`, allowed hosts: `rqeirdempadfwirefyit.supabase.co`, `easywords.uz`.
4. **Console → Memory**: «Ali ingliz» store, `xotira/` dagi fayllar bilan.
5. **Console → Agents**: `repetitor.md` dagi ta'rif.
6. **Console → Deployments**: cron `30 6 * * *`, timezone `Asia/Tashkent`, budget $5 har ishga tushishga, memory store (read_write) va vault ulangan, xabar — `kunlik-xabar.md`.
7. Bir marta qo'lda «Run» → saytda karta chiqqanini tekshirish.

## Xavfsizlik

- `AGENT_KEY` sandboxda ochiq turmaydi: vault uni faqat chiquvchi so'rov sarlavhasiga qo'yadi.
- Kalit faqat shu ikki eshikni ochadi: Ali'ning xulosasini o'qish va bitta kunlik darsni yozish. Boshqa foydalanuvchilar, `progress` ga yozish — yo'q.
- Saytdagi foydalanuvchi darsni o'zgartira olmaydi, faqat javoblarini yozadi (ustun darajasidagi huquq).
- Console'da to'lov kartasi yo'q: Max krediti tugasa, agent to'xtaydi, pul yechilmaydi.

## Telegram
- Bot token: Edge Function secret `TELEGRAM_BOT_TOKEN`. Webhook: `GET /functions/v1/repetitor/tg-setup` (bir marta). Botga `/start` yozgan birinchi chat egasiniki.
- Ertalab dars yozilganda xabar; 20:00 da (pg_cron `repetitor-kechki-eslatma`) dars bajarilmagan bo'lsa bitta eslatma.

## Bugungi reja
- Agent `plan` beradi: `recommend` (10/20/30 daqiqa) va `order` (o'z bo'limlari `rep0..` + sayt qadamlari). Sayt bitta ro'yxatda tanlangan vaqtga qirqib ko'rsatadi.

## Dars tahlili (Inter Nation)
- Sayt `#dars`: iPhone Diktofon yozuvi → `dars-audio` bucket (TUS, 6 MB bo'laklar, uzilsa davom etadi).
- `supabase/functions/dars`: Gemini (`GEMINI_API_KEY`, model `gemini-3.8-flash`) matn + ikki ovoz → audio darhol o'chiriladi → Claude (`claude-opus-5-5`) xatolar va mazmun → Telegram.
- Har bosqich alohida chaqiruv (150 s chegarasi), pg_cron `dars-ishlov` har daqiqa navbatni suradi. 3 urinishdan keyin `error`, saytda «Qayta urinish».
- `/repetitor/data` → `class_lessons`: agent ertangi darsning birinchi bo'limini shu xatolardan tuzadi.

## Darsdagi lahza (ovoz chiqarib mashq)
- Sahifa: `#lahza-<dars id>` — «Dars tahlili» → «Tutilgan joylar» oxiridagi «Ovoz chiqarib mashq» tugmasi.
- O'qituvchi savoli (`stuck[].q`) eshitiladi, javob yashirin; mikrofon yoqilgandan birinchi so'zgacha vaqt (`lat_ms`) darsdagi jimlik (`stuck[].gap`) bilan solishtiriladi. Yordam 3 bosqich, keyin namunani 2 marta takrorlash.
- Tekshiruv — brauzerning nutqni tanishi (Chrome Android, iPhone Safari), kredit sarflanmaydi; ishlamasa yozib javob beriladi.
- Natijalar `speak_log` jadvaliga (src `dars` | `rep`): bosh sahifadagi «Bu hafta gapirdingiz» (darsdagi `metrics.talk_s` + saytdagi `secs`) va repetitorning `speaking.practice` shundan.
- Repetitor «Gapirish» bo'limidagi `type` savollarga ham ovoz bilan javob berish mumkin (so'zlarning 85% i to'g'ri bo'lsa qabul).

## Repetitorga qo'ng'iroq (ovozli suhbat)
- Sahifa: `#suhbat` — «Bugun»dagi «Repetitorga qo'ng'iroq» qatori. 5 daqiqa (+2 daqiqa bir marta), kuniga 3 ta qo'ng'iroq, har birida 24 tagacha gap.
- Har gap alohida yozib olinadi (1,5 soniya jimlikdan keyin to'xtaydi) → `supabase/functions/suhbat`: Gemini so'zma-so'z matn (xatoni tuzatmaydi, noaniq so'zlarni belgilaydi) → Claude (`claude-opus-5-5`) javob va tuzatish → telefon ovozi o'qiydi. Ovoz saqlanmaydi.
- Noaniq eshitilgan so'z ustiga tuzatish kelsa, sayt avval «To'g'ri eshitdimmi?» deb so'raydi; «Yo'q» — tuzatish yozilmaydi.
- Mikrofon yo'q bo'lsa — «Yozib gaplashish» (Gemini chaqirilmaydi).
- Natija `calls` jadvalida (matn va tuzatishlar); tuzatishlar «Xatolarim» → «Gapirishda» bo'limida, «Bu xato emas» `calls.off` ga yoziladi. Gapirish soniyalari `speak_log` (src `call`).
- Deploy: `suhbat` funksiyasi `verify_jwt = false` bilan; kalitlar bor (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`). Migratsiya: `20261118c_calls.sql`.
