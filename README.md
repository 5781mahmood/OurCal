# OurCal

Calorie and macro diary for the web. Local-first in the browser, with optional Supabase sync for global usernames, shared custom foods, friendships, diary rows, and realtime chat.

**Live:** [https://ourcal-pi.vercel.app](https://ourcal-pi.vercel.app)  
**Repo:** [https://github.com/5781mahmood/OurCal](https://github.com/5781mahmood/OurCal)

## Stack

- **React 19 + TypeScript + Vite** — SPA UI and typed domain models
- **React Router** — marketing site (`/`), app (`/app`), custom 404
- **Supabase (Postgres)** — optional cloud for profiles, foods, friends, chat, diary
- **localStorage** — offline diary that still works without cloud keys
- **Recharts** — weekly bars and macro pie (lazy-loaded)
- **qrcode.react + html5-qrcode** — invite QR generate and scan (lazy-loaded People tab)
- **Vercel** — GitHub `main` auto-deploys; `vercel.json` SPA rewrites
- **Vitest** — unit tests for nutrition, balance, macros, streak, badges

## Features

- Onboarding with Mifflin–St Jeor TDEE, macros, global username, profile photo
- Daily diary (Breakfast / Lunch / Dinner / Snack) + 270+ food catalog + custom foods
- **Balance index** (0–100) from calorie + macro adherence
- Macro traffic lights (red / orange / green vs goal)
- Streak week with today marker and fill animations
- Badges for streaks, first log, balance 80+, friends, shared foods
- Friends via username, invite link (`?u=`), or QR
- DM / group chat with Supabase Realtime when cloud is configured
- Export / import JSON backup

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build
npm test
npm run lint
```

## Supabase setup (cloud features)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/social.sql`](supabase/social.sql).
3. Copy **Project URL** and **anon public** key (not `service_role`).
4. In Vercel → Project → Environment Variables, add as **Config** (plain), not Secret:
   - `VITE_SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = long `eyJ…` string
5. Redeploy. Vite only reads these at **build** time.

Without keys, the app stays fully usable on one device. Placeholders like `0` / `1` are ignored.

**Demo security note:** RLS policies are open for class/demo multi-user use. Production hardening would add Supabase Auth and per-user policies.

## Deploy

Push to `main` on GitHub. Vercel rebuilds automatically.

```bash
git add -A
git commit -m "Describe your change"
git push origin main
```

## Project map

| Path | Purpose |
|------|---------|
| `src/types.ts` | Domain models |
| `src/lib/nutrition.ts` | BMR / TDEE / macros |
| `src/lib/balanceIndex.ts` | Balance score |
| `src/lib/streak.ts` | Logging streak |
| `src/lib/badges.ts` | Achievements |
| `src/lib/cloud.ts` | Supabase client + sync |
| `src/lib/storage.ts` | localStorage + export/import |
| `src/hooks/useTracker.ts` | App state |
| `src/components/*` | Today, Stats, People, Profile, streak UI |
| `src/pages/*` | Landing + 404 |
| `supabase/*.sql` | Postgres tables + RLS + realtime |

## What this project demonstrates

- Domain logic separated from UI
- Local-first design with optional cloud catch-up sync
- SPA routing, SEO meta, Vercel SPA rewrites
- Realtime chat via Supabase publications
- Editorial UI without template “AI slop” patterns
