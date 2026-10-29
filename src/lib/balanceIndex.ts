import type { Macros, UserProfile } from '../types'

/** OurCal-only score: how close today is to calorie + macro targets (0–100). */
export function balanceIndex(
  totals: Macros & { calories: number },
  profile: UserProfile,
): number {
  const calScore =
    profile.calorieGoal > 0
      ? 1 - Math.min(Math.abs(totals.calories - profile.calorieGoal) / profile.calorieGoal, 1)
      : 0

  const macroParts = (
    [
      [totals.protein, profile.macroGoals.protein],
      [totals.carbs, profile.macroGoals.carbs],
      [totals.fat, profile.macroGoals.fat],
    ] as const
  ).map(([v, g]) => (g > 0 ? 1 - Math.min(Math.abs(v - g) / g, 1) : 0))

  const macroScore =
    macroParts.reduce((a, b) => a + b, 0) / macroParts.length

  return Math.round((calScore * 0.45 + macroScore * 0.55) * 100)
}
