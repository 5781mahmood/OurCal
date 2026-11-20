import { describe, expect, it } from 'vitest'
import { isValidUsername, suggestUsername, usernameError } from './username'
import { buildInviteUrl, parseInvite } from './invite'

describe('isValidUsername', () => {
  it('accepts 3-20 lowercase letters, numbers and underscores', () => {
    expect(isValidUsername('abc')).toBe(true)
    expect(isValidUsername('test_alpha_99')).toBe(true)
    expect(isValidUsername('a'.repeat(20))).toBe(true)
  })

  it('lowercases before checking', () => {
    expect(isValidUsername('Test_Alpha')).toBe(true)
  })

  it('rejects spaces, other characters, and bad lengths', () => {
    expect(isValidUsername('test alpha')).toBe(false)
    expect(isValidUsername('test-alpha')).toBe(false)
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('a'.repeat(21))).toBe(false)
  })
})

describe('usernameError', () => {
  it('explains what is wrong instead of shortening the value', () => {
    expect(usernameError('test alpha')).toMatch(/Spaces are not allowed/)
    expect(usernameError('test.alpha')).toMatch(/lowercase letters, numbers and underscores/)
    expect(usernameError('a'.repeat(23))).toBe('Too long: 23 characters. The limit is 20.')
    expect(usernameError('ab')).toMatch(/Too short/)
    expect(usernameError('')).toBeNull()
    expect(usernameError('test_alpha')).toBeNull()
  })
})

describe('suggestUsername', () => {
  it('turns spaces into underscores and drops other characters', () => {
    expect(suggestUsername('Test Alpha')).toBe('test_alpha')
    expect(suggestUsername('  Mary-Jane   O\'Neil ')).toBe('maryjane_oneil')
  })

  it('always returns a valid username', () => {
    for (const name of ['Test Alpha', 'Jo', '', '!!!', 'A very long display name here']) {
      expect(isValidUsername(suggestUsername(name))).toBe(true)
    }
    expect(suggestUsername('Jo')).toBe('ourcal_user')
  })
})

describe('invite links', () => {
  it('round-trips a username without encoding', () => {
    const url = buildInviteUrl('test_alpha', 'https://example.com')
    expect(url).toBe('https://example.com/app?u=test_alpha')
    expect(parseInvite(url)).toBe('test_alpha')
  })

  it('rejects old space-style handles', () => {
    expect(parseInvite('@test alpha')).toBeNull()
    expect(parseInvite('https://example.com/app?u=test%20alpha')).toBeNull()
  })
})
