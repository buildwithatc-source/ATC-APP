/**
 * App-wide constants for the renderer.
 *
 * The login field accepts EITHER a full email or a short username:
 *  - `buildwithatc@gmail.com`  -> used as-is (contains "@")
 *  - `dan`                     -> mapped to `dan@atc.local`
 *
 * This lets accounts created with real emails log in directly, while still
 * supporting short usernames for `@atc.local`-style accounts.
 */
export const USERNAME_EMAIL_DOMAIN = 'atc.local'

export function usernameToEmail(usernameOrEmail: string): string {
  const value = usernameOrEmail.trim().toLowerCase()
  // Already an email — use it directly.
  if (value.includes('@')) return value
  return `${value}@${USERNAME_EMAIL_DOMAIN}`
}

export function emailToUsername(email: string | undefined | null): string {
  if (!email) return ''
  const at = email.indexOf('@')
  return at === -1 ? email : email.slice(0, at)
}
