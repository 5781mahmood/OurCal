# OurCal — full project + testing handoff for Claude

**How to use this:** Paste this file (or `@CLAUDE_CONTEXT.md` + the repo) into Claude.  
**Author / student:** Sultah Mahmood (portfolio / interview brief).  
**Do not understate:** this is a shipped product with production deploy, cloud sync, and a real E2E suite — not a toy to-do app.

---

## 1. One-sentence pitch

**OurCal** is a production-deployed, local-first calorie & macro diary (React 19 + TypeScript + Vite) with optional Supabase cloud sync (friends, chat, diary, shared foods), an editorial marketing site, Balance Index scoring, and **40 Playwright end-to-end tests + 12 Vitest unit tests** gated by GitHub Actions.

---

## 2. Live links (verify these)

| What | URL |
|------|-----|
| **Live site** | https://ourcal-pi.vercel.app |
| **GitHub repo** | https://github.com/5781mahmood/OurCal |
| **App route** | https://ourcal-pi.vercel.app/app |
| **Course context** | UTM CCT211 (Second year) — built beyond class minimum into a resume product |

---

## 3. Stack (exact)

- **Frontend:** React 19, TypeScript, Vite 8, React Router 7
- **Charts:** Recharts (lazy-loaded Stats)
- **Social QR:** `qrcode.react` + `html5-qrcode` (lazy-loaded People)
- **Cloud (optional):** Supabase JS → Postgres (`supabase/schema.sql`, `supabase/social.sql`), Realtime chat
- **Persistence:** `localStorage` key `ourcal.v2` (export/import JSON)
- **Hosting:** Vercel auto-deploy from `main` (`vercel.json` SPA rewrites)
- **Unit tests:** Vitest — nutrition, balance, macros, streak, badges (`src/lib/*.test.ts`)
- **E2E tests:** Playwright Test — Chromium, `webServer` auto-starts Vite
- **CI:** `.github/workflows/e2e.yml` — `npm ci` → unit → Playwright on push/PR to `main`
- **Lint:** oxlint

---

## 4. Product features (what the site actually does)

### Marketing (`/`)
- Editorial landing (IBM Plex Sans + Source Serif 4, ink/teal palette — deliberately anti “AI-slop” purple glass)
- Product sheets, Balance Index explanation, CTA into `/app`
- Custom branded 404: “This page is not in the diary.”

### App (`/app`)
1. **Onboarding** — Mifflin–St Jeor TDEE, calorie goal, Protein/Carbs/Fat estimate, username, optional photo (auto-compressed). Cloud failures are soft: local save always succeeds.
2. **Today diary** — Breakfast/Lunch/Dinner/Snack; 270+ food catalog; custom foods; calorie progress ring; Balance Index; macro bars with Low / On track / High / **Over**; streak week; servings stepper; Jump to today; confirm before clear day.
3. **Stats** — 7-day chart with empty state if no logs; today vs goal; meal breakdown; labels clarify calendar “today”.
4. **People** — friends by username / invite `?u=` / QR; **Copy invite link** (`/app?u=…`); DM + group chat; cloud lookup fail-closed when Supabase on; block solo group threads; labeled chat compose + timestamps.
5. **Profile** — macro goal columns, badges, photo change/remove (clears cloud avatar), edit with Cancel, export/import JSON, reset, “Synced” vs “This device only”.

### Cloud / sync correctness (hard problems solved)
- Tombstones: `deletedEntryIds`, `deletedFriendUsernames` so catch-up sync does **not** resurrect cleared meals/friends.
- Cloud write errors surfaced via toasts.
- Local chat rooms pushed; rooms refetch periodically.
- `registerUsername` does **not** overwrite another user’s profile if handle taken.
- Invite deep-link uses same normalize + cloud lookup as People.

---

## 5. Architecture map (where code lives)

```
OurCal/
├── src/
│   ├── App.tsx                 # Routes /, /app, /404; invite ?u= handling
│   ├── types.ts                # Profile, DiaryEntry, FriendLink, AppState + tombstones
│   ├── hooks/useTracker.ts     # Single source of app state + cloud sync
│   ├── lib/
│   │   ├── nutrition.ts        # BMR/TDEE/macros
│   │   ├── balanceIndex.ts
│   │   ├── macroLevel.ts       # low/mid/high/over
│   │   ├── streak.ts, badges.ts, dates.ts, invite.ts, cloud.ts, storage.ts, image.ts
│   │   └── *.test.ts           # 12 Vitest unit tests
│   ├── components/             # Today, Stats, Community (People), Profile, Onboarding, …
│   ├── pages/                  # LandingPage, NotFoundPage
│   ├── data/foods.ts           # 270+ foods
│   └── index.css               # Editorial design system
├── e2e/                        # Playwright suite (40 tests, 9 files + helpers)
├── playwright.config.ts        # webServer + Chromium + CI retries
├── tsconfig.e2e.json           # Node + Playwright types (fixes process.env red lines)
├── .github/workflows/e2e.yml
├── supabase/schema.sql + social.sql
└── README.md                   # Includes Testing section
```

**State flow:** UI → `useTracker` → `localStorage` + optional Supabase upserts/deletes → UI.  
**E2E flow:** Playwright starts Vite → Chromium → real UI actions → asserts DOM / downloads / clipboard / dialogs.

---

## 6. Testing — full inventory (do not understate)

### Totals (as of handoff)

| Layer | Runner | Count | Command |
|-------|--------|------:|---------|
| Unit | Vitest | **12** tests / 5 files | `npm test` |
| E2E | Playwright | **40** tests / **9** spec files + helpers | `npm run test:e2e` |
| CI | GitHub Actions | unit + E2E on `main` | `.github/workflows/e2e.yml` |

Also: `test:e2e:headed`, `test:e2e:ui`, `postinstall` → `playwright install chromium`.

### Unit tests (`src/lib/*.test.ts`)
- Nutrition / TDEE math
- Balance index
- Macro levels (including **over** goal)
- Streak computation
- Badges

### Playwright E2E — every test by file

#### `e2e/helpers.ts` (shared infrastructure)
- `resetApp` — clear localStorage, force onboarding
- `completeOnboarding` — fill profile → Today
- `logFoodFromSearch` — open meal modal, search, select, log
- `ringCalories` — read ring center kcal

#### `e2e/onboarding.spec.ts` (4)
1. Calorie target appears after filling profile  
2. Blocks submit without display name  
3. Start tracking opens Today diary  
4. Protein / Carbs / Fat in estimate panel  

#### `e2e/diary.spec.ts` (8)
1. Adding food updates calorie ring (Banana → 105)  
2. Deleting food removes it and resets ring  
3. Servings stepper changes calories (Egg 72 → 1.25× → 90)  
4. Day navigation + Jump to today isolates day totals  
5. Clear day confirm empties meals  
6. Dismiss clear day keeps food  
7. Food search empty state copy  
8. Custom food save + log  

#### `e2e/routing.spec.ts` (4)
1. Landing hero + CTA → `/app`  
2. Custom 404 page  
3. 404 “Open app” → TrackerApp  
4. Invite `/app?u=` opens People after onboarding  

#### `e2e/people.spec.ts` (6)
1. QR + Copy invite control  
2. Clipboard contains `/app?u=` (not broken `/app/community`)  
3. New group thread disabled with zero friends  
4. Cannot add yourself  
5. Add friend → Message + enable group thread (cloud-aware)  
6. Chat Send disabled until message typed; send works  

#### `e2e/stats-profile.spec.ts` (5)
1. Empty week honest empty chart state  
2. After logging, week chart + today meal stats  
3. Profile name, username, macro columns, sync status  
4. Edit profile Cancel does not save rename  
5. Export JSON downloads backup with `app: OurCal`  

#### `e2e/persistence.spec.ts` (2)
1. Profile + logged food survive full reload  
2. Export → wipe storage → import restores diary  

#### `e2e/macros-balance.spec.ts` (3)
1. Macro level words visible (Low…)  
2. Chicken raises Protein bar + 165 kcal ring  
3. Meal kcal header updates  

#### `e2e/accessibility-smoke.spec.ts` (3)
1. Nav by accessible role names (Today/Stats/People/Profile)  
2. Escape closes Add food dialog  
3. Ring `aria-label` includes logged vs goal  

#### `e2e/validation-edge.spec.ts` (5)
1. Short username → form error  
2. Garbage friend input → validation error  
3. Log food disabled until a result is selected  
4. Next day ≠ Today; Jump to today available  
5. Reset everything → back to onboarding  

### Quality bar of these tests (interview talking points)
- Prefer **role/label locators** (`getByRole`, `getByLabel`) over brittle CSS.
- Assert **known catalog calories** (Banana 105, Apple 95, Egg 72, Oatmeal 158, Chicken 165) — not vague “something changed.”
- Cover **negative paths** (validation, dismiss confirm, disabled Send, empty charts).
- Cover **persistence** (reload + import round-trip) — critical for local-first apps.
- Cover **P0 product bugs** fixed earlier: invite URL `/app?u=`, clear-day confirm, copy invite.
- Real failures fixed during authoring (documented below) — never faked greens.

### Failures encountered & fixed while building the suite (shows rigor)
1. Locator matched both TDEE and daily-goal `.estimate-num` → narrowed to goal card.  
2. `new RegExp('Egg (large)')` treated `(…)` as regex groups → use string names.  
3. `@buddy one` matched toast + list → `{ exact: true }`.  
4. Multiple “Open app” links → scope to `main`.  
5. Username hint + form-error both matched → assert `.form-error`.  
6. User machine missing Chromium headless shell → `npx playwright install chromium` + `postinstall`.  
7. IDE red squiggles on `process.env` → `tsconfig.e2e.json` with Node types.  
8. Vitest accidentally picking up `e2e/` → excluded in `vite.config.ts` `test.exclude`.

---

## 7. What `playwright.config.ts` does

- `testDir: ./e2e`
- `baseURL: http://127.0.0.1:5173`
- `webServer`: runs `npm run dev` automatically before tests
- Chromium project only (fast CI)
- CI: `forbidOnly`, retries=2, workers=1, `reuseExistingServer: false`

---

## 8. Major product work history (git — shipped to main)

Already on `origin/main` (examples):
- Rebuild as editorial web app with social features  
- Supabase sync for diary, friends, chat  
- Streak UI + app shell hardening  
- Unblock onboarding when Supabase unreachable  
- **Polish sprint** (`f3c6bee`): invite `/app?u=`, tombstone deletes, servings edit, clear confirm, copy invite, macro Over, denser UI, Stats honesty, etc.

**Git note for Claude:** Playwright suite + GHA + README Testing + `tsconfig.e2e` are on `origin/main`. Treat GitHub as source of truth.

---

## 9. How to run everything (for Claude or a recruiter clone)

```bash
git clone https://github.com/5781mahmood/OurCal.git
cd OurCal
npm install                    # postinstall installs Chromium
npx playwright install chromium  # if browsers missing
npm run dev                    # http://127.0.0.1:5173
npm test                       # 12 unit
npm run test:e2e               # 40 E2E headless
npm run test:e2e:headed        # watch browsers
npm run build
```

Optional cloud: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, run SQL in `supabase/`.

---

## 10. Resume / LinkedIn bullets (accurate, strong)

- Built and shipped **OurCal**, a React/TypeScript calorie diary with Balance Index, streaks, friends/chat, and optional Supabase sync; live at ourcal-pi.vercel.app.  
- Implemented **40 Playwright E2E tests** covering onboarding, diary CRUD, persistence/import, People invites, Stats empty states, a11y smoke, and validation edge cases; CI on GitHub Actions.  
- Fixed production-grade sync bugs (delete tombstones, invite deep links, fail-closed cloud username lookup) so multi-device diary clears stay cleared.  
- Designed an editorial, non-template UI and deployed continuously via Vercel from GitHub `main`.

---

## 11. What to attach / give Claude (checklist)

Give Claude **all** of the following for best results:

1. **This file** (`CLAUDE_CONTEXT.md`) — narrative + inventory.  
2. **The repo** (clone or zip) — especially:
   - `e2e/**`
   - `playwright.config.ts`
   - `tsconfig.e2e.json`
   - `.github/workflows/e2e.yml`
   - `src/hooks/useTracker.ts`, `src/lib/cloud.ts`, `src/components/*`
   - `README.md`
3. **Live URL** to click around: https://ourcal-pi.vercel.app  
4. **Ask Claude to**:
   - Summarize for a resume/cover letter / interview prep  
   - Review E2E coverage gaps  
   - Help explain any file line-by-line  
   - Draft “system design” answers for OurCal (local-first + optional sync)

### Suggested prompt to paste with this file

> You are helping me prepare interviews about my project OurCal. Read CLAUDE_CONTEXT.md and the repo. Do not understate the testing work: there are 40 Playwright E2E tests and 12 Vitest unit tests, plus GitHub Actions. Explain the architecture, the hardest bugs (invite 404, sync resurrection), and walk me through Playwright like a 3rd-year student who will be asked about every line.

---

## 12. Out of scope / known next steps (honest)

- Full Supabase Auth + tight RLS (demo RLS is open for class multi-user)  
- USDA mega food import  
- Custom domain purchase  
- Avatar Storage bucket  
- E2E + CI are on `main`; `npm run test:e2e` and GitHub Actions verify them  

---

*Generated as a student handoff brief for Claude / interview prep. Counts: 40 Playwright + 12 Vitest. Live: ourcal-pi.vercel.app.*
