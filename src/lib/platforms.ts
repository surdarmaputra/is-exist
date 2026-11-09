import { comDomainFor } from './domain'

export const PLATFORM_IDS = [
  'domain',
  'threads',
  'instagram',
  'tiktok',
  'pinterest',
  'snapchat',
  'reddit',
  'discord',
  'lemon8',
  'facebook',
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
  /** Badge text colour when the accent is too light for white. */
  badgeText?: string
  /** The social network's main site, for people who want to explore it. */
  homeUrl: string
  /** Public profile URL, when the platform exposes one by username. */
  profileUrl?: (username: string) => string | null
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'domain',
    name: '.com domain',
    glyph: 'com',
    accent: '#0f766e',
    homeUrl: 'https://www.verisign.com/domain-names/com-domain-names/',
    profileUrl: (username) => {
      const domain = comDomainFor(username)
      return domain ? `https://${domain}` : null
    },
  },
  {
    id: 'threads',
    name: 'Threads',
    glyph: 'TH',
    accent: '#0f1419',
    homeUrl: 'https://www.threads.com',
    profileUrl: (username) => `https://www.threads.com/@${username}`,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    glyph: 'IG',
    accent: '#d62976',
    homeUrl: 'https://www.instagram.com',
    profileUrl: (username) => `https://www.instagram.com/${username}/`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    glyph: 'TT',
    accent: '#111111',
    homeUrl: 'https://www.tiktok.com',
    profileUrl: (username) => `https://www.tiktok.com/@${username}`,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    glyph: 'PIN',
    accent: '#e60023',
    homeUrl: 'https://www.pinterest.com',
    profileUrl: (username) => `https://www.pinterest.com/${username}/`,
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    glyph: 'SN',
    accent: '#fffc00',
    badgeText: '#1a1a1a',
    homeUrl: 'https://www.snapchat.com',
    profileUrl: (username) => `https://www.snapchat.com/add/${username}`,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    glyph: 'RD',
    accent: '#ff4500',
    homeUrl: 'https://www.reddit.com',
    profileUrl: (username) => `https://www.reddit.com/user/${username}`,
  },
  {
    id: 'discord',
    name: 'Discord',
    glyph: 'DC',
    accent: '#5865f2',
    homeUrl: 'https://discord.com',
  },
  {
    id: 'lemon8',
    name: 'Lemon8',
    glyph: 'L8',
    accent: '#ffcb00',
    badgeText: '#1a1a1a',
    homeUrl: 'https://www.lemon8-app.com',
    profileUrl: (username) => `https://www.lemon8-app.com/@${username}`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    glyph: 'FB',
    accent: '#1877f2',
    homeUrl: 'https://www.facebook.com',
    profileUrl: (username) => `https://www.facebook.com/${username}`,
  },
  {
    id: 'github',
    name: 'GitHub',
    glyph: 'GH',
    accent: '#24292f',
    homeUrl: 'https://github.com',
    profileUrl: (username) => `https://github.com/${username}`,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    glyph: 'GL',
    accent: '#e24329',
    homeUrl: 'https://gitlab.com',
    profileUrl: (username) => `https://gitlab.com/${username}`,
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    glyph: 'MA',
    accent: '#6364ff',
    homeUrl: 'https://joinmastodon.org',
    profileUrl: (username) => `https://mastodon.social/@${username}`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    glyph: 'YT',
    accent: '#ff0033',
    homeUrl: 'https://www.youtube.com',
    profileUrl: (username) => `https://www.youtube.com/@${username}`,
  },
  {
    id: 'x',
    name: 'X',
    glyph: 'X',
    accent: '#0f1419',
    homeUrl: 'https://x.com',
    profileUrl: (username) => `https://x.com/${username}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    glyph: 'TG',
    accent: '#229ed9',
    homeUrl: 'https://telegram.org',
    profileUrl: (username) => `https://t.me/${username}`,
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    glyph: 'SC',
    accent: '#ff5500',
    homeUrl: 'https://soundcloud.com',
    profileUrl: (username) => `https://soundcloud.com/${username}`,
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    glyph: 'DR',
    accent: '#ea4c89',
    homeUrl: 'https://dribbble.com',
    profileUrl: (username) => `https://dribbble.com/${username}`,
  },
  {
    id: 'keybase',
    name: 'Keybase',
    glyph: 'KB',
    accent: '#ff6f21',
    homeUrl: 'https://keybase.io',
    profileUrl: (username) => `https://keybase.io/${username}`,
  },
  {
    id: 'devto',
    name: 'DEV',
    glyph: 'D',
    accent: '#0a0a0a',
    homeUrl: 'https://dev.to',
    profileUrl: (username) => `https://dev.to/${username}`,
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    glyph: 'HN',
    accent: '#ff6600',
    homeUrl: 'https://news.ycombinator.com',
    profileUrl: (username) =>
      `https://news.ycombinator.com/user?id=${username}`,
  },
  {
    id: 'steam',
    name: 'Steam',
    glyph: 'ST',
    accent: '#1b2838',
    homeUrl: 'https://steamcommunity.com',
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
  | { type: 'source'; source: 'live' | 'cache'; cachedAt?: string }
  | { type: 'result'; result: PlatformResult }
  | { type: 'done' }
  | { type: 'error'; message: string }
