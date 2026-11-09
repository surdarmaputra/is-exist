import type { CheckStatus } from '#/lib/platforms'

export interface CheckOutcome {
  status: CheckStatus
  detail?: string
}

/**
 * A 404 (or 410) means the profile does not exist. Any other 2xx means the
 * profile was served, so the handle is taken. Everything else is inconclusive:
 * 403/429/5xx usually means the platform blocked the automated request.
 */
export async function byHttpStatus(response: Response): Promise<CheckOutcome> {
  void response.body?.cancel()

  if (response.status === 404 || response.status === 410) {
    return { status: 'available' }
  }

  if (response.ok) {
    return { status: 'taken' }
  }

  return { status: 'unknown', detail: `HTTP ${response.status}` }
}

async function bodyText(response: Response): Promise<string | null> {
  if (!response.ok) {
    void response.body?.cancel()
    return null
  }

  return response.text()
}

/**
 * Some platforms answer 200 for both cases and render the missing-profile
 * marker only when the handle is free.
 */
export function byMissingMarker(marker: string) {
  return async (response: Response): Promise<CheckOutcome> => {
    const body = await bodyText(response)

    if (body === null) {
      return { status: 'unknown', detail: `HTTP ${response.status}` }
    }

    return body.includes(marker)
      ? { status: 'available' }
      : { status: 'taken' }
  }
}

/**
 * The inverse: the page only carries the profile markup when the handle
 * exists (Telegram renders a contact prompt otherwise).
 */
export function byPresenceMarker(marker: string) {
  return async (response: Response): Promise<CheckOutcome> => {
    const body = await bodyText(response)

    if (body === null) {
      return { status: 'unknown', detail: `HTTP ${response.status}` }
    }

    return body.includes(marker)
      ? { status: 'taken' }
      : { status: 'available' }
  }
}

/** Facebook serves public profiles directly and redirects missing names away. */
export async function byFacebookPage(
  response: Response,
): Promise<CheckOutcome> {
  void response.body?.cancel()

  if (response.status === 200) {
    return { status: 'taken' }
  }

  if (response.status === 302 || response.status === 404) {
    return { status: 'available' }
  }

  return { status: 'unknown', detail: `HTTP ${response.status}` }
}

/** TikTok's public oEmbed endpoint knows existing creators and returns 400 otherwise. */
export async function byTiktokOembed(
  response: Response,
): Promise<CheckOutcome> {
  void response.body?.cancel()

  if (response.ok) {
    return { status: 'taken' }
  }

  if (response.status === 400 || response.status === 404) {
    return { status: 'available' }
  }

  return { status: 'unknown', detail: `HTTP ${response.status}` }
}

/** Discord's unauthenticated registration check returns `{ taken: boolean }`. */
export async function byDiscordAvailability(
  response: Response,
): Promise<CheckOutcome> {
  if (!response.ok) {
    void response.body?.cancel()
    return {
      status: 'unknown',
      detail:
        response.status === 429 ? 'rate limited — retry later' : `HTTP ${response.status}`,
    }
  }

  const data = (await response.json().catch(() => null)) as {
    taken?: unknown
  } | null

  if (typeof data?.taken !== 'boolean') {
    return { status: 'unknown', detail: 'unexpected response' }
  }

  return { status: data.taken ? 'taken' : 'available' }
}

/**
 * Some platforms only answer for a profile page when their bot/region gate
 * lets us through. A successful page means the handle exists; anything else
 * is unverified rather than a made-up "available".
 */
export async function byReachableProfile(
  response: Response,
): Promise<CheckOutcome> {
  void response.body?.cancel()

  return response.ok
    ? { status: 'taken' }
    : { status: 'unknown', detail: `HTTP ${response.status}` }
}

