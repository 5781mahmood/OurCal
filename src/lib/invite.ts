import { isValidUsername, normalizeUsername } from './username'

/** Parse @handle or invite URL (?u=) into a normalized username. */
export function parseInvite(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    const u = url.searchParams.get('u') ?? url.pathname.split('/').pop()
    if (u) {
      const decoded = normalizeUsername(decodeURIComponent(u).replace('@', ''))
      if (isValidUsername(decoded)) return decoded
    }
  } catch {
    /* not a url */
  }
  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  const normalized = normalizeUsername(handle)
  if (isValidUsername(normalized)) return normalized
  return null
}

export function buildInviteUrl(username: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : 'https://ourcal-pi.vercel.app')
  return `${base}/app?u=${encodeURIComponent(normalizeUsername(username))}`
}
