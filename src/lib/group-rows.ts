import type { RowStatus } from './platforms'

export interface GroupableRow {
  platform: { name: string }
  status: RowStatus
}

export interface RowGroup<T> {
  status: RowStatus
  label: string
  rows: T[]
}

const GROUP_LABELS: Array<{ status: RowStatus; label: string }> = [
  { status: 'taken', label: 'Taken' },
  { status: 'unknown', label: 'Unverified' },
  { status: 'available', label: 'Free' },
]

const collator = new Intl.Collator('en', { sensitivity: 'base' })

function byPlatformName<T extends GroupableRow>(a: T, b: T): number {
  return collator.compare(a.platform.name, b.platform.name)
}

/**
 * Final results are grouped taken → unverified → free, each alphabetical.
 * Rows still in flight get their own trailing group so they never disappear
 * while the scan is running.
 */
export function groupRows<T extends GroupableRow>(
  rows: readonly T[],
): RowGroup<T>[] {
  const groups: RowGroup<T>[] = []

  for (const { status, label } of GROUP_LABELS) {
    const grouped = rows
      .filter((row) => row.status === status)
      .sort(byPlatformName)

    if (grouped.length > 0) {
      groups.push({ status, label, rows: grouped })
    }
  }

  const checking = rows
    .filter((row) => row.status === 'checking')
    .sort(byPlatformName)

  if (checking.length > 0) {
    groups.push({ status: 'checking', label: 'Checking', rows: checking })
  }

  return groups
}
