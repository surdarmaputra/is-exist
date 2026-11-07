export const MAX_USERNAME_LENGTH = 39

// Most platforms reject anything outside this set. We intentionally keep it
// stricter than the union of every provider's rules so the scan can be sent
// to all of them in one pass.
const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

export type UsernameCheck =
  | { ok: true; username: string }
  | { ok: false; reason: string }

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '')
}

export function validateUsername(raw: string): UsernameCheck {
  const username = normalizeUsername(raw)

  if (username.length === 0) {
    return { ok: false, reason: 'Enter a username to check.' }
  }

  if (username.length > MAX_USERNAME_LENGTH) {
    return {
      ok: false,
      reason: `Keep it under ${MAX_USERNAME_LENGTH} characters.`,
    }
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      reason: 'Use letters, numbers, dots, dashes or underscores.',
    }
  }

  return { ok: true, username }
}
