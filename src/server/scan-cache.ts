import type { PlatformResult } from '#/lib/platforms'

/** Keep cached scans short-lived: a fresh click can always revalidate. */
export const SCAN_CACHE_TTL_MS = 10 * 60 * 1000

const MAX_ENTRIES = 200

export interface ScanCacheEntry {
  results: PlatformResult[]
  cachedAt: number
}

const cache = new Map<string, ScanCacheEntry>()

export function readScanCache(username: string): ScanCacheEntry | null {
  const key = username.toLowerCase()
  const entry = cache.get(key)

  if (!entry) return null

  if (Date.now() - entry.cachedAt >= SCAN_CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return entry
}

export function writeScanCache(
  username: string,
  results: readonly PlatformResult[],
): void {
  const key = username.toLowerCase()

  cache.delete(key)
  cache.set(key, { results: [...results], cachedAt: Date.now() })

  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

/** Test/ops seam: drops every cached scan for this server process. */
export function clearScanCache(): void {
  cache.clear()
}
