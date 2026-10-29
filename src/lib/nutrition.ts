import type {
  ActivityLevel,
  DiaryEntry,
  GoalType,
  Macros,
  Sex,
  UserProfile,
} from '../types'

/** Activity multipliers used with Mifflin–St Jeor BMR → TDEE. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Light (1–3 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very active (physical job / 2× training)',
}

/**
 * Mifflin–St Jeor resting metabolic rate (kcal/day).
 * Widely used clinical estimate — not a lab measurement.
 */
export function mifflinStJeorBmr(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function estimateTdee(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
): number {
  return Math.round(
    mifflinStJeorBmr(sex, weightKg, heightCm, age) *
      ACTIVITY_MULTIPLIERS[activity],
  )
}

/** Adjust TDEE by goal: lose ≈ −500, gain ≈ +300. */
export function calorieGoalFromTdee(tdee: number, goal: GoalType): number {
  if (goal === 'lose') return Math.max(1200, tdee - 500)
  if (goal === 'gain') return tdee + 300
  return tdee
}

/**
 * Default macro split by goal (grams).
 * Protein anchored to body weight; fat/carbs fill remaining calories.
 */
export function defaultMacroGoals(
  calorieGoal: number,
  weightKg: number,
  goal: GoalType,
): Macros {
  const proteinPerKg = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6
  const protein = Math.round(weightKg * proteinPerKg)
  const fat = Math.round((calorieGoal * 0.25) / 9)
  const carbs = Math.max(
    0,
    Math.round((calorieGoal - protein * 4 - fat * 9) / 4),
  )
  return { protein, carbs, fat }
}

export function buildSuggestedProfile(
  partial: Omit<UserProfile, 'calorieGoal' | 'macroGoals'>,
): UserProfile {
  const tdee = estimateTdee(
    partial.sex,
    partial.weightKg,
    partial.heightCm,
    partial.age,
    partial.activity,
  )
  const calorieGoal = calorieGoalFromTdee(tdee, partial.goal)
  return {
    ...partial,
    calorieGoal,
    macroGoals: defaultMacroGoals(calorieGoal, partial.weightKg, partial.goal),
  }
}

export function sumMacros(entries: DiaryEntry[]): Macros & { calories: number } {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}