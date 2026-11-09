declare const __SITE_URL__: string

export const SITE_NAME = 'is-exist'

export const SITE_URL =
  typeof __SITE_URL__ === 'string'
    ? __SITE_URL__.replace(/\/+$/, '')
    : 'http://pisanggoreng:3200'

export const SITE_DESCRIPTION =
  'Check one username across 22 social platforms and .com domains in a single parallel scan.'

export const OG_IMAGE = `${SITE_URL}/og.png`

export const OG_IMAGE_ALT =
  'is-exist — check a username across social platforms and .com domains'
