const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

export function parseOrigins(raw: string | undefined): Set<string> {
  if (!raw) return new Set()

  return new Set(
    raw
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter((origin) => origin.length > 0),
  )
}

export interface CorsDecision {
  allowed: boolean
  headers: Record<string, string>
}

export function decideCors(
  origin: string | null,
  allowedOrigins: Set<string>,
): CorsDecision {
  if (origin === null) {
    // Same-origin browser GETs do not send Origin. Allow them; CORS only ever
    // gates cross-origin browser access.
    return { allowed: true, headers: { vary: 'Origin' } }
  }

  if (!allowedOrigins.has(origin)) {
    return { allowed: false, headers: { vary: 'Origin' } }
  }

  return {
    allowed: true,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
      vary: 'Origin',
    },
  }
}

let envLoaded = false

function loadEnvFile() {
  if (envLoaded) return
  envLoaded = true

  try {
    // Node >= 20.12. Keeps `.env` out of the client bundle.
    process.loadEnvFile('.env')
  } catch {
    // No .env file is fine; deployment environment variables still work.
  }
}

export function getAllowedOrigins(): Set<string> {
  loadEnvFile()

  const configured = parseOrigins(process.env.ALLOWED_ORIGINS)
  if (configured.size > 0) return configured

  if (process.env.NODE_ENV !== 'production') {
    return new Set(DEFAULT_DEV_ORIGINS)
  }

  return new Set()
}
