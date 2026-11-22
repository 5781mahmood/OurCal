import { describe, expect, it } from 'vitest'
import type { DiaryEntry } from '../types'
import { recentFoodsFromEntries } from './recentFoods'

function entry(
  partial: Pick<DiaryEntry, 'name' | 'servings' | 'calories' | 'createdAt'> &
    Partial<DiaryEntry>,
): DiaryEntry {
  return {
    id: partial.id ?? partial.createdAt,
    date: partial.date ?? '2026-11-22',
    meal: partial.meal ?? 'Breakfast',
    protein: partial.protein ?? 0,
    carbs: partial.carbs ?? 0,
    fat: partial.fat ?? 0,
    ...partial,
  }
}

describe('recentFoodsFromEntries', () => {
  it('returns the newest distinct foods, capped at 8, with last servings', () => {
    const entries: DiaryEntry[] = [
      entry({
        name: 'Banana',
        servings: 1,
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
        createdAt: '2026-11-22T08:00:00.000Z',
      }),
      entry({
        name: 'Oatmeal (cooked)',
        servings: 2,
        calories: 316,
        protein: 11,
        carbs: 54,
        fat: 6.4,
        createdAt: '2026-11-22T09:00:00.000Z',
      }),
      entry({
        name: 'Banana',
        servings: 1.5,
        calories: 158,
        protein: 2,
        carbs: 40.5,
        fat: 0.6,
        createdAt: '2026-11-22T10:00:00.000Z',
      }),
      entry({
        name: 'Apple',
        servings: 1,
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        createdAt: '2026-11-21T12:00:00.000Z',
      }),
    ]

    const recent = recentFoodsFromEntries(entries, 8)
    expect(recent.map((r) => r.food.name)).toEqual([
      'Banana',
      'Oatmeal (cooked)',
      'Apple',
    ])
    expect(recent[0]?.servings).toBe(1.5)
    expect(recent[0]?.food.calories).toBe(105)
    expect(recent[1]?.servings).toBe(2)
    expect(recent[1]?.food.calories).toBe(158)
  })

  it('returns at most the limit and nothing for an empty diary', () => {
    expect(recentFoodsFromEntries([])).toEqual([])

    const many = Array.from({ length: 12 }, (_, i) =>
      entry({
        name: `Food ${i}`,
        servings: 1,
        calories: 100 + i,
        createdAt: `2026-11-22T${String(i).padStart(2, '0')}:00:00.000Z`,
      }),
    )
    const recent = recentFoodsFromEntries(many, 8)
    expect(recent).toHaveLength(8)
    expect(recent[0]?.food.name).toBe('Food 11')
    expect(recent[7]?.food.name).toBe('Food 4')
  })
})
