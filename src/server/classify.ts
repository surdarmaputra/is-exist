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
