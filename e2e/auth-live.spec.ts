import { expect, test } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { completeOnboarding } from './helpers'

/**
 * Opt-in: runs the real app against a real Supabase *test* project.
 * Needs SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY.
 * The service role key is used only here, in Node, to create throwaway users
 * and mint magic links. It never reaches the browser or the app bundle.
 * Setup steps: docs/security.md#running-the-live-tests
 */

const url = process.env.SUPABASE_TEST_URL ?? ''
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? ''
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? ''
const live = Boolean(url && anonKey && serviceKey)

function localDateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Seeded = { id: string; email: string; username: string; food: string }

test.describe('live Supabase project (opt-in)', () => {
  test.skip(
    !live,
    'Set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY to run against a Supabase test project.',
  )
  test.describe.configure({ mode: 'serial' })

  const run = Date.now().toString(36)
  let admin: SupabaseClient
  let alice: Seeded
  let bob: Seeded

  async function seedUser(tag: string, food: string): Promise<Seeded> {
    const email = `ourcal-e2e-${run}-${tag}@example.com`
    const username = `e2e_${tag}_${run}`
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
    const id = data.user.id
    const profile = await admin
      .from('profiles')
      .insert({ user_id: id, username, display_name: tag.toUpperCase() })
    if (profile.error) throw new Error(`profile insert failed: ${profile.error.message}`)
    const diary = await admin.from('diary_entries').insert({
      id: crypto.randomUUID(),
      user_id: id,
      username,
      entry_date: localDateKey(),
      meal: 'lunch',
      name: food,
      servings: 1,
      calories: 500,
      protein: 20,
      carbs: 50,
      fat: 15,
    })
    if (diary.error) throw new Error(`diary insert failed: ${diary.error.message}`)
    return { id, email, username, food }
  }

  test.beforeAll(async () => {
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    alice = await seedUser('a', `Alice live bowl ${run}`)
    bob = await seedUser('b', `Bob live burrito ${run}`)
  })

  test.afterAll(async () => {
    // on delete cascade removes their profiles and diary rows too.
    for (const user of [alice, bob]) {
      if (user) await admin.auth.admin.deleteUser(user.id)
    }
  })

  test("signed-out user cannot read another user's rows (REST API, anon key)", async () => {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } })

    const asAdmin = await admin.from('diary_entries').select('id').eq('user_id', alice.id)
    expect(asAdmin.data, 'seeded row should exist').toHaveLength(1)

    const diary = await anon.from('diary_entries').select('*').eq('user_id', alice.id)
    expect(diary.error).toBeNull()
    expect(diary.data).toEqual([])

    const profiles = await anon.from('profiles').select('*').eq('user_id', alice.id)
    expect(profiles.data).toEqual([])
  })

  test('signed-in user sees only their own diary (browser, magic link)', async ({
    page,
    baseURL,
  }) => {
    await completeOnboarding(page, { name: 'Alice Live', username: alice.username })

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: alice.email,
      options: { redirectTo: `${baseURL}/app` },
    })
    if (error) throw new Error(`generateLink failed: ${error.message}`)

    await page.goto(data.properties.action_link)
    await page.waitForURL((u) => u.href.startsWith(`${baseURL}/app`), {
      timeout: 20_000,
    })

    await expect(page.getByText(alice.food).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(bob.food)).toHaveCount(0)

    await page.getByRole('button', { name: 'Profile' }).first().click()
    await expect(page.getByText(`Signed in as ${alice.email}`)).toBeVisible()
  })
})
