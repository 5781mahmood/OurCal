# OurCal — full handoff brief for Claude / another AI

**Purpose:** Paste this file (or attach the whole repo) when asking Claude to review, extend, document, or interview-prep OurCal. Do not undersell the scope.

**Owner / student:** Sultan (CCT211).  
**Live product:** https://ourcal-pi.vercel.app  
**GitHub:** https://github.com/5781mahmood/OurCal  

**Git note:** Playwright E2E suite, GitHub Actions, Vitest config, and handoff docs are on `origin/main` — treat GitHub as source of truth for testing.

---

## 1. What OurCal is (one paragraph)

OurCal is a **production-deployed** React 19 + TypeScript + Vite **calorie and macro diary** SPA with:

- Editorial marketing site (`/`), tracker app (`/app`), custom 404
- **Local-first** diary in `localStorage` that works with zero cloud
- **Optional Supabase** sync: profiles/usernames, shared foods, friendships, diary rows, chat rooms/messages + Realtime
- Domain logic (Mifflin–St Jeor TDEE, balance index, streaks, badges, macro traffic lights including **Over**)
- Social People tab: invite QR + **copy invite** (`/app?u=`), DMs, group threads
- **Vitest unit tests** + **40 Playwright E2E tests** + **GitHub Actions** CI for E2E on `main`

This is not a toy form demo — it is a multi-view product with sync edge cases, persistence, and CI-backed browser tests.

---

## 2. Stack (exact)

| Layer | Tech |
|-------|------|
| UI | React 19, TypeScript, Vite 8 |
| Routing | React Router 7 (`/`, `/app`, `/404`, catch-all → 404) |
| Charts | Recharts (lazy-loaded Stats) |
| Cloud | `@supabase/supabase-js`, SQL in `supabase/schema.sql` + `social.sql` |
| Invites | `qrcode.react`, `html5-qrcode` (lazy People) |
| Unit test | Vitest — **12 tests / 5 files** (nutrition, balance, macros, streak, badges) |
| E2E | `@playwright/test` — **40 tests / 9 spec files** + `e2e/helpers.ts` |
| CI | `.github/workflows/e2e.yml` — `npm ci`, Playwright Chromium, `npm test`, `npm run test:e2e` |
| Hosting | Vercel project auto-deploy from GitHub `main`; SPA rewrites |

Scripts:

- `npm run dev` / `build` / `lint` / `test` (Vitest)
- `npm run test:e2e` / `test:e2e:headed` / `test:e2e:ui`
- `postinstall`: `playwright install chromium`

---

## 3. Product features (complete checklist)

### Core diary
- Onboarding: display name, username, optional photo (auto-compress), sex/age/height/weight, activity, goal → TDEE + calorie goal + Protein/Carbs/Fat estimate
- Soft cloud register: username taken / network failure still saves **locally** (onboarding never blocked)
- Today: streak week, combined day band (balance + ring + macros), four meals
- Add food: search catalog (270+), custom food, optional share to community catalog
- Servings stepper on logged entries; delete entry; clear day **with confirm**
- Jump to today when browsing other days
- Macro levels: Low / On track / High / **Over** (not green when over goal)
- Stats: 7-day bars, today macro pie, today-by-meal; empty states when no logs; labels clarify calendar today vs diary browse date
- Profile: macro columns, Synced vs This device only, export/import JSON, reset, edit with **Cancel**, remove photo clears cloud avatar when cloud on

### Social / cloud
- Invite URL **`/app?u=`** (fixed from broken `/app/community?u=` which 404’d)
- Copy invite link + QR
- Cloud friend add: **fail closed** if username missing in DB
- Duplicate friend → “Already friends” toast
- Block solo group threads; labeled chat compose; Send disabled when empty; message timestamps
- Sync tombstones: `deletedEntryIds` / `deletedFriendUsernames` so catch-up sync does **not** resurrect clears
- Push local chat rooms; periodic room refetch; surface cloud write errors via toasts
- `registerUsername` does **not** overwrite another user’s profile

### UX / design system
- IBM Plex Sans + Source Serif 4; ink / teal / muted paper (`#f5f5f7`)
- Explicitly **not** purple-glass AI-slop UI
- Landing editorial hero + product sheets; restrained motion (streak stagger, toast enter)

### Out of scope (documented, intentional)
- Full Supabase Auth + tight RLS (demo RLS is open)
- USDA mega import, custom domain purchase, avatar Storage bucket

---

## 4. Architecture map (what to open)

```
src/
  App.tsx              # Routes + invite ?u= deep link → People + addFriend
  hooks/useTracker.ts  # Single app state: diary, friends, chat, sync, tombstones
  lib/
    nutrition.ts       # BMR / TDEE / macros
    balanceIndex.ts
    streak.ts, badges.ts, macroLevel.ts
    cloud.ts           # Supabase client + all cloud IO
    storage.ts         # localStorage v2 + export/import
    invite.ts          # parseInvite + buildInviteUrl (/app?u=)
    username.ts, dates.ts, image.ts
  components/          # Today, Stats, Community(People), Profile, Onboarding, AddFoodModal, …
  pages/               # LandingPage, NotFoundPage
  data/foods.ts        # Catalog
  index.css            # Design system
e2e/                   # Playwright suite
playwright.config.ts   # webServer starts Vite; baseURL 127.0.0.1:5173
tsconfig.e2e.json      # Node + Playwright types (fixes process.env red squiggles)
.github/workflows/e2e.yml
supabase/*.sql
```

**State model:** `AppState` in `types.ts` — profile, entries, customFoods, friends, chatRooms, chatMessages, earnedBadges, cloudUserId, **deletedEntryIds**, **deletedFriendUsernames**.

---

## 5. Playwright — what was built (do not undersell)

### Infrastructure
- `@playwright/test` installed; Chromium via `npx playwright install chromium` + `postinstall`
- `playwright.config.ts`: auto-starts Vite (`webServer`), Chromium project, CI retries/workers, `reuseExistingServer` locally
- Shared **`e2e/helpers.ts`**: `resetApp`, `completeOnboarding`, `logFoodFromSearch`, `ringCalories` — production-style DRY helpers
- `tsconfig.e2e.json` so IDE understands `process` and Playwright APIs
- README **Testing** section with run matrix
- GitHub Actions runs unit + E2E on push/PR to `main`, uploads report artifact on failure

### Scale
- **40 end-to-end tests** across **9 spec files**
- Plus **12 Vitest unit tests** → **52 automated tests** total in the project

### Spec inventory (every suite)

| File | Focus | Tests (approx) |
|------|--------|----------------|
| `onboarding.spec.ts` | Goal appears; name required; Start tracking → Today; macro labels | 4 |
| `diary.spec.ts` | Ring updates; delete; servings; day nav + Jump to today; clear confirm/dismiss; empty search; custom food | 8 |
| `routing.spec.ts` | Landing CTA; 404; 404→app; invite `?u=` opens People | 4 |
| `people.spec.ts` | QR; clipboard `/app?u=`; no solo groups; self-add; add friend; chat Send gate | 6 |
| `stats-profile.spec.ts` | Empty week; chart after log; profile macros/sync; Cancel edit; JSON download parse | 5 |
| `persistence.spec.ts` | Reload keeps food; export → wipe → import restores | 2 |
| `macros-balance.spec.ts` | Level words; chicken protein; meal kcal header | 3 |
| `accessibility-smoke.spec.ts` | Nav by role; Escape closes dialog; ring aria-label | 3 |
| `validation-edge.spec.ts` | Short username; bad friend; Log food disabled; next day; reset | 5 |

### Quality bar (interview-relevant)
- Role/label locators (`getByRole`, `getByLabel`) preferred over brittle CSS-only
- Assert **known catalog calories** (Banana 105, Apple 95, Egg 72→90 at 1.25×, etc.) — not vague “something changed”
- Negative paths: validation, dismiss confirm, empty Send, solo groups
- Dialogs (`page.once('dialog')`), downloads (`waitForEvent('download')`), clipboard permissions
- Strict-mode locator bugs found and fixed for real (ambiguous Open app ×3, RegExp `(cooked)`, toast vs `@user`)

### Commands
```bash
npx playwright install chromium   # once / after Playwright version bump
npm run test:e2e                  # 40 headless
npm run test:e2e:headed           # watch browser
npm run test:e2e:ui               # Playwright UI mode
npm test                          # 12 Vitest
```

---

## 6. Major product work before/around testing (polish sprint)

Shipped on `main` as `f3c6bee` and earlier commits:

1. **P0 invite 404** — QR/links now `/app?u=`; App deep-link uses same normalize + cloud lookup as People  
2. **P0 sync resurrection** — tombstones for deleted diary rows and friends; re-assert deletes on sync; don’t overwrite foreign usernames  
3. Diary UX: Jump to today, clear confirm, edit servings, food empty state, macro Over  
4. People: copy invite, chat labels, block solo groups, timestamps  
5. Stats honesty + empty charts; denser Today band; Profile macro columns + cloud status  
6. Onboarding unblocked when Supabase unreachable (`4c48ba9`)  
7. Streak UI life + app shell (`cad36c4`); cloud diary/friends/chat (`5969d4e`); editorial rebuild (`7cb58d1`)

---

## 7. What to give Claude (package checklist)

### Minimum (copy-paste)
1. **This file:** `docs/CLAUDE_HANDOFF.md`
2. **README:** `README.md` (stack, testing, Supabase, deploy)
3. **Live URL** + **repo URL**

### Recommended (attach or open in project)
4. Whole git repo / Cursor workspace (best)
5. Especially: `e2e/**`, `playwright.config.ts`, `.github/workflows/e2e.yml`, `src/hooks/useTracker.ts`, `src/lib/cloud.ts`, `src/App.tsx`, `src/components/CommunityView.tsx`, `src/components/TodayView.tsx`
6. `supabase/schema.sql` + `social.sql` if asking about backend

### Optional proof
7. Terminal output: `npm run test:e2e` → **40 passed**
8. E2E lives in `e2e/` on `main`; run `npm run test:e2e` to verify

### Prompt starter you can paste to Claude

```text
You are helping me with OurCal, my React+TS calorie diary (live: https://ourcal-pi.vercel.app).
Read docs/CLAUDE_HANDOFF.md and the e2e/ suite. Do not undersell the work:
- Full product: diary, macros/balance, streaks, badges, People/chat, optional Supabase sync, Vercel deploy
- Polish sprint fixed invite 404s and sync delete resurrection (tombstones)
- Testing: 12 Vitest + 40 Playwright E2E + GitHub Actions
I need you to: [REVIEW / EXTEND TESTS / INTERVIEW PREP / WRITE LINKEDIN SUMMARY / …]
```

---

## 8. Resume / LinkedIn bullets (accurate, strong)

- Built and shipped **OurCal**, a React 19 + TypeScript calorie/macro diary with local-first storage and optional Supabase sync (friends, shared foods, realtime chat), deployed on Vercel: https://ourcal-pi.vercel.app  
- Implemented domain logic (Mifflin–St Jeor TDEE, balance index, streaks, badges, macro traffic lights) and editorial product UI (not a template dashboard)  
- Hardened sync correctness with **delete tombstones** so cleared diary/friends stay cleared across devices; fixed invite deep links from 404ing `/app/community` to `/app?u=`  
- Authored **40 Playwright end-to-end tests** (onboarding, diary CRUD, persistence/import, People/chat, routing/404, a11y smoke, edge cases) plus **12 Vitest** unit tests; wired **GitHub Actions** to run the suite on every push to `main`

---

## 9. Interview talking points (Playwright)

1. E2E vs unit: Vitest proves formulas; Playwright proves “log banana → ring shows 105” in a real browser.  
2. `webServer` in config = CI doesn’t need a hand-started Vite.  
3. Helpers prevent 40× copy-pasted onboarding.  
4. Failures taught strict locators, RegExp pitfalls, dialog/download/clipboard APIs.  
5. Companies use Playwright for regression gates before merge/deploy — same pattern as our Actions workflow.

---

## 10. Known limitations (honest, for Claude)

- Demo Supabase RLS is open (class/demo); not Auth-hardened production security  
- Cloud-dependent People tests branch if unknown username rejected when cloud is configured  
- Playwright browsers must be installed on each machine (`npx playwright install chromium`)  
- E2E suite may still be **unpushed** — commit before claiming CI is live on GitHub

---

*End of handoff. Prefer the full repository as context when possible.*
