/** 3–20 chars: letters, numbers, spaces, underscores. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isValidUsername(raw: string): boolean {
  const u = normalizeUsername(raw)
  return /^[a-z0-9_ ]{3,20}$/.test(u)
}

export function usernameHint(): string {
  return '3–20 characters. Letters, numbers, spaces, and underscores are allowed.'
}
