# OurCal — Full Project + Testing Handoff for Claude

**Owner:** student portfolio / CCT211-era build, continued as a serious React product  
**Live:** https://ourcal-pi.vercel.app  
**Repo:** https://github.com/5781mahmood/OurCal  
**Stack:** React 19 · TypeScript · Vite · React Router · Supabase (optional) · Vercel · Vitest · Playwright · GitHub Actions  

**Purpose of this doc:** Give another AI (Claude) complete, non-undersold context about what OurCal is, what was built, what was fixed, and the full testing story (especially Playwright). Prefer the live repo + this file over guessing.

---

## 1. One-sentence pitch

OurCal is a **local-first calorie & macro diary** with an editorial (non-AI-slop) UI, optional Supabase cloud sync for friends/chat/shared foods/diary, deployed on Vercel, with **52 automated tests** (12 Vitest unit + **40 Playwright E2E**) and CI via GitHub Actions.

---

## 2. What to attach / give Claude (checklist)

Give Claude **as much of this as possible** (in order of value):

1. **This file** (`CLAUDE_HANDOFF.md`) — context + claims + test inventory  
2. **GitHub repo link** — https://github.com/5781mahmood/OurCal  
3. **Live site** — https://ourcal-pi.vercel.app  
4. **Key source trees** (or whole repo zip / `@` folder in Cursor):
   - `src/` (app)
   - `e2e/` (Playwright specs + helpers)
   - `playwright.config.ts`
   - `.github/workflows/e2e.yml`
   - `supabase/schema.sql` + `supabase/social.sql`
   - `README.md`
   - `package.json`
5. **Important product files** if not sending whole `src/`:
   - `src/hooks/useTracker.ts` — app state, sync, tombstones
   - `src/lib/cloud.ts` — Supabase client + writes
   - `src/lib/invite.ts` — invite URL `/app?u=`
   - `src/components/{TodayView,CommunityView,StatsView,ProfileView,Onboarding,AddFoodModal}.tsx`
   - `src/App.tsx` — routing + invite deep link
6. **Git note:** Playwright E2E (`e2e/`), GitHub Actions, Vitest exclude config, and this handoff are on `main` / GitHub — treat the remote as source of truth for the testing suite.

---

## 3. Product: what OurCal does

### Routes
| Path | What |
|------|------|
| `/` | Marketing landing (editorial hero, product sheets, balance explainer) |
| `/app` | Tracker SPA (onboarding → Today / Stats / People / Profile) |
| `/app?u=username` | Invite deep link → opens People, adds friend (normalize + cloud lookup when enabled) |
| `*` → `/404` | Custom 404 (“This page is not in the diary.”) |

### Core features (shipped)
- **Onboarding:** Mifflin–St Jeor TDEE, calorie goal, Protein/Carbs/Fat macros, username, optional photo (auto-compressed), works even if Supabase is down (local-first)
- **Today diary:** Breakfast/Lunch/Dinner/Snack, 270+ catalog foods, custom foods, calorie **progress ring**, macro bars with **Low / On track / High / Over**, Balance Index, streak week
- **Servings stepper** on logged entries (no delete+re-add)
- **Jump to today**, day prev/next, **confirm before clear day**
- **Stats:** 7-day chart, today-by-meal, macro pie; honest empty states; labels clarify calendar “today”
- **People:** friends by username/invite/QR, **Copy invite link**, DM + group chat, Send disabled when empty, block solo groups
- **Profile:** macro columns, sync status (“Synced” vs “This device only”), edit + Cancel, export/import JSON, remove photo clears cloud avatar when cloud on
- **Badges:** first log, streaks, balance 80+, friends, community food
- **Cloud (optional):** profiles, friendships, chat rooms/messages (Realtime), diary_entries, shared_foods — via `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

### Design system (intentional)
- Fonts: IBM Plex Sans + Source Serif 4  
- Palette: ink / paper `#f5f5f7` / teal accent — **no** purple glass / neon AI-slop patterns  
- Restrained motion (streak stagger, toast enter)

---

## 4. Architecture (how the code is organized)

| Path | Role |
|------|------|
| `src/types.ts` | Domain models (profile, diary, friends, chat, badges, tombstone fields) |
| `src/lib/nutrition.ts` | BMR / TDEE / macro goals |
| `src/lib/balanceIndex.ts` | 0–100 balance score |
| `src/lib/macroLevel.ts` | Traffic lights + **over** state + labels |
| `src/lib/streak.ts` / `badges.ts` | Streak + achievements |
| `src/lib/storage.ts` | localStorage load/save/export/import + tombstone arrays |
| `src/lib/cloud.ts` | Supabase: register (no overwrite foreign profiles), diary, friends, rooms, messages, avatars |
| `src/lib/invite.ts` | `parseInvite` + `buildInviteUrl` → `/app?u=` |
| `src/hooks/useTracker.ts` | Single app API: diary CRUD, sync catch-up, tombstones, chat, toasts |
| `src/components/*` | Today, Stats, People, Profile, Onboarding, modals, streak UI |
| `src/pages/*` | Landing + 404 |
| `src/data/foods.ts` | Large food catalog |
| `e2e/*` | Playwright E2E |
| `supabase/*.sql` | Postgres schema + social tables + open demo RLS |

**Scale (approx.):** ~5k+ lines of TS/TSX across `src/` + `e2e/` (not counting `node_modules` / food data bulk alone).

---

## 5. Major product work completed (do not undersell)

### A. Full product rebuild
Editorial SPA with marketing site, tracker shell, social People tab, cloud sync layer, Vercel deploy from GitHub `main`.

### B. Life-upgrade / UX hardening
Streak UI, shell hardening, onboarding unblocked when cloud fails (soft errors, always save locally).

### C. Polish sprint (commit `f3c6bee` on GitHub)
Trust-breaking bugs fixed, including:
- **P0 invite 404:** QR/links were `/app/community?u=` but only `/app` is routed → fixed to `/app?u=`
- **P0 sync resurrection:** deletes/clears re-pushed on catch-up → **tombstones** (`deletedEntryIds`, `deletedFriendUsernames`); sync skips re-push; re-asserts cloud deletes
- Cloud friend add **fail-closed** when cloud on (`lookupProfileByUsername`)
- `registerUsername` does **not** overwrite someone else’s display name
- Chat: labeled Message input, disable empty Send, block group with 0 friends, timestamps, copy invite
- Diary: jump to today, confirm clear, empty search copy, edit servings, macro **Over** state
- Stats: honest empty week + today labeled consistently
- Profile: remove photo clears cloud; Cancel on edit; macro columns; sync status line
- Push local chat rooms on sync; surface cloud write errors via toasts

### D. Playwright + CI testing program (local → should be pushed)
Full E2E program documented below.

---

## 6. Testing program (full inventory)

### Totals (verified)
| Layer | Tool | Count | Status |
|-------|------|-------|--------|
| Unit | Vitest | **12** tests in **5** files | Pass |
| E2E | Playwright (Chromium) | **40** tests in **9** spec files + helpers | Pass (40/40) |
| CI | GitHub Actions `.github/workflows/e2e.yml` | unit + Playwright on push/PR to `main` | Configured |
| **Combined** | | **52 automated tests** | |

### Scripts
```bash
npm test                 # Vitest unit
npm run test:e2e         # Playwright headless (CI-style)
npm run test:e2e:headed  # Watch real browser
npm run test:e2e:ui      # Playwright UI mode
npx playwright install chromium   # one-time browsers (also postinstall)
```

### Playwright infrastructure
- `playwright.config.ts`: `baseURL http://127.0.0.1:5173`, **auto-starts Vite** via `webServer`, Chromium project, CI retries/workers
- `e2e/helpers.ts`: `resetApp`, `completeOnboarding`, `logFoodFromSearch`, `ringCalories` — shared setup so specs stay DRY
- `tsconfig.e2e.json`: Node + Playwright + DOM types (fixes IDE `process` errors)
- `postinstall`: `playwright install chromium`
- Reporter: list; traces on first retry

### Design quality of the E2E suite (why it’s portfolio-grade)
- Asserts **real user outcomes** (ring shows **105** for banana, not “something rendered”)
- Uses **accessible locators** (`getByRole`, `getByLabel`) — same signals as a11y
- Covers **happy paths + negative paths** (validation, cancel clear, disabled Send)
- Covers **persistence** (reload + export/import round-trip)
- Covers **routing/SEO UX** (landing, 404, invite deep link)
- Covers **clipboard** invite URL must contain `/app?u=`
- Handles **dialogs** (`confirm` accept/dismiss) and **downloads** (`waitForEvent('download')`)
- Failures were fixed honestly (RegExp parentheses, strict-mode duplicate locators, missing Chromium binary) — never faked green

---

## 7. All 40 Playwright tests (complete list)

### Onboarding (`e2e/onboarding.spec.ts`) — 4
1. shows a calorie target after filling the profile  
2. blocks submit without a display name  
3. Start tracking opens the Today diary  
4. shows Protein / Carbs / Fat in the estimate panel  

### Today diary (`e2e/diary.spec.ts`) — 8
5. adding a food updates the calorie ring  
6. deleting a food removes it and resets the ring  
7. servings stepper changes calories without re-adding  
8. day navigation leaves today and Jump to today returns  
9. clear day asks for confirm and empties meals  
10. dismissing clear day keeps food logged  
11. food search empty state suggests custom food  
12. custom food can be saved and logged  

### People (`e2e/people.spec.ts`) — 6
13. shows invite QR and copy invite link control  
14. copy invite link writes `/app?u=` to the clipboard  
15. cannot start a group thread with zero friends  
16. adding yourself as a friend shows an error  
17. adding a local friend enables Message and group thread  
18. chat compose Send stays disabled while empty  

### Routing (`e2e/routing.spec.ts`) — 4
19. landing page shows brand hero and CTA into the app  
20. unknown paths show the custom 404 page  
21. 404 Open app reaches TrackerApp  
22. invite deep link `/app?u=` opens People after onboarding  

### Stats / Profile (`e2e/stats-profile.spec.ts`) — 5
23. empty week shows an honest empty chart state  
24. after logging food, week chart and today meal stats appear  
25. shows name, username, macro columns, and sync status  
26. Edit profile Cancel returns without saving a rename  
27. Export JSON downloads a backup file  

### Persistence (`e2e/persistence.spec.ts`) — 2
28. profile and logged food survive a full page reload  
29. import JSON restores a previously exported diary  

### Macros / balance (`e2e/macros-balance.spec.ts`) — 3
30. macro bars show level words (Low / On track / High / Over)  
31. logging protein-heavy food raises Protein bar value text  
32. meal kcal header updates when an item is logged  

### Accessibility smoke (`e2e/accessibility-smoke.spec.ts`) — 3
33. primary app nav is reachable by role name after onboarding  
34. Add food dialog: Escape closes it  
35. calorie ring exposes accessible name with logged vs goal  

### Validation / edge (`e2e/validation-edge.spec.ts`) — 5
36. invalid username on onboarding shows the username hint  
37. Add friend with garbage input shows validation error  
38. logging food requires selecting a result before Log food enables  
39. next day from Today shows a weekday heading not Today  
40. Reset everything returns the user to onboarding after confirm  

---

## 8. Vitest unit tests (12)

| File | Coverage |
|------|----------|
| `nutrition.test.ts` | BMR sex difference, activity scaling, lose/gain goals, protein anchoring |
| `balanceIndex.test.ts` | Perfect score vs far-from-goal |
| `macroLevel.test.ts` | low / mid / high / **over** |
| `streak.test.ts` | consecutive days, empty today allowance, gap break |
| `badges.test.ts` | first_log, streak_7 |

---

## 9. Resume / LinkedIn talking points (accurate)

You can claim (truthfully):

- Shipped a production-deployed React 19 + TypeScript calorie diary (Vercel) with optional Supabase sync  
- Implemented local-first architecture with cloud catch-up sync and **delete tombstones** to prevent data resurrection  
- Fixed production-class bugs (invite deep-link 404, sync re-push of deletes, fail-closed username lookup)  
- Built **40 Playwright E2E tests** covering onboarding, diary CRUD, social/invite, routing, persistence, a11y smoke, and validation edges  
- Added **GitHub Actions** CI running unit + E2E on `main`  
- Separated domain logic (Vitest) from UI E2E (Playwright) — standard industry testing pyramid  

**Suggested bullet:**
> Built OurCal (React/TS/Vite): local-first calorie diary with Supabase sync, Vercel deploy, and 52 automated tests including 40 Playwright E2E flows (diary, invites, persistence, a11y) gated by GitHub Actions.

---

## 10. Known limits / honesty (say this too)

- Supabase RLS is **demo-open** (class project); production would add Auth + tight RLS  
- No USDA mega-import; catalog is curated in-repo  
- Avatar Storage bucket not required (data URLs with size caps)  
- Cloud friend add rejects unknown usernames **when cloud is configured**; offline mode still allows local friends  
- Playwright browsers must be installed once (`npx playwright install chromium`) — npm package ≠ browser binary  

---

## 11. Prompt you can paste to Claude

```text
I’m handing you OurCal — my React 19 + TypeScript + Vite calorie diary (live: https://ourcal-pi.vercel.app, repo: https://github.com/5781mahmood/OurCal).

Read CLAUDE_HANDOFF.md fully. Also use the repo / attached src + e2e folders.

Do NOT undersell the work:
- Full product: onboarding (Mifflin–St Jeor), diary, balance index, macros with Over state, streaks, badges, People (QR + copy invite /app?u=), chat, Stats, Profile export/import, optional Supabase sync, Vercel deploy.
- Polish fixes: invite 404, sync tombstones, fail-closed cloud username lookup, servings edit, clear-day confirm, etc.
- Testing: 12 Vitest unit + 40 Playwright E2E + GitHub Actions e2e.yml. Specs in e2e/*.spec.ts with helpers; webServer auto-starts Vite.

Your job: [TELL CLAUDE WHAT YOU WANT — e.g. resume bullets / interview prep / code review / next features].
Stay accurate to the handoff and code; don’t invent features that aren’t there.
```

---

## 12. Commands Claude (or you) should run to verify

```bash
cd OurCal
npm install
npx playwright install chromium
npm test
npm run test:e2e
npm run build
```

Expected: Vitest 12 passed; Playwright 40 passed; production build succeeds.
