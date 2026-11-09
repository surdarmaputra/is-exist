# is-exist

One handle, twelve platforms, one parallel scan. Type a username, watch each
platform answer as it replies, and see where the handle is taken, free, or
blocked from automated checks.

Built with **TanStack Start** (React 19 + Vite) and plain CSS. No database, no
accounts, no client-side calls to the platforms — the server does the lookups.

## Run it

```bash
npm install
npm run dev      # http://localhost:3200
```

Other scripts:

```bash
npm test         # unit tests for classification, CORS and username rules
npm run typecheck
npm run build    # production build in dist/
npm run preview  # serve the production build
```

The port is fixed at **3200** in `vite.config.ts` (`strictPort`), and dev and
preview bind every interface. To run another instance:

```bash
npm run dev -- --port 3300
ALLOWED_ORIGINS=http://localhost:3300 npm run preview -- --port 3300
```

## Homelab

The homelab instance is the systemd user service `is-exist.service`: it builds
the production bundle, then serves it at **http://pisanggoreng:3200**.

```bash
cp deploy/is-exist.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now is-exist.service
systemctl --user status is-exist.service
journalctl --user -u is-exist.service -f
```

Output is also appended to `is-exist.log` in the project root. Stop it with
`systemctl --user stop is-exist.service`.

## Configuration

| Variable          | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call `/api/check` |

Copy `.env.example` to `.env` (loaded by the server, never bundled). In
development the allowlist falls back to `http://localhost:3200`; in production
it is empty, so set it to the deployed origin. Same-origin requests carry no
`Origin` header and are always accepted — CORS is a browser boundary, not
authentication.

## How it works

1. The form validates the handle (`[a-zA-Z0-9][a-zA-Z0-9._-]*`, up to 39 chars)
   and renders all twelve rows in a `checking` state immediately.
2. It calls `GET /api/check?username=<handle>`. The route streams NDJSON:
   one `{"type":"result"}` frame per platform as soon as that lookup finishes,
   then `{"type":"done"}`.
3. The server fans out with six concurrent `fetch` calls, an 8 s timeout per
   platform, and aborts everything when the browser closes the stream. The
   client aborts the stream when the username changes, a new scan starts, or
   the page unmounts.
4. Outcomes are deliberately three-state:
   - `taken` — profile page/API says the handle exists.
   - `available` — profile returned 404/410 or the platform's missing-user
     marker.
   - `unknown` — 403/429/5xx, timeout or network failure. The UI shows
     `unverified` with the reason instead of pretending the handle is free.

### Supported platforms

| Platform    | Probe                                   | Taken when                    |
| ----------- | --------------------------------------- | ----------------------------- |
| GitHub      | `github.com/<user>`                     | HTTP 200                      |
| GitLab      | `gitlab.com/api/v4/users?username=`     | result array is non-empty     |
| Mastodon    | `mastodon.social/@<user>`               | HTTP 200                      |
| YouTube     | `youtube.com/@<user>`                   | HTTP 200                      |
| X           | `x.com/<user>`                          | HTTP 200                      |
| Telegram    | `t.me/<user>`                           | page contains profile markup  |
| SoundCloud  | `soundcloud.com/<user>`                 | HTTP 200                      |
| Dribbble    | `dribbble.com/<user>`                   | HTTP 200                      |
| Keybase     | `keybase.io/<user>`                     | HTTP 200                      |
| DEV         | `dev.to/<user>`                         | HTTP 200                      |
| Hacker News | `news.ycombinator.com/user?id=<user>`   | no "No such user." marker     |
| Steam       | `steamcommunity.com/id/<user>`          | no profile-not-found marker   |

Instagram, TikTok, Facebook, Reddit, Twitch and Medium are intentionally absent:
their public pages return 200 for missing profiles, require login/JS, or block
server-side requests. Adding them would produce confident lies, not checks.

Some platforms (notably Steam vanity URLs and Mastodon accounts) are
case-insensitive or instance-specific. A `taken` row links to the profile so the
answer can be verified in one click.

## API

`GET /api/check?username=<handle>` → `application/x-ndjson`

```
{"type":"result","result":{"id":"github","status":"taken"}}
{"type":"result","result":{"id":"telegram","status":"unknown","detail":"HTTP 403"}}
...
{"type":"done"}
```

Errors before streaming use JSON: `400` for an invalid username, `403` for a
non-allowlisted `Origin`.

## Project layout

```
src/
  routes/index.tsx          UI: search, loading rows, results
  routes/api/check.ts       streaming API route + CORS gate
  hooks/use-scan.ts         NDJSON reader, row state, cancellation
  lib/platforms.ts          shared catalog and event types
  lib/username.ts           shared validation
  server/classify.ts        HTTP/marker → outcome rules
  server/platform-checks.ts per-platform probes + concurrency
  server/origins.ts         env loading and CORS decisions
  styles.css                design tokens, layout, motion
deploy/
  is-exist.service          systemd user unit for the homelab instance
```
