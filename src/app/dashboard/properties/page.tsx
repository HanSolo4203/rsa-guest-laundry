'use client'

import { useEffect, useState } from 'react'
import { Building2, PanelRight, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PropertyBadge } from '@/components/property-badge'
import { PropertyEditor } from '@/components/dashboard/property-editor'
import { PropertyBookingsSidebar } from '@/components/dashboard/property-bookings-sidebar'
import { PropertyLinkActions } from '@/components/dashboard/property-link-actions'
import { getServices } from '@/lib/supabase/services'
import { listProperties, listPropertyServiceIds } from '@/lib/supabase/properties-admin'
import type { Property, Service } from '@/lib/types/database'

type EditorState =
  | { mode: 'create'; serviceIds: string[] }
  | { mode: 'edit'; property: Property; serviceIds: string[]; revision: number }
  | null

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<EditorState>(null)
  const [guestsOpen, setGuestsOpen] = useState(false)

  async function refresh() {
    const [propertyRows, serviceRows] = await Promise.all([listProperties(), getServices()])
    setProperties(propertyRows)
    setServices(serviceRows)
  }

  useEffect(() => {
    let cancelled = false
    refresh()
      .catch((error) => {
        console.error(error)
        if (!cancelled) toast.error('Could not load properties')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function openEdit(property: Property) {
    try {
      const serviceIds = await listPropertyServiceIds(property.id)
      setEditor({ mode: 'edit', property, serviceIds, revision: Date.now() })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Could not open that property')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <Building2 className="h-8 w-8" />
            Properties
          </h1>
          <p className="mt-2 text-gray-400">Guest booking pages, branding, and the services each property offers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setGuestsOpen(true)}
            aria-expanded={guestsOpen}
            className="border-gray-600 bg-transparent text-gray-100 hover:bg-gray-800"
          >
            <PanelRight className="h-4 w-4" />
            Guest laundry
          </Button>
          <Button
            type="button"
            onClick={() => setEditor({ mode: 'create', serviceIds: services.map((service) => service.id) })}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add property
          </Button>
        </div>
      </div>

      <PropertyBookingsSidebar open={guestsOpen} onOpenChange={setGuestsOpen} />

      {editor ? (
        <PropertyEditor
          key={editor.mode === 'create' ? 'create' : `${editor.property.id}-${editor.revision}`}
          property={editor.mode === 'edit' ? editor.property : null}
          serviceIds={editor.serviceIds}
          services={services}
          onCancel={() => setEditor(null)}
          onSaved={async (saved) => {
            try {
              await refresh()
              const ids = await listPropertyServiceIds(saved.id)
              setEditor({ mode: 'edit', property: saved, serviceIds: ids, revision: Date.now() })
            } catch (error) {
              console.error(error)
              toast.error('Property saved, but the list could not be refreshed')
            }
          }}
        />
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-300">Loading properties…</p>
        ) : properties.length === 0 ? (
          <p className="text-gray-300">No properties yet.</p>
        ) : (
          properties.map((property) => (
            <Card key={property.id} className="border-gray-700 bg-gray-800">
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <PropertyBadge name={property.name} color={property.primary_color} />
                    <span className="text-sm text-gray-400">/{property.slug}</span>
                    <span className={`text-xs font-medium ${property.active ? 'text-green-400' : 'text-gray-400'}`}>
                      {property.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="truncate text-sm text-gray-300">{property.heading}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <PropertyLinkActions slug={property.slug} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(property)}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
