import { describe, expect, it } from 'vitest'
import { balanceIndex } from './balanceIndex'
import type { UserProfile } from '../types'

const profile: UserProfile = {
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
}

describe('balanceIndex', () => {
  it('scores 100 when totals match goals', () => {
    const score = balanceIndex(
      { calories: 2000, protein: 150, carbs: 200, fat: 70 },
      profile,
    )
    expect(score).toBe(100)
  })

  it('scores lower when far from goals', () => {
    const score = balanceIndex(
      { calories: 500, protein: 10, carbs: 20, fat: 5 },
      profile,
    )
    expect(score).toBeLessThan(50)
  })
})
