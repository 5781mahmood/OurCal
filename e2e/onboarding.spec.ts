import { test, expect } from '@playwright/test'
import { resetApp } from './helpers'

/**
 * Onboarding = first-run gate. If this breaks, nothing else in /app is reachable.
 */
test.describe('Onboarding', () => {
  test('shows a calorie target after filling the profile', async ({ page }) => {
    await resetApp(page)

    await page.getByLabel('Display name').fill('Alex Student')
    await page.getByLabel('Username').fill('alex_student')
    await page.getByLabel('Age').fill('22')
    await page.getByLabel('Height (cm)').fill('175')
    await page.getByLabel('Weight (kg)').fill('75')

    // Narrow to the daily-goal card. TDEE uses the same .estimate-num class.
    const goal = page
      .locator('.estimate > div')
      .filter({ hasText: 'Your daily goal' })
      .locator('.estimate-num')
    await expect(goal).toBeVisible()
    await expect(goal).toHaveText(/\d+ kcal/)
  })

  test('suggests a username from the display name with underscores', async ({ page }) => {
    await resetApp(page)
    const username = page.getByLabel('Username')

    // Type key by key: fill() would set the whole name at once and skip
    // the intermediate values a real user produces.
    await page.getByLabel('Display name').pressSequentially('Test Alpha!')
    await expect(username).toHaveValue('test_alpha')

    await username.fill('my_handle')
    await page.getByLabel('Display name').fill('Someone Else')
    await expect(username).toHaveValue('my_handle')
  })

  test('blocks submit without a display name', async ({ page }) => {
    await resetApp(page)
    // Defaults already have age/height/weight; leave name empty.
    await page.getByLabel('Username').fill('nameless_user')
    await page.getByRole('button', { name: 'Start tracking' }).click()
    await expect(page.getByText('Add your display name.')).toBeVisible()
    // Still on onboarding, so the diary day nav must not appear.
    await expect(page.getByLabel('Previous day')).toHaveCount(0)
  })

  test('Start tracking opens the Today diary', async ({ page }) => {
    await resetApp(page)
    await page.getByLabel('Display name').fill('Jordan Lee')
    await page.getByLabel('Username').fill('jordan_lee')
    await page.getByRole('button', { name: 'Start tracking' }).click()

    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Breakfast' }).or(page.getByRole('heading', { name: 'Breakfast' }))).toBeVisible()
    await expect(page.locator('article.meal-block').filter({ hasText: 'Breakfast' })).toBeVisible()
    await expect(page.getByLabel(/kcal logged/i)).toBeVisible()
  })

  test('shows Protein / Carbs / Fat in the estimate panel', async ({ page }) => {
    await resetApp(page)
    await page.getByLabel('Display name').fill('Macro Check')
    await page.getByLabel('Username').fill('macro_check')

    const macros = page.locator('.estimate-macros')
    await expect(macros.getByText('Protein')).toBeVisible()
    await expect(macros.getByText('Carbs')).toBeVisible()
    await expect(macros.getByText('Fat')).toBeVisible()
    await expect(macros.locator('li strong').first()).toHaveText(/\d+g/)
  })
})
