const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

/**
 * Turns a checked handle into the `.com` domain it would claim, or null when
 * the handle cannot form a valid DNS label (underscores, leading dashes, …).
 */
export function comDomainFor(username: string): string | null {
  const domain = `${username.toLowerCase()}.com`
  const labels = domain.split('.')

  return labels.every((label) => DOMAIN_LABEL.test(label)) ? domain : null
}
