import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { PLATFORMS, type CheckStatus, type RowStatus } from '#/lib/platforms'
import { groupRows, type RowGroup } from '#/lib/group-rows'
import { validateUsername } from '#/lib/username'
import { useScan, type ScanRow } from '#/hooks/use-scan'

export const Route = createFileRoute('/')({
  component: Home,
})

const STATUS_COPY: Record<RowStatus, string> = {
  checking: 'checking',
  taken: 'taken',
  available: 'free',
  unknown: 'unverified',
}

const TALLY_ORDER: CheckStatus[] = ['taken', 'available', 'unknown']

function Home() {
  const [input, setInput] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [scannedUsername, setScannedUsername] = useState<string | null>(null)
  const { rows, phase, error, start, cancel } = useScan()

  const isScanning = phase === 'scanning'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const check = validateUsername(input)
    if (!check.ok) {
      setFormError(check.reason)
      return
    }

    setFormError(null)
    setInput(check.username)
    setScannedUsername(check.username)
    start(check.username)
  }

  const handleInput = (value: string) => {
    setInput(value)
    setFormError(null)

    // A new handle invalidates the run in flight: abort it immediately.
    if (rows) cancel()
    setScannedUsername(null)
  }

  return (
    <main className="page">
      <div className="backdrop" aria-hidden="true" />

      <header className="topbar">
        <span className="brand">
          <span className="brand-dot" aria-hidden="true" />
          is-exist
        </span>
        <span className="topbar-note">
          {PLATFORMS.length} checks · one scan
        </span>
      </header>

      <section className="hero">
        <p className="eyebrow">
          <span aria-hidden="true">✦</span> username radar
        </p>
        <h1>
          Is it <em>taken</em>?
        </h1>
        <p className="lede">
          Check one handle everywhere before you claim it. No accounts, no
          sign-ups — just a quick look at public profile pages.
        </p>

        <form className="search" onSubmit={handleSubmit} noValidate>
          <div className={`search-field${formError ? ' is-invalid' : ''}`}>
            <span className="at" aria-hidden="true">
              @
            </span>
            <label className="sr-only" htmlFor="username">
              Username to check
            </label>
            <input
              id="username"
              name="username"
              value={input}
              onChange={(event) => handleInput(event.target.value)}
              placeholder="yourname"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={42}
              aria-invalid={formError !== null}
              aria-describedby="username-help"
            />
          </div>

          <button
            className="cta"
            type="submit"
            disabled={isScanning}
            aria-busy={isScanning}
          >
            {isScanning ? (
              <>
                <span className="spinner" aria-hidden="true" />
                checking
              </>
            ) : (
              <>
                check
                <span className="cta-arrow" aria-hidden="true">
                  →
                </span>
              </>
            )}
          </button>
        </form>

        <p
          id="username-help"
          className={`help${formError ? ' is-error' : ''}`}
          role={formError ? 'alert' : undefined}
        >
          {formError ??
            'letters, numbers, dots, dashes or underscores · up to 39 characters'}
        </p>
      </section>

      <section className="stage" aria-label="Username check results">
        {rows ? (
          <ResultPanel
            rows={rows}
            username={scannedUsername}
            phase={phase}
            error={error}
          />
        ) : (
          <Coverage />
        )}
      </section>

      <footer className="footer">
        <span>
          Results come from public profile responses. Private, suspended or
          rate-limited profiles may show as unverified.
        </span>
        <span className="footer-mark">made for the handle-hoarders</span>
      </footer>
    </main>
  )
}

interface ResultPanelProps {
  rows: ScanRow[]
  username: string | null
  phase: 'idle' | 'scanning' | 'done' | 'error'
  error: string | null
}

function ResultPanel({ rows, username, phase, error }: ResultPanelProps) {
  const total = rows.length
  const resolved = rows.filter((row) => row.status !== 'checking').length
  const counts = TALLY_ORDER.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }))
  const groups = groupRows(rows)

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <p className="panel-kicker">results for</p>
          <h2 className="panel-title">@{username}</h2>
        </div>
        <div className="tallies" aria-live="polite">
          {counts.map((tally) => (
            <span key={tally.status} className={`tally tally--${tally.status}`}>
              <span className="tally-dot" aria-hidden="true" />
              {tally.count} {STATUS_COPY[tally.status]}
            </span>
          ))}
        </div>
      </header>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${(resolved / total) * 100}%` }} />
      </div>

      <div className="rows-wrap">
        {groups.map((group) => (
          <ResultGroup
            key={group.status}
            group={group}
            username={username}
          />
        ))}
      </div>

      <p
        className={`panel-foot${phase === 'error' ? ' is-error' : ''}`}
        role={phase === 'error' ? 'alert' : 'status'}
      >
        {phase === 'error'
          ? (error ?? 'The scan stopped unexpectedly.')
          : phase === 'done'
            ? `All ${total} checks answered. Go claim your name.`
            : `Checked ${resolved} of ${total} — results land as they arrive.`}
      </p>
    </div>
  )
}

function ResultGroup({
  group,
  username,
}: {
  group: RowGroup<ScanRow>
  username: string | null
}) {
  return (
    <section className={`group group--${group.status}`} aria-label={`${group.label} results`}>
      <h3 className="group-title">
        <span className="group-dot" aria-hidden="true" />
        {group.label}
        <span className="group-count">{group.rows.length}</span>
      </h3>
      <ol className="rows">
        {group.rows.map((row, index) => (
          <ResultRow
            key={row.platform.id}
            row={row}
            username={username}
            index={index}
          />
        ))}
      </ol>
    </section>
  )
}

function ResultRow({
  row,
  username,
  index,
}: {
  row: ScanRow
  username: string | null
  index: number
}) {
  const { platform, status, detail } = row
  const profileUrl = username ? (platform.profileUrl?.(username) ?? null) : null
  const actionLabel =
    status === 'taken' ? 'visit' : status === 'unknown' ? 'inspect' : null

  return (
    <li
      className={`row row--${status}`}
      style={{ animationDelay: `${Math.min(index * 35, 240)}ms` }}
    >
      <span
        className="badge"
        style={{
          backgroundColor: platform.accent,
          color: platform.badgeText,
        }}
        aria-hidden="true"
      >
        {platform.glyph}
      </span>

      <span className="row-main">
        <a
          className="row-name"
          href={platform.homeUrl}
          target="_blank"
          rel="noreferrer noopener"
          title={`Open ${platform.name}`}
        >
          {platform.name}
          <span className="row-home" aria-hidden="true">
            ↗
          </span>
        </a>
        {detail ? <span className="row-detail">{detail}</span> : null}
      </span>

      <span className={`pill pill--${status}`}>
        {status === 'checking' ? (
          <>
            <span className="dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            checking
          </>
        ) : (
          <>
            <span className="pill-dot" aria-hidden="true" />
            {STATUS_COPY[status]}
          </>
        )}
      </span>

      {profileUrl && actionLabel ? (
        <a
          className="row-link"
          href={profileUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          {actionLabel} <span aria-hidden="true">↗</span>
          <span className="sr-only"> {platform.name} profile</span>
        </a>
      ) : (
        <span className="row-link row-link--muted" aria-hidden="true" />
      )}
    </li>
  )
}

function Coverage() {
  return (
    <div className="coverage">
      <div className="coverage-head">
        <h2>One handle, {PLATFORMS.length} doors.</h2>
        <p>
          Every check runs in parallel. Rows fill in as each platform replies,
          so you never stare at a blank screen.
        </p>
      </div>
      <ul className="chips">
        {PLATFORMS.map((platform, index) => (
          <li
            key={platform.id}
            style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
          >
            <a
              className="chip"
              href={platform.homeUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={`Open ${platform.name}`}
            >
              <span
                className="chip-badge"
                style={{
                  backgroundColor: platform.accent,
                  color: platform.badgeText,
                }}
                aria-hidden="true"
              >
                {platform.glyph}
              </span>
              {platform.name}
              <span className="chip-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
