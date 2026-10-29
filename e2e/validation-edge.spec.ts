import { test, expect } from '@playwright/test'
import { completeOnboarding, resetApp } from './helpers'

/**
 * Portfolio angle: edge cases / negative paths. Senior interviews love
 * "what happens when input is invalid?" — show you test failure modes.
 */
test.describe('Validation and edge cases', () => {
  test('invalid username on onboarding shows the username hint', async ({ page }) => {
    await resetApp(page)
    await page.getByLabel('Display name').fill('Bad Handle')
    await page.getByLabel('Username').fill('ab') // too short (< 3)
    await page.getByRole('button', { name: 'Start tracking' }).click()
    // Hint is always visible; the submit error uses .form-error (same copy).
    await expect(page.locator('.form-error')).toContainText(/3–20 characters/i)
    await expect(page.getByLabel('Previous day')).toHaveCount(0)
  })

  test('Add friend with garbage input shows validation error', async ({ page }) => {
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'People' }).first().click()
    await page.getByLabel('Username or invite link').fill('!!')
    await page.getByRole('button', { name: 'Add friend' }).click()
    await expect(page.getByText('Enter a valid @username or invite link.')).toBeVisible()
  })

  test('logging food requires selecting a result before Log food enables', async ({ page }) => {
    await completeOnboarding(page)
    await page
      .locator('article.meal-block')
      .filter({ hasText: 'Snack' })
      .getByRole('button', { name: 'Add food' })
      .click()
    await expect(page.getByRole('button', { name: 'Log food' })).toBeDisabled()
    await page.getByLabel('Search foods').fill('banana')
    await page.getByRole('button', { name: 'Banana' }).first().click()
    await expect(page.getByRole('button', { name: 'Log food' })).toBeEnabled()
  })

  test('next day from Today shows a weekday heading not Today', async ({ page }) => {
    await completeOnboarding(page)
    await page.getByLabel('Next day').click()
    await expect(page.getByRole('heading', { name: 'Today' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Jump to today' })).toBeVisible()
  })

  test('Reset everything returns the user to onboarding after confirm', async ({ page }) => {
    await completeOnboarding(page, { name: 'Wipe Me', username: 'wipe me' })
    await page.getByRole('button', { name: 'Profile' }).first().click()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Reset everything' }).click()
    await expect(page.getByRole('heading', { name: 'Set your daily target' })).toBeVisible()
  })
})
