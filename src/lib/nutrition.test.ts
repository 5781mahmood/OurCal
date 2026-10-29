import { describe, expect, it } from 'vitest'
import {
  calorieGoalFromTdee,
  defaultMacroGoals,
  estimateTdee,
  mifflinStJeorBmr,
} from './nutrition'

describe('mifflinStJeorBmr', () => {
  it('estimates male BMR higher than female at same stats', () => {
    const male = mifflinStJeorBmr('male', 75, 175, 22)
    const female = mifflinStJeorBmr('female', 75, 175, 22)
    expect(male).toBeGreaterThan(female)
  })
})

describe('estimateTdee', () => {
  it('scales with activity', () => {
    const sedentary = estimateTdee('male', 75, 175, 22, 'sedentary')
    const active = estimateTdee('male', 75, 175, 22, 'active')
    expect(active).toBeGreaterThan(sedentary)
  })
})

describe('calorieGoalFromTdee', () => {
  it('cuts for lose and adds for gain', () => {
    expect(calorieGoalFromTdee(2500, 'lose')).toBe(2000)
    expect(calorieGoalFromTdee(2500, 'gain')).toBe(2800)
    expect(calorieGoalFromTdee(2500, 'maintain')).toBe(2500)
  })
})

describe('defaultMacroGoals', () => {
  it('anchors protein to body weight', () => {
    const macros = defaultMacroGoals(2200, 80, 'maintain')
    expect(macros.protein).toBe(128)
    expect(macros.fat + macros.carbs).toBeGreaterThan(0)
  })
})
