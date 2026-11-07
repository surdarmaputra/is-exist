import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PLATFORMS,
  type Platform,
  type PlatformId,
  type RowStatus,
  type ScanEvent,
} from '#/lib/platforms'

export interface ScanRow {
  platform: Platform
  status: RowStatus
  detail?: string
}

export type ScanPhase = 'idle' | 'scanning' | 'done' | 'error'

function initialRows(): ScanRow[] {
  return PLATFORMS.map((platform) => ({
    platform,
    status: 'checking' as const,
  }))
}

function isResultEvent(
  event: ScanEvent,
): event is Extract<ScanEvent, { type: 'result' }> {
  return event.type === 'result'
}

export function useScan() {
  const [rows, setRows] = useState<ScanRow[] | null>(null)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const cancel = useCallback(() => {
    stop()
    setRows(null)
    setPhase('idle')
    setError(null)
  }, [stop])

  const start = useCallback(
    (username: string) => {
      stop()

      const controller = new AbortController()
      controllerRef.current = controller

      setRows(initialRows())
      setPhase('scanning')
      setError(null)

      const isCurrent = () => controllerRef.current === controller

      const updateRow = (id: PlatformId, status: RowStatus, detail?: string) => {
        if (!isCurrent()) return

        setRows((previous) =>
          previous
            ? previous.map((row) =>
                row.platform.id === id ? { ...row, status, detail } : row,
              )
            : previous,
        )
      }

      const apply = (event: ScanEvent) => {
        if (!isCurrent()) return

        if (isResultEvent(event)) {
          updateRow(event.result.id, event.result.status, event.result.detail)
          return
        }

        if (event.type === 'done') {
          controllerRef.current = null
          setPhase('done')
          return
        }

        controllerRef.current = null
        setPhase('error')
        setError(event.message)
      }

      const readStream = async () => {
        try {
          const response = await fetch(
            `/api/check?username=${encodeURIComponent(username)}`,
            {
              signal: controller.signal,
              headers: { accept: 'application/x-ndjson' },
            },
          )

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as {
              error?: string
            } | null
            throw new Error(payload?.error ?? 'The checker is unavailable.')
          }

          if (!response.body) {
            throw new Error('Your browser cannot stream the results.')
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let sawDone = false

          const consume = (line: string) => {
            if (!line.trim()) return

            try {
              const event = JSON.parse(line) as ScanEvent
              if (event.type === 'done') sawDone = true
              apply(event)
            } catch {
              // Ignore a malformed frame; the rest of the stream is still good.
            }
          }

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            let newline = buffer.indexOf('\n')
            while (newline !== -1) {
              consume(buffer.slice(0, newline))
              buffer = buffer.slice(newline + 1)
              newline = buffer.indexOf('\n')
            }
          }

          buffer += decoder.decode()
          consume(buffer)

          if (!sawDone && isCurrent()) {
            controllerRef.current = null
            setPhase('error')
            setError('The scan ended before every platform answered.')
          }
        } catch (caught) {
          if (!isCurrent() || controller.signal.aborted) return

          controllerRef.current = null
          setPhase('error')
          setError(
            caught instanceof Error && caught.message
              ? caught.message
              : 'Something went wrong while checking usernames.',
          )
        }
      }

      void readStream()
    },
    [stop],
  )

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  return { rows, phase, error, start, cancel }
}
