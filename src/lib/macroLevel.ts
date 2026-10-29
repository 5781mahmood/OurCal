/** Traffic-light fill for macro progress toward daily goal. */
export type MacroLevel = 'low' | 'mid' | 'high' | 'over'

export function macroLevel(value: number, goal: number): MacroLevel {
  if (goal <= 0) return 'low'
  const ratio = value / goal
  if (ratio > 1) return 'over'
  if (ratio < 0.5) return 'low'
  if (ratio < 0.85) return 'mid'
  return 'high'
}

export function macroLevelClass(level: MacroLevel): string {
  return `macro-${level}`
}

export function macroLevelLabel(level: MacroLevel): string {
  if (level === 'low') return 'Low'
  if (level === 'mid') return 'On track'
  if (level === 'high') return 'High'
  return 'Over'
}
