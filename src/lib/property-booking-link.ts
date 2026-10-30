import QRCode from 'qrcode'
import { hostSlugMap } from '@/config/host-slugs'

export function propertyBookingUrl(slug: string): string {
  const host = Object.entries(hostSlugMap).find(([, mapped]) => mapped === slug)?.[0]
  if (host) return `https://${host}/`
  if (typeof window === 'undefined') return `/${slug}`
  return `${window.location.origin}/${slug}`
}

export async function copyPropertyBookingLink(slug: string): Promise<string> {
  const url = propertyBookingUrl(slug)
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
