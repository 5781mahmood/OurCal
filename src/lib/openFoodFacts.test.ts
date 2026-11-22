import { describe, expect, it, vi } from 'vitest'
import { lookupBarcode, normalizeBarcode, scaleTo } from './openFoodFacts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('normalizeBarcode', () => {
  it('accepts 8 to 14 digits and strips spaces and hyphens', () => {
    expect(normalizeBarcode('0123 4567 89012')).toBe('0123456789012')
    expect(normalizeBarcode('12345678')).toBe('12345678')
    expect(normalizeBarcode('1234-5678')).toBe('12345678')
  })

  it('rejects short, long and non-numeric input', () => {
    expect(normalizeBarcode('1234567')).toBeNull()
    expect(normalizeBarcode('123456789012345')).toBeNull()
    expect(normalizeBarcode('12345abc')).toBeNull()
    expect(normalizeBarcode('')).toBeNull()
  })
})

describe('lookupBarcode', () => {
  it('requests the v2 product endpoint for the barcode', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 0 }))
    await lookupBarcode('0123456789012', { fetchImpl })
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0])
    expect(url.startsWith('https://world.openfoodfacts.org/api/v2/product/0123456789012.json')).toBe(
      true,
    )
  })

  it('uses per-serving values when present', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        status: 1,
        product: {
          product_name: 'Fixture Granola Bar',
          brands: 'Test Brand, Other Brand',
          serving_size: '40 g',
          nutriments: {
            'energy-kcal_serving': 182.4,
            proteins_serving: 3.24,
            carbohydrates_serving: 26,
            fat_serving: 7.1,
            'energy-kcal_100g': 456,
            proteins_100g: 8.1,
          },
        },
      }),
    )
    const result = await lookupBarcode('0123456789012', { fetchImpl })
    expect(result).toEqual({
      status: 'found',
      product: {
        barcode: '0123456789012',
        name: 'Fixture Granola Bar',
        brand: 'Test Brand',
        basis: 'serving',
        servingLabel: '40 g',
        nutrition: { calories: 182, protein: 3.2, carbs: 26, fat: 7.1 },
      },
    })
  })

  it('falls back to per-100 g values when there is no per-serving kcal', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        status: 1,
        product: {
          product_name: 'Fixture Oats',
          nutriments: {
            'energy-kcal_100g': 370,
            proteins_100g: 13,
            carbohydrates_100g: '60',
          },
        },
      }),
    )
    const result = await lookupBarcode('12345678', { fetchImpl })
    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.product.basis).toBe('100g')
    expect(result.product.servingLabel).toBe('100 g')
    expect(result.product.nutrition).toEqual({ calories: 370, protein: 13, carbs: 60, fat: 0 })
    expect(scaleTo(result.product.nutrition, 150)).toEqual({
      calories: 555,
      protein: 19.5,
      carbs: 90,
      fat: 0,
    })
  })

  it('reports incomplete when the product has no kcal value', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 1, product: { product_name: 'Fixture Tea', nutriments: {} } }),
    )
    expect(await lookupBarcode('12345678', { fetchImpl })).toEqual({
      status: 'incomplete',
      barcode: '12345678',
      name: 'Fixture Tea',
    })
  })

  it('treats HTTP 404 and status 0 as not found', async () => {
    const notFound404 = vi.fn(async () => jsonResponse({ status: 0 }, 404))
    const notFound200 = vi.fn(async () => jsonResponse({ status: 0 }))
    expect((await lookupBarcode('12345678', { fetchImpl: notFound404 })).status).toBe(
      'not_found',
    )
    expect((await lookupBarcode('12345678', { fetchImpl: notFound200 })).status).toBe(
      'not_found',
    )
  })

  it('reports an error for server errors, bad JSON and network failures', async () => {
    const serverError = vi.fn(async () => new Response('oops', { status: 503 }))
    const badJson = vi.fn(async () => new Response('<html>', { status: 200 }))
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    for (const fetchImpl of [serverError, badJson, offline]) {
      expect((await lookupBarcode('12345678', { fetchImpl })).status).toBe('error')
    }
  })

  it('aborts after the timeout', async () => {
    const hang = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const result = await lookupBarcode('12345678', { fetchImpl: hang, timeoutMs: 10 })
    expect(result.status).toBe('error')
  })
})
