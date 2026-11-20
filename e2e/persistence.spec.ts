import { test, expect } from '@playwright/test'
import { completeOnboarding, logFoodFromSearch, ringCalories } from './helpers'

// localStorage persistence across reloads, and JSON export/import round trip.
test.describe('Persistence', () => {
  test('profile and logged food survive a full page reload', async ({ page }) => {
    await completeOnboarding(page, { name: 'Persist User', username: 'persist_user' })
    await logFoodFromSearch(page, 'Breakfast', 'banana', 'Banana')
    expect(await ringCalories(page)).toBe(105)

    await page.reload()

    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await expect(
      page.locator('article.meal-block').filter({ hasText: 'Breakfast' }).getByText('Banana'),
    ).toBeVisible()
    expect(await ringCalories(page)).toBe(105)
  })

  test('import JSON restores a previously exported diary', async ({ page }) => {
    await completeOnboarding(page, { name: 'Export Me', username: 'export_me' })
    await logFoodFromSearch(page, 'Snack', 'apple', 'Apple')

    await page.getByRole('button', { name: 'Profile' }).first().click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export JSON' }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).toBeTruthy()

    // Wipe local state, then re-import the file we just downloaded.
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Set your daily target' })).toBeVisible()

    // Complete a throwaway onboard so Profile is reachable, then import over it.
    await page.getByLabel('Display name').fill('Temp')
    await page.getByLabel('Username').fill('temp_user')
    await page.getByRole('button', { name: 'Start tracking' }).click()
    await page.getByRole('button', { name: 'Profile' }).first().click()

    const fileInput = page.locator('input[type="file"][accept*="json"]')
    await fileInput.setInputFiles(path!)

    await expect(page.getByText('Import successful.')).toBeVisible()
    await page.getByRole('button', { name: 'Today' }).first().click()
    await expect(page.getByText('Apple')).toBeVisible()
    expect(await ringCalories(page)).toBe(95)
  })
})
