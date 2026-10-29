import { test, expect } from '@playwright/test'
import { completeOnboarding } from './helpers'

test.describe('Marketing and routing', () => {
  test('landing page shows brand hero and CTA into the app', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'OurCal' }).first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Track meals with clarity/i }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Start in the app' }).click()
    await expect(page).toHaveURL(/\/app/)
  })

  test('unknown paths show the custom 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'This page is not in the diary.' }),
    ).toBeVisible()
    // Header/footer also link to the app — scope to the 404 main CTA.
    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(main.getByRole('link', { name: 'Open app' })).toBeVisible()
  })

  test('404 Open app reaches TrackerApp', async ({ page }) => {
    await page.goto('/missing-page')
    await page.getByRole('main').getByRole('link', { name: 'Open app' }).click()
    await expect(page).toHaveURL(/\/app/)
    // Fresh browser context → onboarding (no profile yet).
    await expect(page.getByRole('heading', { name: 'Set your daily target' })).toBeVisible()
  })

  test('invite deep link /app?u= opens People after onboarding', async ({ page }) => {
    // Seed a profile first, then hit an invite URL like a scanned QR would.
    await completeOnboarding(page, { username: 'host user' })
    await page.goto('/app?u=friend_demo')
    // Without cloud, unknown usernames still add locally; People tab should open.
    await expect(page.getByRole('heading', { name: 'Friends and chat' })).toBeVisible()
  })
})
