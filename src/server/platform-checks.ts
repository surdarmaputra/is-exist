import { comDomainFor } from '#/lib/domain'
import { PLATFORM_IDS, type PlatformId } from '#/lib/platforms'
import {
  byDiscordAvailability,
  byFacebookPage,
  byHttpStatus,
  byMissingMarker,
  byPresenceMarker,
  byReachableProfile,
  byTiktokOembed,
  type CheckOutcome,
} from './classify'

const CHECK_TIMEOUT_MS = 8_000

const DESKTOP_HEADERS: Record<string, string> = {
  // Public profile pages are happy to answer a plain browser-shaped request.
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

// Instagram, Threads and Facebook only render public profile data for their
// mobile web clients; the desktop response is a login shell for every handle.
const MOBILE_HEADERS: Record<string, string> = {
  ...DESKTOP_HEADERS,
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
}

type Resolver = (response: Response) => Promise<CheckOutcome>

interface ProbeOptions {
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  redirect?: RequestRedirect
}

async function probe(
  url: string,
  signal: AbortSignal,
  resolve: Resolver,
  options: ProbeOptions = {},
): Promise<CheckOutcome> {
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: { ...DESKTOP_HEADERS, ...options.headers },
      body: options.body,
      redirect: options.redirect ?? 'follow',
      signal: AbortSignal.any([signal, AbortSignal.timeout(CHECK_TIMEOUT_MS)]),
    })

    return await resolve(response)
  } catch (error) {
    if (signal.aborted) {
      return { status: 'unknown', detail: 'cancelled' }
    }

    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { status: 'unknown', detail: 'timed out' }
    }

    return { status: 'unknown', detail: 'network error' }
  }
}

async function viaGitlabApi(response: Response): Promise<CheckOutcome> {
  if (!response.ok) {
    void response.body?.cancel()
    return { status: 'unknown', detail: `HTTP ${response.status}` }
  }

  const data: unknown = await response.json().catch(() => null)

  if (!Array.isArray(data)) {
    return { status: 'unknown', detail: 'unexpected response' }
  }

  return data.length > 0 ? { status: 'taken' } : { status: 'available' }
}

type Check = (username: string, signal: AbortSignal) => Promise<CheckOutcome>

function getCheck(
  buildUrl: (username: string) => string,
  resolve: Resolver,
  options: ProbeOptions = {},
): Check {
  return (username, signal) =>
    probe(buildUrl(username), signal, resolve, options)
}

const profile = (buildUrl: (username: string) => string): Check =>
  getCheck(buildUrl, byHttpStatus)

export const PLATFORM_CHECKS: Record<PlatformId, Check> = {
  domain: async (username, signal) => {
    const domain = comDomainFor(username)

    if (!domain) {
      return { status: 'unknown', detail: 'not a valid .com label' }
    }

    return probe(
      `https://rdap.verisign.com/com/v1/domain/${domain}`,
      signal,
      byHttpStatus,
      { headers: { accept: 'application/rdap+json' } },
    )
  },
  threads: getCheck(
    (username) => `https://www.threads.com/@${encodeURIComponent(username)}`,
    byPresenceMarker('profile_pic_url'),
    { headers: MOBILE_HEADERS },
  ),
  instagram: getCheck(
    (username) =>
      `https://www.instagram.com/${encodeURIComponent(username)}/`,
    byPresenceMarker('profile_pic_url'),
    { headers: MOBILE_HEADERS },
  ),
  tiktok: (username, signal) =>
    probe(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(
        `https://www.tiktok.com/@${username}`,
      )}`,
      signal,
      byTiktokOembed,
      { headers: { accept: 'application/json' } },
    ),
  pinterest: getCheck(
    (username) => `https://www.pinterest.com/${encodeURIComponent(username)}/`,
    byMissingMarker('User not found.'),
  ),
  snapchat: getCheck(
    (username) =>
      `https://www.snapchat.com/add/${encodeURIComponent(username)}`,
    byReachableProfile,
    { headers: MOBILE_HEADERS },
  ),
  reddit: getCheck(
    (username) =>
      `https://www.reddit.com/user/${encodeURIComponent(username)}/.rss`,
    byHttpStatus,
    { headers: { accept: 'application/atom+xml' } },
  ),
  discord: (username, signal) =>
    probe(
      'https://discord.com/api/v9/unique-username/username-attempt-unauthed',
      signal,
      byDiscordAvailability,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          origin: 'https://discord.com',
          referer: 'https://discord.com/',
        },
        body: JSON.stringify({ username }),
      },
    ),
  lemon8: getCheck(
    (username) => `https://www.lemon8-app.com/@${encodeURIComponent(username)}`,
    byReachableProfile,
    { headers: MOBILE_HEADERS },
  ),
  facebook: getCheck(
    (username) => `https://www.facebook.com/${encodeURIComponent(username)}`,
    byFacebookPage,
    { headers: MOBILE_HEADERS, redirect: 'manual' },
  ),
  github: profile(
    (username) => `https://github.com/${encodeURIComponent(username)}`,
  ),
  gitlab: getCheck(
    (username) =>
      `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
    viaGitlabApi,
  ),
  mastodon: profile(
    (username) =>
      `https://mastodon.social/@${encodeURIComponent(username)}`,
  ),
  youtube: profile(
    (username) => `https://www.youtube.com/@${encodeURIComponent(username)}`,
  ),
  x: profile(
    (username) => `https://x.com/${encodeURIComponent(username)}`,
  ),
  telegram: getCheck(
    (username) => `https://t.me/${encodeURIComponent(username)}`,
    byPresenceMarker('tgme_page_title'),
  ),
  soundcloud: profile(
    (username) => `https://soundcloud.com/${encodeURIComponent(username)}`,
  ),
  dribbble: profile(
    (username) => `https://dribbble.com/${encodeURIComponent(username)}`,
  ),
  keybase: profile(
    (username) => `https://keybase.io/${encodeURIComponent(username)}`,
  ),
  devto: profile(
    (username) => `https://dev.to/${encodeURIComponent(username)}`,
  ),
  hackernews: getCheck(
    (username) =>
      `https://news.ycombinator.com/user?id=${encodeURIComponent(username)}`,
    byMissingMarker('No such user.'),
  ),
  steam: getCheck(
    (username) =>
      `https://steamcommunity.com/id/${encodeURIComponent(username)}`,
    byMissingMarker('The specified profile could not be found.'),
  ),
}

/** Keep the fan-out polite: six concurrent requests per scan. */
const CONCURRENCY = 6

export async function runScan(
  username: string,
  signal: AbortSignal,
  onResult: (id: PlatformId, outcome: CheckOutcome) => void,
): Promise<void> {
  const queue = [...PLATFORM_IDS]
  let cursor = 0

  const worker = async () => {
    while (!signal.aborted) {
      const id = queue[cursor++]
      if (!id) return

      let outcome: CheckOutcome
      try {
        outcome = await PLATFORM_CHECKS[id](username, signal)
      } catch {
        outcome = { status: 'unknown', detail: 'network error' }
      }

      if (signal.aborted) return
      onResult(id, outcome)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
  )
}
