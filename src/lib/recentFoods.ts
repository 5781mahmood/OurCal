import type { DiaryEntry, FoodItem } from '../types'

export type RecentFoodPick = {
  food: FoodItem
  /** Serving count from the most recent log of this food. */
  servings: number
}

/**
 * Last `limit` distinct foods from the diary, newest first.
 * Macros are converted back to per-serving values so AddFoodModal can
 * multiply by servings again on log.
 */
export function recentFoodsFromEntries(
  entries: DiaryEntry[],
  limit = 8,
): RecentFoodPick[] {
  if (limit <= 0 || entries.length === 0) return []

  const newestFirst = [...entries].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  const seen = new Set<string>()
  const out: RecentFoodPick[] = []

  for (const entry of newestFirst) {
    const key = entry.name
    if (seen.has(key)) continue
    seen.add(key)

    const servings = entry.servings > 0 ? entry.servings : 1
    out.push({
      food: {
        id: `recent-${key}`,
        name: entry.name,
        servingLabel: '1 serving',
        calories: roundCal(entry.calories / servings),
        protein: roundMacro(entry.protein / servings),
        carbs: roundMacro(entry.carbs / servings),
        fat: roundMacro(entry.fat / servings),
      },
      servings,
    })

    if (out.length >= limit) break
  }

  return out
}

function roundCal(n: number): number {
  return Math.round(n)
}

function roundMacro(n: number): number {
  return Math.round(n * 10) / 10
}
