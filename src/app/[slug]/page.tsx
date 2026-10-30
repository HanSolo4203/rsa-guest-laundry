import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { BookingForm } from '@/components/home/booking-form'
import { PropertyThemeProvider } from '@/components/property-theme-provider'
import { getActiveProperty, getPropertyServices } from '@/lib/properties'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

function safeIconUrl(url: string | null): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
    return parsed.href
  } catch {
    return undefined
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const property = await getActiveProperty(slug)
  if (!property) {
    return { title: 'Property not found' }
  }

  const icon = safeIconUrl(property.logo_url)
  return {
    title: property.name,
    description: property.welcome_message || property.heading,
    icons: icon ? { icon, apple: icon } : undefined,
  }
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  const { slug } = await params
  const property = await getActiveProperty(slug)
  const themeColor = property?.primary_color?.trim()
  const safeTheme =
    themeColor && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(themeColor)
      ? themeColor
      : '#2B5F44'

  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: safeTheme,
  }
}

export default async function PropertyBookingPage({ params }: PageProps) {
  const { slug } = await params
  const property = await getActiveProperty(slug)
  if (!property) notFound()

  const services = await getPropertyServices(property.id)

  return (
    <PropertyThemeProvider
      font={property.font}
      primaryColor={property.primary_color}
      accentColor={property.accent_color}
      backgroundColor={property.background_color}
      textColor={property.text_color}
      buttonTextColor={property.button_text_color}
    >
      <BookingForm property={property} services={services} />
    </PropertyThemeProvider>
  )
}
