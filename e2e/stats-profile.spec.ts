import { test, expect } from '@playwright/test'
import { completeOnboarding, logFoodFromSearch } from './helpers'

test.describe('Stats', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page)
  })

  test('empty week shows an honest empty chart state', async ({ page }) => {
    await page.getByRole('button', { name: 'Stats' }).first().click()
    await expect(page.getByRole('heading', { name: 'Your numbers' })).toBeVisible()
    await expect(
      page.getByText(/No food logged in the last week/i),
    ).toBeVisible()
    await expect(page.getByText(/Today vs goal/i)).toBeVisible()
  })

  test('after logging food, week chart and today meal stats appear', async ({ page }) => {
    await logFoodFromSearch(page, 'Breakfast', 'banana', 'Banana')
    await page.getByRole('button', { name: 'Stats' }).first().click()

    await expect(page.getByRole('heading', { name: 'Last 7 days' })).toBeVisible()
    // Chart container replaces the empty-week copy.
    await expect(page.getByText(/No food logged in the last week/i)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Today by meal' })).toBeVisible()
    await expect(page.locator('.meal-stat-list')).toContainText('Breakfast')
  })
})

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { name: 'Sam Profile', username: 'sam profile' })
    await page.getByRole('button', { name: 'Profile' }).first().click()
  })

  test('shows name, username, macro columns, and sync status', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sam Profile' })).toBeVisible()
    await expect(page.getByText('@sam profile')).toBeVisible()
    await expect(page.locator('.macro-goal-cols').getByText('Protein')).toBeVisible()
    await expect(page.locator('.macro-goal-cols').getByText('Carbs')).toBeVisible()
    await expect(page.locator('.macro-goal-cols').getByText('Fat')).toBeVisible()
    await expect(
      page.getByText(/Synced|This device only/),
    ).toBeVisible()
  })

  test('Edit profile Cancel returns without saving a rename', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit profile' }).click()
    await expect(page.getByRole('heading', { name: 'Set your daily target' })).toBeVisible()
    await page.getByLabel('Display name').fill('Should Not Stick')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Sam Profile' })).toBeVisible()
  })

  test('Export JSON downloads a backup file', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^ourcal-export-.*\.json$/)

    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import('node:fs/promises')
    const raw = await fs.readFile(path!, 'utf8')
    const data = JSON.parse(raw) as { app?: string; profile?: { username?: string } }
    expect(data.app).toBe('OurCal')
    expect(data.profile?.username).toBe('sam profile')
  })
})
