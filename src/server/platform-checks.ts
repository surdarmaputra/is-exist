import { PLATFORM_IDS, type PlatformId } from '#/lib/platforms'
import {
  byHttpStatus,
  byMissingMarker,
  byPresenceMarker,
  type CheckOutcome,
} from './classify'

const CHECK_TIMEOUT_MS = 8_000

const REQUEST_HEADERS: HeadersInit = {
  // Public profile pages are happy to answer a plain browser-shaped request.
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

type Resolver = (response: Response) => Promise<CheckOutcome>

async function probe(
  url: string,
  signal: AbortSignal,
  resolve: Resolver,
): Promise<CheckOutcome> {
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: 'follow',
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

async function viaGitlabApi(
  response: Response,
): Promise<CheckOutcome> {
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

function profileCheck(
  url: (username: string) => string,
  resolver: Resolver,
): Check {
  return (username, signal) => probe(url(username), signal, resolver)
}

export const PLATFORM_CHECKS: Record<PlatformId, Check> = {
  github: profileCheck(
    (username) => `https://github.com/${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  gitlab: profileCheck(
    (username) =>
      `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
    viaGitlabApi,
  ),
  mastodon: profileCheck(
    (username) =>
      `https://mastodon.social/@${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  youtube: profileCheck(
    (username) => `https://www.youtube.com/@${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  x: profileCheck(
    (username) => `https://x.com/${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  telegram: profileCheck(
    (username) => `https://t.me/${encodeURIComponent(username)}`,
    byPresenceMarker('tgme_page_title'),
  ),
  soundcloud: profileCheck(
    (username) => `https://soundcloud.com/${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  dribbble: profileCheck(
    (username) => `https://dribbble.com/${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  keybase: profileCheck(
    (username) => `https://keybase.io/${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  devto: profileCheck(
    (username) => `https://dev.to/${encodeURIComponent(username)}`,
    byHttpStatus,
  ),
  hackernews: profileCheck(
    (username) =>
      `https://news.ycombinator.com/user?id=${encodeURIComponent(username)}`,
    byMissingMarker('No such user.'),
  ),
  steam: profileCheck(
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
