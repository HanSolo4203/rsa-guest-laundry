/**
 * Public hostname → property slug.
 *
 * A matching host serves that property's booking page at `/`.
 * Add a line here when a property gets its own address. Nothing else
 * needs to change.
 *
 * Example: 91loop.rslexpress.co.za serves the /91-loop booking page.
 */
export const hostSlugMap: Record<string, string> = {
  '91loop.rslexpress.co.za': '91-loop',
}

export function slugForHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null

  const hostname = hostHeader.split(',')[0]?.trim().toLowerCase().split(':')[0]
  if (!hostname) return null

  return hostSlugMap[hostname] ?? null
}
