import { expect, test, type Page, type Route } from '@playwright/test'
import { completeOnboarding, ringCalories } from './helpers'

/**
 * Barcode lookup against a mocked Open Food Facts API.
 * Every request to an openfoodfacts host is intercepted. Requests that a test
 * did not mock are aborted and fail the test in afterEach.
 */

const isOpenFoodFacts = (url: URL) => /(^|\.)openfoodfacts\.(org|net)$/.test(url.hostname)

// The dev server registers a service worker, which would bypass page.route.
test.use({ serviceWorkers: 'block' })

let unmocked: string[] = []

test.beforeEach(async ({ page }) => {
  unmocked = []
  await page.route(isOpenFoodFacts, (route) => {
    unmocked.push(route.request().url())
    return route.abort('blockedbyclient')
  })
  await completeOnboarding(page)
})

test.afterEach(() => {
  expect(unmocked, 'unmocked Open Food Facts requests').toEqual([])
})

/** Registered after the guard, so it takes precedence. Returns the URLs it answered. */
async function mockOpenFoodFacts(page: Page, handler: (route: Route) => Promise<void>) {
  const calls: string[] = []
  await page.route(isOpenFoodFacts, async (route) => {
    calls.push(route.request().url())
    await handler(route)
  })
  return calls
}

async function openBarcodeTab(page: Page, meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack') {
  const block = page.locator('article.meal-block').filter({ hasText: meal })
  await block.getByRole('button', { name: 'Add food' }).click()
  const dialog = page.getByRole('dialog', { name: `Add to ${meal}` })
  await dialog.getByRole('button', { name: 'Barcode', exact: true }).click()
  return { block, dialog }
}

test.describe('Barcode lookup', () => {
  test('per-serving product logs with servings and shows the source', async ({ page }) => {
    const calls = await mockOpenFoodFacts(page, (route) =>
      route.fulfill({
        json: {
          code: '0123456789012',
          status: 1,
          status_verbose: 'product found',
          product: {
            product_name: 'Fixture Granola Bar',
            brands: 'Test Brand',
            serving_size: '40 g',
            nutriments: {
              'energy-kcal_serving': 180,
              proteins_serving: 4,
              carbohydrates_serving: 26,
              fat_serving: 7,
              'energy-kcal_100g': 450,
            },
          },
        },
      }),
    )

    const { block, dialog } = await openBarcodeTab(page, 'Breakfast')
    await dialog.getByLabel('Barcode number').fill('0123456789012')
    await dialog.getByRole('button', { name: 'Look up' }).click()

    const result = dialog.getByRole('form', { name: 'Barcode result' })
    await expect(result).toContainText('Fixture Granola Bar')
    await expect(result).toContainText('Test Brand')
    await expect(result).toContainText('Per serving (40 g): 180 kcal')
    await expect(result).toContainText('Source: Open Food Facts')
    await expect(result.getByRole('link', { name: 'Open Food Facts' })).toHaveAttribute(
      'href',
      'https://world.openfoodfacts.org/product/0123456789012',
    )

    await result.getByLabel('Servings', { exact: true }).fill('2')
    await result.getByRole('button', { name: 'Log food' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(await ringCalories(page)).toBe(360)
    await expect(block.getByText('Fixture Granola Bar')).toBeVisible()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain(
      'https://world.openfoodfacts.org/api/v2/product/0123456789012.json',
    )
  })

  test('per-100 g product asks for grams before logging', async ({ page }) => {
    await mockOpenFoodFacts(page, (route) =>
      route.fulfill({
        json: {
          code: '12345670',
          status: 1,
          product: {
            product_name: 'Fixture Oats',
            nutriments: {
              'energy-kcal_100g': 370,
              proteins_100g: 13,
              carbohydrates_100g: 60,
              fat_100g: 7,
            },
          },
        },
      }),
    )

    const { block, dialog } = await openBarcodeTab(page, 'Lunch')
    await dialog.getByLabel('Barcode number').fill('12345670')
    await dialog.getByRole('button', { name: 'Look up' }).click()

    const result = dialog.getByRole('form', { name: 'Barcode result' })
    await expect(result).toContainText('Per 100 g: 370 kcal')
    await expect(result).toContainText('Source: Open Food Facts')
    await expect(result.getByLabel('Servings', { exact: true })).toHaveCount(0)

    await result.getByRole('button', { name: 'Log food' }).click()
    await expect(result.getByText('Enter how many grams you had.')).toBeVisible()
    await expect(dialog).toBeVisible()

    await result.getByLabel('Grams').fill('50')
    await expect(result).toContainText('≈ 185 kcal')
    await result.getByRole('button', { name: 'Log food' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(await ringCalories(page)).toBe(185)
    await expect(block.getByText('Fixture Oats (50 g)')).toBeVisible()
  })

  test('unknown barcode falls back to Custom with the barcode filled in', async ({ page }) => {
    await mockOpenFoodFacts(page, (route) =>
      route.fulfill({
        status: 404,
        json: { code: '0000000000017', status: 0, status_verbose: 'product not found' },
      }),
    )

    const { block, dialog } = await openBarcodeTab(page, 'Dinner')
    await dialog.getByLabel('Barcode number').fill('0000000000017')
    await dialog.getByRole('button', { name: 'Look up' }).click()

    await expect(dialog.getByRole('button', { name: 'Custom' })).toHaveClass(/active/)
    await expect(dialog.getByRole('status')).toHaveText(
      'Barcode 0000000000017 is not on Open Food Facts. Add it as a custom food.',
    )
    await expect(dialog.getByLabel('Barcode (optional)')).toHaveValue('0000000000017')

    await dialog.getByLabel('Food name').fill('Fixture Crackers')
    await dialog.getByLabel('Calories').fill('120')
    await dialog.getByRole('button', { name: 'Save and log' }).click()

    await expect(block.getByText('Fixture Crackers')).toBeVisible()
    expect(await ringCalories(page)).toBe(120)
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('ourcal.v2') ?? '{}').customFoods?.[0],
    )
    expect(saved).toMatchObject({ name: 'Fixture Crackers', barcode: '0000000000017' })
  })

  test('API failure falls back to Custom with the barcode filled in', async ({ page }) => {
    const calls = await mockOpenFoodFacts(page, (route) => route.abort('failed'))

    const { dialog } = await openBarcodeTab(page, 'Snack')
    await dialog.getByLabel('Barcode number').fill('12345670')
    await dialog.getByRole('button', { name: 'Look up' }).click()

    await expect(dialog.getByRole('button', { name: 'Custom' })).toHaveClass(/active/)
    await expect(dialog.getByRole('status')).toHaveText(
      'Could not reach Open Food Facts. Add barcode 12345670 as a custom food.',
    )
    await expect(dialog.getByLabel('Barcode (optional)')).toHaveValue('12345670')
    expect(calls).toHaveLength(1)
  })

  test('invalid barcode shows an error and sends no request', async ({ page }) => {
    const { dialog } = await openBarcodeTab(page, 'Breakfast')
    await dialog.getByLabel('Barcode number').fill('123')
    await dialog.getByRole('button', { name: 'Look up' }).click()

    await expect(dialog.getByText('Enter a barcode of 8 to 14 digits.')).toBeVisible()
    await expect(dialog.getByRole('form', { name: 'Barcode result' })).toHaveCount(0)
  })
})
