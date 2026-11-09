import { describe, expect, it } from 'vitest'
import {
  byDiscordAvailability,
  byFacebookPage,
  byHttpStatus,
  byMissingMarker,
  byPresenceMarker,
  byReachableProfile,
  byTiktokOembed,
} from './classify'

describe('byHttpStatus', () => {
  it('treats 404 and 410 as available', async () => {
    expect(await byHttpStatus(new Response(null, { status: 404 }))).toEqual({
      status: 'available',
    })
    expect(await byHttpStatus(new Response(null, { status: 410 }))).toEqual({
      status: 'available',
    })
  })

  it('treats any other success as taken', async () => {
    expect(await byHttpStatus(new Response('profile', { status: 200 }))).toEqual(
      { status: 'taken' },
    )
  })

  it('reports blocks and server errors as unknown with the status', async () => {
    expect(await byHttpStatus(new Response(null, { status: 403 }))).toEqual({
      status: 'unknown',
      detail: 'HTTP 403',
    })
    expect(await byHttpStatus(new Response(null, { status: 503 }))).toEqual({
      status: 'unknown',
      detail: 'HTTP 503',
    })
  })
})

describe('byMissingMarker', () => {
  const resolve = byMissingMarker('No such user.')

  it('detects the missing-profile marker', async () => {
    const response = new Response('<p>No such user.</p>', { status: 200 })
    expect(await resolve(response)).toEqual({ status: 'available' })
  })

  it('assumes a profile page without the marker is taken', async () => {
    const response = new Response('<p>karma: 42</p>', { status: 200 })
    expect(await resolve(response)).toEqual({ status: 'taken' })
  })

  it('never guesses when the response is not a success', async () => {
    const response = new Response('rate limited', { status: 429 })
    expect(await resolve(response)).toEqual({
      status: 'unknown',
      detail: 'HTTP 429',
    })
  })
})

describe('byPresenceMarker', () => {
  const resolve = byPresenceMarker('tgme_page_title')

  it('marks a page carrying the profile marker as taken', async () => {
    const response = new Response('<div class="tgme_page_title">', {
      status: 200,
    })
    expect(await resolve(response)).toEqual({ status: 'taken' })
  })

  it('marks a page without the profile marker as available', async () => {
    const response = new Response('<div class="tgme_page_action">', {
      status: 200,
    })
    expect(await resolve(response)).toEqual({ status: 'available' })
  })

  it('never guesses when the response is not a success', async () => {
    const response = new Response('blocked', { status: 403 })
    expect(await resolve(response)).toEqual({
      status: 'unknown',
      detail: 'HTTP 403',
    })
  })
})

describe('byFacebookPage', () => {
  it('treats a rendered profile as taken', async () => {
    expect(await byFacebookPage(new Response('<html>', { status: 200 }))).toEqual(
      { status: 'taken' },
    )
  })

  it('treats the missing-profile redirect as available', async () => {
    expect(
      await byFacebookPage(new Response(null, { status: 302 })),
    ).toEqual({ status: 'available' })
  })

  it('does not guess when Facebook refuses the request', async () => {
    expect(await byFacebookPage(new Response(null, { status: 429 }))).toEqual({
      status: 'unknown',
      detail: 'HTTP 429',
    })
  })
})

describe('byTiktokOembed', () => {
  it('treats a creator oEmbed response as taken', async () => {
    expect(
      await byTiktokOembed(new Response('{"title":"x"}', { status: 200 })),
    ).toEqual({ status: 'taken' })
  })

  it('treats the missing-creator 400 as available', async () => {
    expect(
      await byTiktokOembed(new Response('{"code":400}', { status: 400 })),
    ).toEqual({ status: 'available' })
  })

  it('does not guess on rate limits', async () => {
    expect(await byTiktokOembed(new Response(null, { status: 429 }))).toEqual({
      status: 'unknown',
      detail: 'HTTP 429',
    })
  })
})

describe('byDiscordAvailability', () => {
  it('reads the availability flag both ways', async () => {
    expect(
      await byDiscordAvailability(Response.json({ taken: true })),
    ).toEqual({ status: 'taken' })
    expect(
      await byDiscordAvailability(Response.json({ taken: false })),
    ).toEqual({ status: 'available' })
  })

  it('does not guess on an unexpected payload', async () => {
    expect(await byDiscordAvailability(Response.json({ ok: true }))).toEqual({
      status: 'unknown',
      detail: 'unexpected response',
    })
  })

  it('does not guess when the endpoint is throttled', async () => {
    expect(
      await byDiscordAvailability(new Response(null, { status: 429 })),
    ).toEqual({ status: 'unknown', detail: 'rate limited — retry later' })
  })
})

describe('byReachableProfile', () => {
  it('treats a reachable profile page as taken', async () => {
    expect(
      await byReachableProfile(new Response('<html>', { status: 200 })),
    ).toEqual({ status: 'taken' })
  })

  it('keeps blocked profile routes unverified', async () => {
    expect(
      await byReachableProfile(new Response('not found', { status: 404 })),
    ).toEqual({ status: 'unknown', detail: 'HTTP 404' })
  })
})
