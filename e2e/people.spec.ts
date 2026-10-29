import { test, expect } from '@playwright/test'
import { completeOnboarding } from './helpers'

test.describe('People tab', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { username: 'solo user' })
    await page.getByRole('button', { name: 'People' }).first().click()
    await expect(page.getByRole('heading', { name: 'Friends and chat' })).toBeVisible()
  })

  test('shows invite QR and copy invite link control', async ({ page }) => {
    await expect(page.locator('.qr-block svg')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy invite link' })).toBeVisible()
    await expect(page.getByText(/Global handle: @solo user/i)).toBeVisible()
  })

  test('copy invite link writes /app?u= to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copy invite link' }).click()
    await expect(page.getByText('Invite link copied.')).toBeVisible()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toMatch(/\/app\?u=solo(%20|\+| )?user|\/app\?u=solo%20user/)
  })

  test('cannot start a group thread with zero friends', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New group thread' })).toBeDisabled()
    await expect(
      page.getByText('Add a friend before you can start a group thread.'),
    ).toBeVisible()
  })

  test('adding yourself as a friend shows an error', async ({ page }) => {
    await page.getByLabel('Username or invite link').fill('solo user')
    await page.getByRole('button', { name: 'Add friend' }).click()
    await expect(page.getByText('You cannot add yourself.')).toBeVisible()
  })

  test('adding a local friend enables Message and group thread', async ({ page }) => {
    // Cloud may be off in CI — local add still works when lookup is skipped.
    await page.getByLabel('Username or invite link').fill('buddy one')
    await page.getByRole('button', { name: 'Add friend' }).click()

    // If cloud is on and buddy one does not exist, fail closed — skip soft assert.
    const cloudReject = page.getByText('No OurCal user with that username.')
    if (await cloudReject.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Cloud enabled: unknown username correctly rejected.',
      })
      return
    }

    await expect(page.getByText('@buddy one', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Message' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New group thread' })).toBeEnabled()
  })

  test('chat compose Send stays disabled while empty', async ({ page }) => {
    await page.getByLabel('Username or invite link').fill('chat pal')
    await page.getByRole('button', { name: 'Add friend' }).click()
    if (await page.getByText('No OurCal user with that username.').isVisible().catch(() => false)) {
      test.skip(true, 'Cloud rejects unknown users; chat compose needs a room.')
    }
    await page.getByRole('button', { name: 'Message' }).click()
    await expect(page.getByLabel('Message')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled()
    await page.getByLabel('Message').fill('Logged breakfast — staying on track.')
    await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled()
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('.message-list')).toContainText('Logged breakfast')
  })
})
