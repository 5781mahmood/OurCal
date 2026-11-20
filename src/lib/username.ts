export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

/** Trims and lowercases. Does not strip or shorten anything. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

/** 3-20 characters: lowercase letters, numbers and underscores. */
export function isValidUsername(raw: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(raw))
}

export function usernameHint(): string {
  return '3-20 characters. Lowercase letters, numbers and underscores only.'
}

/** Specific reason a username is invalid, or null when it is valid or empty. */
export function usernameError(raw: string): string | null {
  const value = normalizeUsername(raw)
  if (!value) return null
  if (/[^a-z0-9_]/.test(value)) {
    return /\s/.test(value)
      ? 'Spaces are not allowed. Use an underscore instead.'
      : 'Use only lowercase letters, numbers and underscores.'
  }
  if (value.length > USERNAME_MAX) {
    return `Too long: ${value.length} characters. The limit is ${USERNAME_MAX}.`
  }
  if (value.length < USERNAME_MIN) {
    return `Too short: use at least ${USERNAME_MIN} characters.`
  }
  return null
}

/** Username suggestion from a display name, e.g. "Test Alpha" -> "test_alpha". */
export function suggestUsername(displayName: string): string {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .slice(0, USERNAME_MAX)
    .replace(/^_+|_+$/g, '')
  return base.length >= USERNAME_MIN ? base : 'ourcal_user'
}
