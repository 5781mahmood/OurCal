import { test, expect } from '@playwright/test'
import { completeOnboarding, resetApp } from './helpers'

// Invalid input and edge cases: bad usernames, bad friend input, disabled controls, reset.
test.describe('Validation and edge cases', () => {
  test('invalid username on onboarding shows the username hint', async ({ page }) => {
    await resetApp(page)
    const username = page.getByLabel('Username')
    const fieldError = page.locator('#username-error')
    await page.getByLabel('Display name').fill('Bad Handle')

    // Too long: the full value stays in the field and the error says why.
    const long = 'a'.repeat(23)
    await username.fill(long)
    await expect(username).toHaveValue(long)
    await expect(fieldError).toHaveText('Too long: 23 characters. The limit is 20.')
    await expect(username).toHaveAttribute('aria-invalid', 'true')

    await username.fill('bad handle')
    await expect(fieldError).toHaveText('Spaces are not allowed. Use an underscore instead.')

    await username.fill('ab') // too short (< 3), only reported after submit
    await expect(fieldError).toHaveCount(0)
    await page.getByRole('button', { name: 'Start tracking' }).click()
    // Hint is always visible; the submit error uses .form-error (same copy).
    await expect(page.locator('.form-error')).toContainText(/3-20 characters/i)
    await expect(fieldError).toContainText('Too short')
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
    await completeOnboarding(page, { name: 'Wipe Me', username: 'wipe_me' })
    await page.getByRole('button', { name: 'Profile' }).first().click()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Reset everything' }).click()
    await expect(page.getByRole('heading', { name: 'Set your daily target' })).toBeVisible()
  })
})
