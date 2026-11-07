import { createFileRoute } from '@tanstack/react-router'
import type { ScanEvent } from '#/lib/platforms'
import { validateUsername } from '#/lib/username'
import { getAllowedOrigins, decideCors } from '#/server/origins'
import { runScan } from '#/server/platform-checks'

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: { ...headers, 'cache-control': 'no-store' },
  })
}

export const Route = createFileRoute('/api/check')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => {
        const cors = decideCors(
          request.headers.get('origin'),
          getAllowedOrigins(),
        )

        return new Response(null, {
          status: cors.allowed ? 204 : 403,
          headers: cors.headers,
        })
      },

      GET: ({ request }) => {
        const cors = decideCors(
          request.headers.get('origin'),
          getAllowedOrigins(),
        )

        if (!cors.allowed) {
          return jsonResponse(
            { error: 'This origin is not allowed to use the checker.' },
            403,
            cors.headers,
          )
        }

        const rawUsername = new URL(request.url).searchParams.get('username')
        const check = validateUsername(rawUsername ?? '')

        if (!check.ok) {
          return jsonResponse({ error: check.reason }, 400, cors.headers)
        }

        // The browser aborts the response when the user resubmits, edits the
        // username, or closes the tab; stop the upstream lookups with it.
        const abort = new AbortController()
        const abortUpstream = () => abort.abort()
        request.signal.addEventListener('abort', abortUpstream)

        const encoder = new TextEncoder()

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (event: ScanEvent) => {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            }

            try {
              await runScan(check.username, abort.signal, (id, outcome) => {
                send({
                  type: 'result',
                  result: { id, status: outcome.status, detail: outcome.detail },
                })
              })

              if (!abort.signal.aborted) send({ type: 'done' })
            } catch {
              if (!abort.signal.aborted) {
                send({
                  type: 'error',
                  message: 'The scan stopped unexpectedly. Try again.',
                })
              }
            } finally {
              request.signal.removeEventListener('abort', abortUpstream)
              try {
                controller.close()
              } catch {
                // Already closed by the client.
              }
            }
          },
          cancel() {
            abortUpstream()
            request.signal.removeEventListener('abort', abortUpstream)
          },
        })

        return new Response(stream, {
          headers: {
            ...cors.headers,
            'content-type': 'application/x-ndjson; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          },
        })
      },
    },
  },
})
