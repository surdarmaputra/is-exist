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

## Deploy to Netlify

The repo is Netlify-ready without changing the homelab setup. `netlify.toml`
sets `NETLIFY_DEPLOYMENT=1`; `vite.config.ts` loads
`@netlify/vite-plugin-tanstack-start` only when that flag is `1`. Without it,
builds keep producing the plain Node output used by `is-exist.service`.

1. Push the repo to GitHub.
2. Import it at <https://app.netlify.com/start>.
3. Netlify runs `npm run build:netlify`, publishes `dist/client`, and wraps the
   SSR and `/api/check` routes in a Netlify Function
   (`.netlify/v1/functions/server.mjs`). The build fails fast if the adapter did
   not produce that function.
4. In **Site settings → Environment variables**, set
   `ALLOWED_ORIGINS=https://<your-site>.netlify.app` if the API is consumed from
   another origin.
5. Deploy.

To build the Netlify bundle locally:

```bash
npm run build:netlify
```

That writes `.netlify/v1/functions/server.mjs`; it is not served by
`npm run preview`. Plain `npm run build` still produces `dist/server/server.js`
for the homelab. On Netlify the in-memory scan cache is per function instance,
so cache hits there are best-effort.

### If Netlify says "Page not found"

That is Netlify's fallback when no function handles `/`, which means either the
deploy is stale or the Netlify adapter did not run during the build:

1. Make sure the production branch is `main` and the deploy includes commit
   `525d20c` (the Netlify adapter) or later.
2. In **Project configuration → Build settings**, the build command should be
   `npm run build:netlify` and the publish directory `dist/client`. They are
   declared in `netlify.toml`, which overrides the UI; make sure the file is at
   the repository root and the base directory is empty.
3. The deploy log should contain
   `Netlify ✓ Wrote SSR entry point to .netlify/v1/functions/server.mjs`, and
   the deploy's **Functions** tab should list `server`.
4. Trigger **Clear cache and deploy site** so Netlify reinstalls dependencies
   and rereads `netlify.toml`.

A Deploy Preview from an older pull request will still 404 until that branch
contains the adapter commit; production deploys of `main` have it.

## Configuration

| Variable          | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call `/api/check` |

Copy `.env.example` to `.env` (loaded by the server, never bundled). In
development the allowlist falls back to `http://localhost:3200`; in production
it is empty, so set it to the deployed origin. Same-origin requests carry no
`Origin` header and are always accepted — CORS is a browser boundary, not
authentication.

## Refresh and cache

The checked handle lives in the URL (`/?u=nasa`). Submitting a scan updates the
query string, so refreshing restores the input and runs the same lookup again.

Completed scans are cached in the server process for **10 minutes**, keyed by
the lowercased handle, and shared by every browser hitting the same homelab
instance. A cache hit streams the stored results immediately; the panel shows
`from cache · N min ago` with a `refetch` button. Refetching sends `&fresh=1`,
bypasses the cache, streams live results, and overwrites the cache entry.

The cache is in-memory and disappears when `is-exist.service` restarts. Entries
are capped at 200, expired entries are dropped on read, and `?fresh=1` can also
be called directly when debugging.

## How it works

1. The form validates the handle (`[a-zA-Z0-9][a-zA-Z0-9._-]*`, up to 39 chars)
   and renders all twenty-two rows in a `checking` state immediately.
2. It calls `GET /api/check?username=<handle>`. The route streams NDJSON: a
   `source` frame (`live` or `cache`), one `{"type":"result"}` frame per check
   as soon as that lookup finishes, then `{"type":"done"}`.
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

`GET /api/check?username=<handle>[&fresh=1]` → `application/x-ndjson`

```
{"type":"source","source":"cache","cachedAt":"2026-11-09T04:00:00.000Z"}
{"type":"result","result":{"id":"github","status":"taken"}}
{"type":"result","result":{"id":"snapchat","status":"unknown","detail":"HTTP 404"}}
...
{"type":"done"}
```

`fresh=1` skips the cache and revalidates it. The response header `x-cache` is
`HIT` or `MISS` for convenience. Errors before streaming use JSON: `400` for an
invalid username, `403` for a non-allowlisted `Origin`.

## Project layout

```
src/
  routes/index.tsx          UI: search, loading rows, results
  routes/api/check.ts       streaming API route + CORS gate
  hooks/use-scan.ts         NDJSON reader, row state, cancellation
  lib/platforms.ts          shared catalog and event types
  lib/domain.ts             username → .com domain validation
  lib/group-rows.ts         status grouping and alphabetical sort
  lib/username.ts           shared validation
  server/classify.ts        HTTP/marker → outcome rules
  server/platform-checks.ts per-platform probes + concurrency
  server/scan-cache.ts      in-memory TTL cache for completed scans
  server/origins.ts         env loading and CORS decisions
  styles.css                design tokens, layout, motion
deploy/
  is-exist.service          systemd user unit for the homelab instance
scripts/
  verify-netlify-build.mjs  fails Netlify builds without the SSR function
netlify.toml                Netlify build switch and publish directory
```
