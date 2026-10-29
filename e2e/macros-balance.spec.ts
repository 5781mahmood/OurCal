import { test, expect } from '@playwright/test'
import { completeOnboarding, logFoodFromSearch, ringCalories } from './helpers'

/**
 * Portfolio angle: domain UI — macros and balance are product differentiators.
 * Assert labels/levels, not just "something rendered."
 */
test.describe('Macros and balance', () => {
  test('macro bars show level words (Low / On track / High / Over)', async ({ page }) => {
    await completeOnboarding(page)
    // Empty day → protein/carbs/fat should read Low (0 vs goal).
    await expect(page.locator('.macro-level-word').first()).toHaveText('Low')
    await expect(page.getByText('Balance index')).toBeVisible()
  })

  test('logging protein-heavy food raises Protein bar value text', async ({ page }) => {
    await completeOnboarding(page)
    const proteinRow = page.locator('.macro-bar').filter({ hasText: 'Protein' })
    const before = await proteinRow.locator('.macro-bar-head span').nth(1).innerText()

    await logFoodFromSearch(page, 'Lunch', 'chicken', 'Chicken breast (grilled)')

    const after = await proteinRow.locator('.macro-bar-head span').nth(1).innerText()
    expect(after).not.toBe(before)
    expect(after).toMatch(/31/) // catalog chicken breast protein grams
    expect(await ringCalories(page)).toBe(165)
  })

  test('meal kcal header updates when an item is logged', async ({ page }) => {
    await completeOnboarding(page)
    const breakfast = page.locator('article.meal-block').filter({ hasText: 'Breakfast' })
    await expect(breakfast.locator('.meal-kcal')).toContainText('0')

    await logFoodFromSearch(page, 'Breakfast', 'oatmeal', 'Oatmeal (cooked)')
    await expect(breakfast.locator('.meal-kcal')).toContainText('158')
  })
})
