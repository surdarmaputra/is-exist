import { describe, expect, it } from 'vitest'
import { comDomainFor } from './domain'

describe('comDomainFor', () => {
  it('builds a lowercase .com domain from a handle', () => {
    expect(comDomainFor('Surya')).toBe('surya.com')
  })

  it('supports multi-label handles', () => {
    expect(comDomainFor('make.it')).toBe('make.it.com')
  })

  it('rejects labels that DNS does not allow', () => {
    expect(comDomainFor('surya_darma')).toBeNull()
    expect(comDomainFor('-leading')).toBeNull()
    expect(comDomainFor('trailing-')).toBeNull()
    expect(comDomainFor('a..b')).toBeNull()
  })
})
