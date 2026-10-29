import { describe, expect, it } from 'vitest'
import { macroLevel } from './macroLevel'

describe('macroLevel', () => {
  it('maps ratios to traffic lights', () => {
    expect(macroLevel(40, 100)).toBe('low')
    expect(macroLevel(60, 100)).toBe('mid')
    expect(macroLevel(90, 100)).toBe('high')
    expect(macroLevel(110, 100)).toBe('over')
  })
})
