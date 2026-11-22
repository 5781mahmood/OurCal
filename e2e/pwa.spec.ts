import { expect, test } from '@playwright/test'

// Web app manifest is served and has the fields installers require.

test.describe('PWA manifest', () => {
  test('manifest is served and valid', async ({ request, page }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()

    const res = await request.get(href!)
    expect(res.ok(), `manifest HTTP ${res.status()}`).toBe(true)
    expect(res.headers()['content-type'] ?? '').toMatch(/json|webmanifest/)

    const manifest = (await res.json()) as {
      name?: string
      short_name?: string
      theme_color?: string
      start_url?: string
      display?: string
      icons?: { src: string; sizes: string; type?: string }[]
    }

    expect(manifest.name).toBe('OurCal')
    expect(manifest.short_name).toBe('OurCal')
    expect(manifest.theme_color).toBe('#00656b')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toMatch(/\/app/)

    const icons = manifest.icons ?? []
    const sizes = icons.map((icon) => icon.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))

    for (const icon of icons) {
      const src = icon.src.startsWith('http')
        ? icon.src
        : new URL(icon.src, 'http://127.0.0.1:5173').pathname
      const iconRes = await request.get(src)
      expect(iconRes.ok(), `${icon.src} HTTP ${iconRes.status()}`).toBe(true)
      expect(iconRes.headers()['content-type'] ?? '').toMatch(/image\/png/)
    }
  })
})
