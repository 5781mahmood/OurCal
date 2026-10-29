import { test, expect } from '@playwright/test'
import { completeOnboarding, logFoodFromSearch } from './helpers'

/**
 * Portfolio angle: companies care that critical flows are keyboard-reachable
 * and that interactive controls have accessible names (getByRole works = good a11y).
 */
test.describe('Accessibility smoke', () => {
  test('primary app nav is reachable by role name after onboarding', async ({ page }) => {
    await completeOnboarding(page)

    for (const label of ['Today', 'Stats', 'People', 'Profile'] as const) {
      await page.getByRole('button', { name: label }).first().click()
      await expect(page.getByRole('button', { name: label }).first()).toHaveClass(/active/)
    }
  })

  test('Add food dialog traps focus path: Escape closes it', async ({ page }) => {
    await completeOnboarding(page)
    await page
      .locator('article.meal-block')
      .filter({ hasText: 'Breakfast' })
      .getByRole('button', { name: 'Add food' })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('calorie ring exposes an accessible name with logged vs goal', async ({ page }) => {
    await completeOnboarding(page)
    await logFoodFromSearch(page, 'Lunch', 'apple', 'Apple')
    await expect(page.getByLabel(/kcal logged/i)).toHaveAttribute(
      'aria-label',
      /95 of \d+/,
    )
  })
})
