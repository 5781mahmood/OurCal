export const OFF_PRODUCT_API = 'https://world.openfoodfacts.org/api/v2/product'
export const OFF_PRODUCT_PAGE = 'https://world.openfoodfacts.org/product'

const FIELDS = 'product_name,brands,serving_size,nutriments'

export interface BarcodeNutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface BarcodeProduct {
  barcode: string
  name: string
  brand?: string
  /** 'serving' when Open Food Facts has per-serving values, otherwise '100g'. */
  basis: 'serving' | '100g'
  servingLabel: string
  nutrition: BarcodeNutrition
}

export type BarcodeLookup =
  | { status: 'found'; product: BarcodeProduct }
  /** Product exists but has no kcal value we can log. */
  | { status: 'incomplete'; barcode: string; name?: string }
  | { status: 'not_found'; barcode: string }
  | { status: 'error'; barcode: string }

/** Strips spaces and hyphens. Returns null unless 8 to 14 digits remain (EAN-8 to GTIN-14). */
export function normalizeBarcode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '')
  return /^\d{8,14}$/.test(digits) ? digits : null
}

export function productUrl(barcode: string): string {
  return `${OFF_PRODUCT_PAGE}/${encodeURIComponent(barcode)}`
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function pickNutrition(
  nutriments: Record<string, unknown>,
  suffix: '_serving' | '_100g',
): BarcodeNutrition | null {
  const calories = num(nutriments[`energy-kcal${suffix}`])
  if (calories === null) return null
  const round1 = (n: number | null) => Math.round((n ?? 0) * 10) / 10
  return {
    calories: Math.round(calories),
    protein: round1(num(nutriments[`proteins${suffix}`])),
    carbs: round1(num(nutriments[`carbohydrates${suffix}`])),
    fat: round1(num(nutriments[`fat${suffix}`])),
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function mapProduct(barcode: string, product: Record<string, unknown>): BarcodeLookup {
  const name = text(product.product_name)
  const brand = text(product.brands).split(',')[0]?.trim() || undefined
  const nutriments =
    product.nutriments && typeof product.nutriments === 'object'
      ? (product.nutriments as Record<string, unknown>)
      : {}

  const perServing = pickNutrition(nutriments, '_serving')
  const per100g = perServing ? null : pickNutrition(nutriments, '_100g')
  const nutrition = perServing ?? per100g
  if (!nutrition) return { status: 'incomplete', barcode, name: name || undefined }

  return {
    status: 'found',
    product: {
      barcode,
      name: name || `Product ${barcode}`,
      brand,
      basis: perServing ? 'serving' : '100g',
      servingLabel: perServing ? text(product.serving_size) || '1 serving' : '100 g',
      nutrition,
    },
  }
}

/** Scales per-100 g values to a gram amount. */
export function scaleTo(per100g: BarcodeNutrition, grams: number): BarcodeNutrition {
  const f = grams / 100
  const round1 = (n: number) => Math.round(n * f * 10) / 10
  return {
    calories: Math.round(per100g.calories * f),
    protein: round1(per100g.protein),
    carbs: round1(per100g.carbs),
    fat: round1(per100g.fat),
  }
}

export async function lookupBarcode(
  barcode: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<BarcodeLookup> {
  const { fetchImpl = fetch, signal, timeoutMs = 8000 } = options
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetchImpl(
      `${OFF_PRODUCT_API}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    )
    if (res.status === 404) return { status: 'not_found', barcode }
    if (!res.ok) return { status: 'error', barcode }
    const body = (await res.json()) as { status?: unknown; product?: unknown }
    if (body.status !== 1 || !body.product || typeof body.product !== 'object') {
      return { status: 'not_found', barcode }
    }
    return mapProduct(barcode, body.product as Record<string, unknown>)
  } catch {
    return { status: 'error', barcode }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
