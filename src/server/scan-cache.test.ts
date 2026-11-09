import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlatformResult } from '#/lib/platforms'
import {
  SCAN_CACHE_TTL_MS,
  clearScanCache,
  readScanCache,
  writeScanCache,
} from './scan-cache'

const results: PlatformResult[] = [
  { id: 'github', status: 'taken' },
  { id: 'domain', status: 'available' },
]

beforeEach(() => {
  clearScanCache()
  vi.useRealTimers()
})

afterEach(() => {
  clearScanCache()
  vi.useRealTimers()
})

describe('scan cache', () => {
  it('stores a completed scan and looks it up case-insensitively', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    writeScanCache('Surya', results)

    const entry = readScanCache('surya')

    expect(entry?.results).toEqual(results)
    expect(entry?.cachedAt).toBe(new Date('2026-01-01T00:00:00Z').getTime())
  })

  it('expires entries after the TTL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    writeScanCache('surya', results)

    vi.advanceTimersByTime(SCAN_CACHE_TTL_MS - 1)
    expect(readScanCache('surya')).not.toBeNull()

    vi.advanceTimersByTime(2)
    expect(readScanCache('surya')).toBeNull()
  })

  it('can be cleared explicitly', () => {
    writeScanCache('surya', results)
    clearScanCache()

    expect(readScanCache('surya')).toBeNull()
  })
})
