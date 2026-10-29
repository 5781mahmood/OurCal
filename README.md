# OurCal

Local-first calorie and macro diary built as a modern web app (React + TypeScript). Set a daily goal from your body stats, log meals from a searchable food catalog or custom entries, and review streaks, weekly charts, and macro splits — all stored in your browser.

**Role:** Solo personal project (evolved from an earlier Tkinter prototype).

## Tools

- **React 19 + TypeScript** — typed UI and state
- **Vite** — fast dev server and production builds
- **Recharts** — weekly calorie bars and macro pie chart
- **date-fns** — day navigation and date keys
- **localStorage** — persistence without a backend
- **Mifflin–St Jeor** — BMR/TDEE estimate for calorie goals

## Features

- Onboarding with sex, age, height, weight, activity, and lose/maintain/gain goal
- Suggested calorie target + protein/carbs/fat goals (editable via profile)
- Daily diary by Breakfast / Lunch / Dinner / Snack
- Searchable built-in food list + save custom foods
- Progress ring, remaining calories, and macro bars
- Stats: logging streak, 14-day average (from *your* logs only), 7-day chart, meal breakdown
- Export / import JSON backup; reset all data

## How to run

```bash
cd OurCal
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Project map

| Path | Purpose |
|------|---------|
| `src/types.ts` | Shared TypeScript models |
| `src/lib/nutrition.ts` | Mifflin–St Jeor, TDEE, macro defaults |
| `src/lib/storage.ts` | load/save/export/import |
| `src/data/foods.ts` | Offline food catalog |
| `src/hooks/useTracker.ts` | App state + diary actions |
| `src/components/*` | Onboarding, Today, Stats, Profile, modal, ring |
| `src/App.tsx` | Shell + navigation |

## What I learned

- Splitting a tracker into **domain logic** (nutrition math, storage) vs **UI** keeps the app maintainable
- **Local-first** design (JSON in `localStorage`) means a recruiter can demo it with zero setup
- Typed diary entries + meal grouping make stats charts honest — averages only use days that actually have logs
- Replacing a desktop Tkinter GUI with a responsive React app teaches the stack used in most product teams

## Note on estimates

Calorie goals use the Mifflin–St Jeor equation and standard activity multipliers. Food catalog values are typical per-serving estimates for offline use — not a medical device and not pulled from a live nutrition API.
