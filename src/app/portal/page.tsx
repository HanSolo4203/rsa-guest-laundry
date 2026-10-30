'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePortalProperty } from '@/components/portal/portal-shell'
import { propertyPortalPath } from '@/lib/property-booking-link'

export default function PortalIndexPage() {
  const { properties, loading } = usePortalProperty()
  const router = useRouter()

  useEffect(() => {
    if (loading || properties.length !== 1) return
    const slug = properties[0]?.slug
    if (slug) router.replace(propertyPortalPath(slug))
  }, [loading, properties, router])

  if (loading || properties.length <= 1) return null

  return (
    <main className="mx-auto w-full max-w-md px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-950">Your properties</h1>
      <p className="mt-1 text-sm text-slate-500">Each property has its own portal.</p>
      <ul className="mt-6 space-y-2">
        {properties.map((property) => (
          <li key={property.id}>
            <Link
              href={propertyPortalPath(property.slug)}
              className="flex min-h-14 items-center rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-950"
            >
              {property.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
