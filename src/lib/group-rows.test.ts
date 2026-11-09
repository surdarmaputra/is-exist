import { describe, expect, it } from 'vitest'
import { groupRows } from './group-rows'

function row(name: string, status: 'taken' | 'available' | 'unknown' | 'checking') {
  return { platform: { name }, status }
}

describe('groupRows', () => {
  it('groups in taken → unverified → free order and sorts by name', () => {
    const groups = groupRows([
      row('Zeta', 'available'),
      row('Instagram', 'taken'),
      row('discord', 'taken'),
      row('Snapchat', 'unknown'),
      row('Apple', 'available'),
      row('Lemon8', 'unknown'),
    ])

    expect(groups.map((group) => [group.label, group.rows.map((r) => r.platform.name)])).toEqual([
      ['Taken', ['discord', 'Instagram']],
      ['Unverified', ['Lemon8', 'Snapchat']],
      ['Free', ['Apple', 'Zeta']],
    ])
  })

  it('keeps in-flight rows in a trailing checking group', () => {
    const groups = groupRows([
      row('GitHub', 'taken'),
      row('Threads', 'checking'),
      row('X', 'checking'),
    ])

    expect(groups.map((group) => group.label)).toEqual(['Taken', 'Checking'])
    expect(groups.at(-1)?.rows.map((r) => r.platform.name)).toEqual([
      'Threads',
      'X',
    ])
  })

  it('omits empty groups', () => {
    expect(groupRows([row('GitHub', 'taken')]).map((group) => group.label)).toEqual([
      'Taken',
    ])
  })
})
