import { describe, expect, it } from 'vitest'
import { computeStreak } from './streak'

describe('computeStreak', () => {
  it('counts consecutive logged days ending today', () => {
    const score = computeStreak(
      ['2026-10-27', '2026-10-28', '2026-10-29'],
      '2026-10-29',
    )
    expect(score).toBe(3)
  })

  it('allows an empty today and counts through yesterday', () => {
    const score = computeStreak(['2026-10-27', '2026-10-28'], '2026-10-29')
    expect(score).toBe(2)
  })

  it('breaks on a gap', () => {
    const score = computeStreak(
      ['2026-10-25', '2026-10-28', '2026-10-29'],
      '2026-10-29',
    )
    expect(score).toBe(2)
  })
})
