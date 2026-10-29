import { describe, expect, it } from 'vitest'
import { evaluateBadges } from './badges'
import type { AppState } from '../types'

const empty: AppState = {
  profile: {
    name: 'Test',
    username: 'test',
    avatarUrl: '',
    sex: 'male',
    age: 22,
    heightCm: 175,
    weightKg: 75,
    activity: 'moderate',
    goal: 'maintain',
    calorieGoal: 2000,
    macroGoals: { protein: 150, carbs: 200, fat: 70 },
  },
  entries: [],
  customFoods: [],
  friends: [],
  chatRooms: [],
  chatMessages: [],
  earnedBadges: [],
  cloudUserId: null,
}

describe('evaluateBadges', () => {
  it('awards first_log when entries exist', () => {
    const state: AppState = {
      ...empty,
      entries: [
        {
          id: '1',
          date: '2026-10-29',
          meal: 'Lunch',
          name: 'Eggs',
          servings: 1,
          calories: 140,
          protein: 12,
          carbs: 1,
          fat: 10,
          createdAt: new Date().toISOString(),
        },
      ],
    }
    const badges = evaluateBadges(state, 1)
    expect(badges.some((b) => b.id === 'first_log')).toBe(true)
  })

  it('awards streak_7 at seven days', () => {
    const badges = evaluateBadges(empty, 7)
    expect(badges.some((b) => b.id === 'streak_7')).toBe(true)
  })
})
