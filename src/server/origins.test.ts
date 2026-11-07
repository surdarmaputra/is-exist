import { describe, expect, it } from 'vitest'
import { decideCors, parseOrigins } from './origins'

describe('parseOrigins', () => {
  it('splits, trims and normalises configured origins', () => {
    expect(
      parseOrigins(' https://is-exist.app/ , http://localhost:3000 '),
    ).toEqual(new Set(['https://is-exist.app', 'http://localhost:3000']))
  })

  it('returns an empty set when nothing is configured', () => {
    expect(parseOrigins(undefined).size).toBe(0)
    expect(parseOrigins(' , ').size).toBe(0)
  })
})

describe('decideCors', () => {
  const allowed = new Set(['https://is-exist.app'])

  it('allows same-origin requests that carry no Origin header', () => {
    expect(decideCors(null, allowed)).toEqual({
      allowed: true,
      headers: { vary: 'Origin' },
    })
  })

  it('echoes an allowlisted origin', () => {
    const decision = decideCors('https://is-exist.app', allowed)

    expect(decision.allowed).toBe(true)
    expect(decision.headers['access-control-allow-origin']).toBe(
      'https://is-exist.app',
    )
  })

  it('rejects an origin outside the allowlist', () => {
    const decision = decideCors('https://evil.example', allowed)

    expect(decision.allowed).toBe(false)
    expect(decision.headers['access-control-allow-origin']).toBeUndefined()
  })
})
