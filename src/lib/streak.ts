import { lastNDateKeys, todayKey } from './dates'

/** Consecutive days with at least one diary entry, ending today (or yesterday if today empty). */
export function computeStreak(
  entryDates: string[],
  endKey: string = todayKey(),
  lookback = 60,
): number {
  const logged = new Set(entryDates)
  let count = 0
  const keys = lastNDateKeys(endKey, lookback).reverse()
  let started = false
  for (const key of keys) {
    const has = logged.has(key)
    if (!started) {
      if (key === endKey && !has) continue
      started = true
    }
    if (!has) break
    count += 1
  }
  return count
}
