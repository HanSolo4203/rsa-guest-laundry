const YOCO_HOST = /(^|\.)yoco\.com$/i

export function isYocoRedirect(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && YOCO_HOST.test(url.hostname)
  } catch {
    return false
  }
}
