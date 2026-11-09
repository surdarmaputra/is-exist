# is-exist

One handle, twenty-two checks, one parallel scan. Type a username and watch
the `.com` domain plus the social platforms answer as they reply: taken, free,
or blocked from automated checks. Every platform name links to its main site so
you can explore the ones you do not recognise.

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
   and renders all twenty-two rows in a `checking` state immediately.
2. It calls `GET /api/check?username=<handle>`. The route streams NDJSON:
   one `{"type":"result"}` frame per check as soon as that lookup finishes,
   then `{"type":"done"}`.
3. The server fans out with six concurrent `fetch` calls, an 8 s timeout per
   check, and aborts everything when the browser closes the stream. The client
   aborts the stream when the username changes, a new scan starts, or the page
   unmounts.
4. Outcomes are deliberately three-state:
   - `taken` — profile page/API says the handle exists.
   - `available` — profile returned 404/410 or the platform's missing-user
     marker.
   - `unknown` — 403/429/5xx, timeout, network failure, or a platform that will
     not answer anonymous lookups. The UI shows `unverified` with the reason
     instead of pretending the handle is free.
5. Results are grouped **Taken → Unverified → Free**, each list sorted
   alphabetically by platform name. Rows still in flight sit in a trailing
   `Checking` group; the `x taken / y free / z unverified` counts stay pinned at
   the top of the panel throughout.

### Supported checks

| Check       | Probe                                       | Taken when                       |
| ----------- | ------------------------------------------- | -------------------------------- |
| .com domain | `rdap.verisign.com/com/v1/domain/<user>.com` | RDAP returns the registration    |
| Threads     | `threads.com/@<user>` (mobile response)     | profile markup is rendered       |
| Instagram   | `instagram.com/<user>/` (mobile response)   | profile markup is rendered       |
| TikTok      | `tiktok.com/oembed?url=…/@<user>`           | oEmbed returns 200               |
| Pinterest   | `pinterest.com/<user>/`                     | no "User not found." marker      |
| Snapchat    | `snapchat.com/add/<user>`                   | public profile page renders      |
| Reddit      | `reddit.com/user/<user>/.rss`               | RSS feed returns 200             |
| Discord     | username availability endpoint              | `{"taken":true}`                 |
| Lemon8      | `lemon8-app.com/@<user>`                    | public profile page renders      |
| Facebook    | `facebook.com/<user>` (mobile response)     | HTTP 200; 302 to mobile = free   |
| GitHub      | `github.com/<user>`                         | HTTP 200                         |
| GitLab      | `gitlab.com/api/v4/users?username=`         | result array is non-empty        |
| Mastodon    | `mastodon.social/@<user>`                   | HTTP 200                         |
| YouTube     | `youtube.com/@<user>`                       | HTTP 200                         |
| X           | `x.com/<user>`                              | HTTP 200                         |
| Telegram    | `t.me/<user>`                               | page contains profile markup     |
| SoundCloud  | `soundcloud.com/<user>`                     | HTTP 200                         |
| Dribbble    | `dribbble.com/<user>`                       | HTTP 200                         |
| Keybase     | `keybase.io/<user>`                         | HTTP 200                         |
| DEV         | `dev.to/<user>`                             | HTTP 200                         |
| Hacker News | `news.ycombinator.com/user?id=<user>`       | no "No such user." marker        |
| Steam       | `steamcommunity.com/id/<user>`              | no profile-not-found marker      |

Notes that matter:

- Instagram, Threads and Facebook only expose public profile data to their
  mobile web clients, so the server identifies as a mobile browser. If one of
  them answers with a login wall instead, the row stays `unverified` rather
  than claiming the handle is free.
- Snapchat and Lemon8 only confirm **public** profiles. A regular account with
  no public page, or a blocked lookup, is `unverified` — never "free".
- Discord has no public profile URL by username, so taken Discord rows have no
  profile link. The platform name still links to `discord.com`.
- Reddit rate-limits RSS requests; a 429 becomes `unverified`.
- Discord's unauthenticated availability endpoint can rate-limit too; a 429
  becomes `unverified` and clears after a short wait.
- Usernames containing underscores cannot form a valid DNS label, so the
  `.com` row reports `unverified` for them.
- A `taken` row links straight to the profile so the answer can be verified in
  one click; an `unverified` row links to the profile for a manual look.

## API

`GET /api/check?username=<handle>` → `application/x-ndjson`

```
{"type":"result","result":{"id":"github","status":"taken"}}
{"type":"result","result":{"id":"snapchat","status":"unknown","detail":"HTTP 404"}}
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
  lib/domain.ts             username → .com domain validation
  lib/username.ts           shared validation
  server/classify.ts        HTTP/marker → outcome rules
  server/platform-checks.ts per-platform probes + concurrency
  server/origins.ts         env loading and CORS decisions
  styles.css                design tokens, layout, motion
deploy/
  is-exist.service          systemd user unit for the homelab instance
```
