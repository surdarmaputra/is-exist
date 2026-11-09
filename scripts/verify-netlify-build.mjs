import { existsSync } from 'node:fs'

const entry = '.netlify/v1/functions/server.mjs'

if (!existsSync(entry)) {
  console.error(
    `[netlify] ${entry} was not generated. ` +
      'Set NETLIFY_DEPLOYMENT=1 and make sure ' +
      '@netlify/vite-plugin-tanstack-start is installed before building.',
  )
  process.exit(1)
}

console.log(`[netlify] ${entry} ready`)
