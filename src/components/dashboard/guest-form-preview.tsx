'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { PropertyThemeProvider } from '@/components/property-theme-provider'
import type { PropertyBackgroundType, Service } from '@/lib/types/database'

export type GuestPreviewModel = {
  name: string
  logoUrl: string | null
  backgroundUrl: string | null
  backgroundType: PropertyBackgroundType
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  buttonTextColor: string
  font: string
  heading: string
  welcomeMessage: string
  contactInfo: string
  askRoomNumber: boolean
}

function safeAssetUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:' && parsed.protocol !== 'blob:') return null
    return parsed.href
  } catch {
    return null
  }
}

export function GuestFormPreview({
  property,
  services,
}: {
  property: GuestPreviewModel
  services: Service[]
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const logoUrl = safeAssetUrl(property.logoUrl)
  const backgroundUrl = safeAssetUrl(property.backgroundUrl)

  useEffect(() => {
    setLogoFailed(false)
  }, [logoUrl])
  const showImage = property.backgroundType === 'image' && Boolean(backgroundUrl)
  const showVideo = property.backgroundType === 'video' && Boolean(backgroundUrl)
  const showLogo = Boolean(logoUrl) && !logoFailed

  return (
    <PropertyThemeProvider
      font={property.font}
      primaryColor={property.primaryColor}
      accentColor={property.accentColor}
      backgroundColor={property.backgroundColor}
      textColor={property.textColor}
      buttonTextColor={property.buttonTextColor}
      className="guest-preview overflow-hidden rounded-2xl shadow-lg"
    >
      <section className="guest-booking relative h-[42rem] overflow-x-hidden overflow-y-auto" aria-hidden="true">
        <div className="pointer-events-none">
          <div className="absolute inset-0" aria-hidden="true">
            {showVideo ? (
              <video className="h-full w-full object-cover" src={backgroundUrl ?? undefined} autoPlay muted loop playsInline />
            ) : null}
            {showImage ? (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: backgroundUrl ? `url(${JSON.stringify(backgroundUrl)})` : undefined }}
              />
            ) : null}
            {showImage || showVideo ? <div className="guest-scrim absolute inset-0" /> : null}
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col px-4 py-8">
            <header className="pt-2 text-center">
              {showLogo ? (
                // Uploaded logos can be any public URL. A plain img keeps the preview in sync while editing.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl ?? undefined}
                  alt=""
                  className="mx-auto mb-4 h-16 w-auto max-w-[70%] object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <p className="mb-2 text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
                  {property.name || 'Property name'}
                </p>
              )}
              <h1 className="text-2xl font-semibold leading-tight tracking-tight" style={{ color: 'var(--brand-primary)' }}>
                {property.heading || 'Heading'}
              </h1>
              {property.welcomeMessage ? (
                <p className="guest-hint mx-auto mt-2 max-w-sm whitespace-pre-line text-base leading-relaxed">
                  {property.welcomeMessage}
                </p>
              ) : null}
            </header>

            <div className="guest-card mt-6 rounded-2xl p-5 shadow-lg">
              {services.length === 0 ? (
                <p className="py-6 text-center text-base leading-relaxed">
                  Laundry booking isn&apos;t available right now. Please ask reception.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PreviewField label="First name" />
                    <PreviewField label="Last name" />
                  </div>
                  <div className={`grid grid-cols-1 gap-4 ${property.askRoomNumber ? 'sm:grid-cols-2' : ''}`}>
                    <PreviewField label="Phone" />
                    {property.askRoomNumber ? <PreviewField label="Room number" optional /> : null}
                  </div>
                  <div>
                    <FieldLabel>Service</FieldLabel>
                    <div className="relative">
                      <select className="guest-field appearance-none pr-10" defaultValue="" tabIndex={-1}>
                        <option value="">Select a service</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} · {service.price}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PreviewField label="Collection date" />
                    <PreviewField label="Departure date" />
                  </div>
                  <div>
                    <FieldLabel optional>Notes</FieldLabel>
                    <textarea className="guest-field min-h-24 resize-y" rows={3} readOnly tabIndex={-1} />
                  </div>
                  <div className="guest-submit inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-medium">
                    <span>Submit request</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              )}
            </div>

            {property.contactInfo ? (
              <p className="guest-hint mx-auto mt-4 max-w-sm whitespace-pre-line text-center text-sm leading-relaxed">
                {property.contactInfo}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </PropertyThemeProvider>
  )
}

function FieldLabel({ children, optional = false }: { children: string; optional?: boolean }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="guest-label text-sm font-medium">{children}</span>
      {optional ? <span className="guest-hint text-xs">Optional</span> : null}
    </div>
  )
}

function PreviewField({ label, optional = false }: { label: string; optional?: boolean }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input className="guest-field" readOnly tabIndex={-1} />
    </div>
  )
}
