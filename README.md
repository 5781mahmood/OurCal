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
npm run test:e2e
```

First time only (downloads Chromium for Playwright):

```bash
npx playwright install chromium
```

## Testing

**Unit (Vitest)** — pure domain logic with no browser: nutrition / TDEE, balance index, macro levels, streak, badges. Fast feedback while editing formulas.

**End-to-end (Playwright)** — drives a real Chromium against the Vite app (`playwright.config.ts` starts `npm run dev` for you). Specs live in `e2e/`:

| Area | What we assert |
|------|----------------|
| Onboarding | Calorie goal appears; name required; Start tracking → Today; macro labels |
| Diary | Log food updates ring; delete clears it; servings stepper; day nav + Jump to today; clear-day confirm/cancel; empty search; custom food |
| Routing | Landing CTA; custom 404; invite `?u=` opens People |
| People | QR + copy invite (`/app?u=`); no solo groups; self-add error; chat Send disabled until typed |
| Stats / Profile | Empty week copy; chart after log; macro columns; Cancel edit; JSON export download |
| Persistence | Reload keeps diary; export → wipe → import restores meals |
| Macros / balance | Level words; protein bar after chicken; meal kcal header |
| A11y smoke | Nav by role; Escape closes modal; ring `aria-label` |
| Edge cases | Short username; bad friend input; Log food disabled until select; next day; reset |

One-time browser download (also runs via `postinstall` after `npm install`):

```bash
npx playwright install chromium
```

Run commands **one at a time** (do not paste comments on the same line):

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e -- e2e/diary.spec.ts
```

| Script | What you see |
|--------|----------------|
| `test:e2e` | Headless Chromium (fast, CI-style) |
| `test:e2e:headed` | Real browser windows so you can watch clicks |
| `test:e2e:ui` | Playwright’s interactive UI mode |

GitHub Actions (`.github/workflows/e2e.yml`) runs unit + Playwright on every push/PR to `main`.

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
