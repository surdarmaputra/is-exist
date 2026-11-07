export const PLATFORM_IDS = [
  'github',
  'gitlab',
  'mastodon',
  'youtube',
  'x',
  'telegram',
  'soundcloud',
  'dribbble',
  'keybase',
  'devto',
  'hackernews',
  'steam',
] as const

export type PlatformId = (typeof PLATFORM_IDS)[number]

export const CHECK_STATUSES = ['taken', 'available', 'unknown'] as const

/** Outcome of a single platform lookup. */
export type CheckStatus = (typeof CHECK_STATUSES)[number]

/** Client-side row state: resolved outcome, or still in flight. */
export type RowStatus = 'checking' | CheckStatus

export interface Platform {
  id: PlatformId
  name: string
  /** Short monogram shown in the platform badge. */
  glyph: string
  /** Brand-ish accent used for the badge background. */
  accent: string
  profileUrl: (username: string) => string
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'github',
    name: 'GitHub',
    glyph: 'GH',
    accent: '#24292f',
    profileUrl: (username) => `https://github.com/${username}`,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    glyph: 'GL',
    accent: '#e24329',
    profileUrl: (username) => `https://gitlab.com/${username}`,
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    glyph: 'MA',
    accent: '#6364ff',
    profileUrl: (username) => `https://mastodon.social/@${username}`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    glyph: 'YT',
    accent: '#ff0033',
    profileUrl: (username) => `https://www.youtube.com/@${username}`,
  },
  {
    id: 'x',
    name: 'X',
    glyph: 'X',
    accent: '#0f1419',
    profileUrl: (username) => `https://x.com/${username}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    glyph: 'TG',
    accent: '#229ed9',
    profileUrl: (username) => `https://t.me/${username}`,
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    glyph: 'SC',
    accent: '#ff5500',
    profileUrl: (username) => `https://soundcloud.com/${username}`,
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    glyph: 'DR',
    accent: '#ea4c89',
    profileUrl: (username) => `https://dribbble.com/${username}`,
  },
  {
    id: 'keybase',
    name: 'Keybase',
    glyph: 'KB',
    accent: '#ff6f21',
    profileUrl: (username) => `https://keybase.io/${username}`,
  },
  {
    id: 'devto',
    name: 'DEV',
    glyph: 'D',
    accent: '#0a0a0a',
    profileUrl: (username) => `https://dev.to/${username}`,
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    glyph: 'HN',
    accent: '#ff6600',
    profileUrl: (username) =>
      `https://news.ycombinator.com/user?id=${username}`,
  },
  {
    id: 'steam',
    name: 'Steam',
    glyph: 'ST',
    accent: '#1b2838',
    profileUrl: (username) =>
      `https://steamcommunity.com/id/${username}`,
  },
]

export interface PlatformResult {
  id: PlatformId
  status: CheckStatus
  /** Human-readable reason when the result is inconclusive. */
  detail?: string
}

export type ScanEvent =
  | { type: 'result'; result: PlatformResult }
  | { type: 'done' }
  | { type: 'error'; message: string }
