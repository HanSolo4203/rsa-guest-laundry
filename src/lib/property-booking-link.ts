import QRCode from 'qrcode'
import { hostSlugMap } from '@/config/host-slugs'

const PROPERTY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function propertyPortalPath(slug: string): string {
  if (!PROPERTY_SLUG.test(slug)) return '/portal'
  return `/portal/${slug}`
}

export function propertyBookingUrl(slug: string): string {
  const host = Object.entries(hostSlugMap).find(([, mapped]) => mapped === slug)?.[0]
  if (host) return `https://${host}/`
  if (typeof window === 'undefined') return `/${slug}`
  return `${window.location.origin}/${slug}`
}

export function propertyPortalUrl(slug: string): string {
  const path = propertyPortalPath(slug)
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export async function copyPropertyBookingLink(slug: string): Promise<string> {
  const url = propertyBookingUrl(slug)
  await navigator.clipboard.writeText(url)
  return url
}

export async function copyPropertyPortalLink(slug: string): Promise<string> {
  const url = propertyPortalUrl(slug)
  await navigator.clipboard.writeText(url)
  return url
}

export async function downloadPropertyQr(slug: string): Promise<void> {
  const url = propertyBookingUrl(slug)
  const dataUrl = await QRCode.toDataURL(url, {
    width: 640,
    margin: 2,
  })
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${slug}-booking-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}
