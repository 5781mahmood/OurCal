import { expect, type Page } from '@playwright/test'

/**
 * Shared setup for OurCal E2E tests.
 *
 * Why helpers exist: every diary/People/Profile test needs a finished onboarding
 * profile. Duplicating that in 20 tests would be brittle and slow to maintain.
 */

/** Wipe OurCal localStorage so onboarding always shows. */
export async function resetApp(page: Page) {
  await page.goto('/app')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Set your daily target' })).toBeVisible()
}

export type OnboardOptions = {
  name?: string
  username?: string
  age?: string
  heightCm?: string
  weightKg?: string
}

/** Fill onboarding and enter the Today diary. */
export async function completeOnboarding(page: Page, options: OnboardOptions = {}) {
  const {
    name = 'Alex Student',
    username = 'alex student',
    age = '22',
    heightCm = '175',
    weightKg = '75',
  } = options

  await resetApp(page)
  await page.getByLabel('Display name').fill(name)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Age').fill(age)
  await page.getByLabel('Height (cm)').fill(heightCm)
  await page.getByLabel('Weight (kg)').fill(weightKg)
  await page.getByRole('button', { name: 'Start tracking' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Today diary chrome (streak + day nav) should be present after save.
  await expect(page.getByLabel('Previous day')).toBeVisible()
}

/** Open Add food for a meal, search, pick first result, log. */
export async function logFoodFromSearch(
  page: Page,
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack',
  query: string,
  foodName: string,
) {
  const mealBlock = page.locator('article.meal-block').filter({ hasText: meal })
  await mealBlock.getByRole('button', { name: 'Add food' }).click()
  await expect(page.getByRole('dialog', { name: `Add to ${meal}` })).toBeVisible()
  await page.getByLabel('Search foods').fill(query)
  // Use a plain string name — RegExp would treat "(cooked)" as a capture group.
  await page.getByRole('button', { name: foodName }).first().click()
  await page.getByRole('button', { name: 'Log food' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** Read the calorie ring center number (logged kcal). */
export async function ringCalories(page: Page): Promise<number> {
  const text = await page.locator('.ring-center strong').innerText()
  return Number(text.replace(/[^\d]/g, ''))
}
