import type { AppState, BadgeId, EarnedBadge } from '../types'
import { balanceIndex } from './balanceIndex'
import { sumMacros } from './nutrition'
import { todayKey } from './dates'

export const BADGE_META: Record<
  BadgeId,
  { title: string; detail: string }
> = {
  first_log: { title: 'First bite', detail: 'Logged your first meal.' },
  streak_3: { title: 'Three-day rhythm', detail: 'Logged three days in a row.' },
  streak_7: { title: 'Week locked', detail: 'Seven-day logging streak.' },
  streak_14: { title: 'Fortnight focus', detail: 'Fourteen days without a gap.' },
  streak_30: { title: 'Monthly anchor', detail: 'Thirty-day streak.' },
  balance_80: { title: 'Balance index 80+', detail: 'Hit an 80+ balance score in one day.' },
  friend_1: { title: 'Accountability', detail: 'Added your first friend.' },
  community_food: { title: 'Pantry builder', detail: 'Shared a custom food with everyone.' },
}

function hasBadge(badges: EarnedBadge[], id: BadgeId): boolean {
  return badges.some((b) => b.id === id)
}

export function evaluateBadges(state: AppState, streak: number): EarnedBadge[] {
  const next = [...state.earnedBadges]
  const push = (id: BadgeId) => {
    if (!hasBadge(next, id)) next.push({ id, earnedAt: new Date().toISOString() })
  }

  if (state.entries.length > 0) push('first_log')
  if (streak >= 3) push('streak_3')
  if (streak >= 7) push('streak_7')
  if (streak >= 14) push('streak_14')
  if (streak >= 30) push('streak_30')
  if (state.friends.length > 0) push('friend_1')
  if (state.customFoods.some((f) => f.contributedBy)) push('community_food')

  if (state.profile) {
    const today = todayKey()
    const entries = state.entries.filter((e) => e.date === today)
    if (entries.length > 0) {
      const totals = sumMacros(entries)
      const score = balanceIndex(totals, state.profile)
      if (score >= 80) push('balance_80')
    }
  }

  return next
}
