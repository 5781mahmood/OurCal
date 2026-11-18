/**
 * Capture recruiter screenshots from demo data only.
 * Run: node scripts/capture-screenshots.mjs
 * Starts Vite, seeds localStorage with a fictional profile, writes:
 *   docs/screenshots/today.png
 *   docs/screenshots/stats.png
 *   docs/screenshots/people.png
 *   public/og-image.png  (1200×630, composed from the Today screenshot)
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const PORT = 5199
const BASE = `http://127.0.0.1:${PORT}`

function dateKey(offsetDays) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function entry(partial) {
  return {
    servings: 1,
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

function demoState() {
  const today = dateKey(0)
  const yesterday = dateKey(-1)
  const two = dateKey(-2)
  const three = dateKey(-3)
  return {
    profile: {
      name: 'Alex Demo',
      username: 'alex demo',
      avatarUrl: '',
      sex: 'female',
      age: 22,
      heightCm: 168,
      weightKg: 62,
      activity: 'moderate',
      goal: 'maintain',
      calorieGoal: 2100,
      macroGoals: { protein: 130, carbs: 230, fat: 70 },
    },
    entries: [
      entry({
        id: 'demo-b',
        date: today,
        meal: 'Breakfast',
        name: 'Oatmeal (cooked)',
        calories: 158,
        protein: 5.5,
        carbs: 27,
        fat: 3.2,
      }),
      entry({
        id: 'demo-b2',
        date: today,
        meal: 'Breakfast',
        name: 'Banana',
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
      }),
      entry({
        id: 'demo-l',
        date: today,
        meal: 'Lunch',
        name: 'Chicken breast (grilled)',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      }),
      entry({
        id: 'demo-l2',
        date: today,
        meal: 'Lunch',
        name: 'White rice (cooked)',
        calories: 206,
        protein: 4.3,
        carbs: 45,
        fat: 0.4,
      }),
      entry({
        id: 'demo-d',
        date: today,
        meal: 'Dinner',
        name: 'Salmon (baked)',
        calories: 208,
        protein: 20,
        carbs: 0,
        fat: 13,
      }),
      entry({
        id: 'demo-y',
        date: yesterday,
        meal: 'Lunch',
        name: 'Tuna (canned in water)',
        calories: 120,
        protein: 28,
        carbs: 0,
        fat: 1,
      }),
      entry({
        id: 'demo-2',
        date: two,
        meal: 'Dinner',
        name: 'Pasta (cooked)',
        calories: 220,
        protein: 8,
        carbs: 43,
        fat: 1.3,
      }),
      entry({
        id: 'demo-3',
        date: three,
        meal: 'Breakfast',
        name: 'Egg (large)',
        servings: 2,
        calories: 144,
        protein: 12.6,
        carbs: 0.8,
        fat: 9.6,
      }),
    ],
    customFoods: [],
    friends: [
      {
        username: 'jordan lee',
        displayName: 'Jordan Lee',
        avatarUrl: '',
        addedAt: new Date().toISOString(),
      },
    ],
    chatRooms: [
      {
        id: 'demo-room',
        title: '@jordan lee',
        memberUsernames: ['alex demo', 'jordan lee'],
        createdAt: new Date().toISOString(),
      },
    ],
    chatMessages: [
      {
        id: 'demo-msg',
        roomId: 'demo-room',
        authorUsername: 'jordan lee',
        authorName: 'Jordan Lee',
        body: 'Logged lunch. On track for protein today.',
        createdAt: new Date().toISOString(),
      },
    ],
    earnedBadges: [],
    cloudUserId: null,
    deletedEntryIds: [],
    deletedFriendUsernames: [],
  }
}

async function waitForServer(child) {
  const deadline = Date.now() + 30_000
  let exited = null
  child.on('exit', (code) => {
    exited = code
  })
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`Vite exited (${exited})`)
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('Vite did not start')
}

const vite = spawn(
  'npm',
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)

try {
  await waitForServer(vite)
  await mkdir('docs/screenshots', { recursive: true })
  await mkdir('public', { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 1080 } })
  await page.goto(`${BASE}/app`)
  await page.evaluate((state) => {
    localStorage.setItem('ourcal.v2', JSON.stringify(state))
  }, demoState())
  await page.reload()
  await page.getByRole('heading', { name: 'Today' }).waitFor()
  await page.screenshot({ path: 'docs/screenshots/today.png' })

  await page.getByRole('button', { name: 'Stats' }).first().click()
  await page.getByRole('heading', { name: 'Your numbers' }).waitFor()
  await page.locator('.recharts-wrapper').first().waitFor()
  await page.screenshot({ path: 'docs/screenshots/stats.png' })

  await page.getByRole('button', { name: 'People' }).first().click()
  await page.getByRole('heading', { name: 'Friends and chat' }).waitFor()
  await page.screenshot({ path: 'docs/screenshots/people.png' })

  const todayPng = await readFile('docs/screenshots/today.png')
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await og.setContent(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; background: #f5f5f7; }
  body { display: flex; font-family: "IBM Plex Sans", system-ui, sans-serif; color: #1d1d1f; }
  .copy { width: 380px; padding: 72px 40px 72px 56px; display: flex; flex-direction: column; justify-content: center; }
  h1 { font-family: Georgia, "Source Serif 4", serif; font-size: 64px; line-height: 1; margin: 0 0 16px; font-weight: 700; }
  p { margin: 0; font-size: 22px; line-height: 1.35; color: #424245; }
  .shot { flex: 1; padding: 36px 36px 36px 0; display: flex; }
  img { width: 100%; height: 100%; object-fit: cover; object-position: left top; border: 1px solid #d2d2d7; border-radius: 6px; }
</style>
</head>
<body>
  <div class="copy">
    <h1>OurCal</h1>
    <p>A local-first calorie diary with macros, a balance score, and private friend chat.</p>
  </div>
  <div class="shot">
    <img alt="" src="data:image/png;base64,${todayPng.toString('base64')}" />
  </div>
</body>
</html>`)
  await og.screenshot({ path: 'public/og-image.png' })
  await browser.close()
  console.log('Wrote docs/screenshots/{today,stats,people}.png and public/og-image.png')
} finally {
  vite.kill('SIGTERM')
}
