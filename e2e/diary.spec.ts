import { test, expect } from '@playwright/test'
import { completeOnboarding, logFoodFromSearch, ringCalories } from './helpers'

/**
 * Diary tests = core product value. If logging/deleting/navigation lies,
 * users stop trusting calorie counts.
 */
test.describe('Today diary', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page)
  })

  test('adding a food updates the calorie ring', async ({ page }) => {
    const before = await ringCalories(page)
    expect(before).toBe(0)

    await logFoodFromSearch(page, 'Breakfast', 'banana', 'Banana')

    const after = await ringCalories(page)
    // Catalog banana is 105 kcal at 1 serving.
    expect(after).toBe(105)
    await expect(page.getByLabel(/kcal logged/i)).toHaveAttribute(
      'aria-label',
      /105 of \d+/,
    )
    await expect(
      page.locator('article.meal-block').filter({ hasText: 'Breakfast' }).getByText('Banana'),
    ).toBeVisible()
  })

  test('deleting a food removes it and resets the ring', async ({ page }) => {
    await logFoodFromSearch(page, 'Lunch', 'apple', 'Apple')
    expect(await ringCalories(page)).toBe(95)

    const lunch = page.locator('article.meal-block').filter({ hasText: 'Lunch' })
    await lunch.getByRole('button', { name: 'Delete Apple' }).click()

    await expect(lunch.getByText('Apple')).toHaveCount(0)
    await expect(lunch.getByText('Nothing logged yet.')).toBeVisible()
    expect(await ringCalories(page)).toBe(0)
  })

  test('servings stepper changes calories without re-adding', async ({ page }) => {
    await logFoodFromSearch(page, 'Snack', 'egg', 'Egg (large)')
    expect(await ringCalories(page)).toBe(72)

    const snack = page.locator('article.meal-block').filter({ hasText: 'Snack' })
    await snack.getByRole('button', { name: 'Increase servings' }).click()

    // 72 * 1.25 = 90
    expect(await ringCalories(page)).toBe(90)
    await expect(snack.getByText('1.25×')).toBeVisible()
  })

  test('day navigation leaves today and Jump to today returns', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()

    await page.getByLabel('Previous day').click()
    await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jump to today' })).toBeVisible()

    // Food logged on yesterday should not show on a different day ring after jump.
    await logFoodFromSearch(page, 'Dinner', 'rice', 'White rice (cooked)')
    expect(await ringCalories(page)).toBe(206)

    await page.getByRole('button', { name: 'Jump to today' }).click()
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    expect(await ringCalories(page)).toBe(0)
  })

  test('clear day asks for confirm and empties meals', async ({ page }) => {
    await logFoodFromSearch(page, 'Breakfast', 'oatmeal', 'Oatmeal (cooked)')
    expect(await ringCalories(page)).toBeGreaterThan(0)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Clear all food for this day' }).click()

    expect(await ringCalories(page)).toBe(0)
    await expect(page.getByText('Nothing logged yet.').first()).toBeVisible()
  })

  test('dismissing clear day keeps food logged', async ({ page }) => {
    await logFoodFromSearch(page, 'Breakfast', 'banana', 'Banana')
    page.once('dialog', (dialog) => dialog.dismiss())
    await page.getByRole('button', { name: 'Clear all food for this day' }).click()
    expect(await ringCalories(page)).toBe(105)
  })

  test('food search empty state suggests custom food', async ({ page }) => {
    const breakfast = page.locator('article.meal-block').filter({ hasText: 'Breakfast' })
    await breakfast.getByRole('button', { name: 'Add food' }).click()
    await page.getByLabel('Search foods').fill('zzzznotarealfood999')
    await expect(
      page.getByText('No foods match. Try another name or add a custom food.'),
    ).toBeVisible()
  })

  test('custom food can be saved and logged', async ({ page }) => {
    const dinner = page.locator('article.meal-block').filter({ hasText: 'Dinner' })
    await dinner.getByRole('button', { name: 'Add food' }).click()
    await page.getByRole('button', { name: 'Custom' }).click()
    await page.getByLabel('Food name').fill('Homemade stew')
    await page.getByLabel('Calories').fill('340')
    await page.getByLabel('Protein (g)').fill('22')
    await page.getByRole('button', { name: 'Save and log' }).click()

    await expect(dinner.getByText('Homemade stew')).toBeVisible()
    expect(await ringCalories(page)).toBe(340)
  })
})
