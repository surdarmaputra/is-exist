import { describe, expect, it } from 'vitest'
import { normalizeUsername, validateUsername } from './username'

describe('normalizeUsername', () => {
  it('trims whitespace and a leading at sign', () => {
    expect(normalizeUsername('  @surya ')).toBe('surya')
  })
})

describe('validateUsername', () => {
  it('accepts the characters every supported platform allows', () => {
    expect(validateUsername('surya.darma_putra-01')).toEqual({
      ok: true,
      username: 'surya.darma_putra-01',
    })
  })

  it('rejects empty input', () => {
    expect(validateUsername(' @ ')).toMatchObject({ ok: false })
  })

  it('rejects usernames that are too long', () => {
    expect(validateUsername('a'.repeat(40))).toMatchObject({ ok: false })
  })

  it('rejects unsupported characters', () => {
    expect(validateUsername('hello world')).toMatchObject({ ok: false })
    expect(validateUsername('.leading-dot')).toMatchObject({ ok: false })
  })
})
