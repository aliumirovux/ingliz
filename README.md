# Easy English (`easywords.uz`)

Personal English learning PWA based on Navigate Beginner (A1–B1): daily study plan, unit vocabulary, grammar patterns, sentence building, FSRS spaced repetition, AI daily tutor, class audio/board analysis, voice calls, and Android/iOS home-screen widgets.

Live site: https://easywords.uz/

## Project Structure

- `index.html` — lightweight PWA shell
- `styles/app.css` — application styles
- `js/app.js` — main client app
- `js/fsrs.js` — FSRS-4.5 spaced repetition scheduler
- `js/mastery.js` — speaking mistake mastery tracker
- `js/davra.js` — pure helpers of the AI mistake round in the sentence exercise
- `data/*.js` — vocabulary, grammar patterns, stories, pictures, and lazy-loaded level packs
- `sw.js` — offline-first service worker with versioned asset caching
- `supabase/functions/` — Edge Functions (`repetitor`, `dars`, `suhbat`, `sahna`, `tushuntir`, `ovoz`, `widget`) + `_shared/common.ts`
- `supabase/migrations/` — Postgres schema, RLS policies, and `pg_cron` jobs
- `tests/core.test.mjs` — automated unit & asset-integrity tests

## Development & Release

After editing any file in `data/`, `styles/`, or `js/`, update version hashes before pushing:

```bash
python3 tools/versiya.py
```

Run automated tests (requires Node 24+):

```bash
node --test tests/core.test.mjs
```

## Vocabulary Dataset

Additional vocabulary lists and difficulty tiers are based on the [New General Service List](https://www.newgeneralservicelist.com/) (NGSL 1.01, Browne, Culligan & Phillips) under CC BY-SA 4.0. Easy = 1–1000, Medium = 1001–2000, Hard = 2001+ (textbook words excluded). Pronunciations, Uzbek translations, and example sentences were authored for this project under CC BY-SA 4.0.
