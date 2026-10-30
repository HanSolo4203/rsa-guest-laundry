'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listProperties } from '@/lib/supabase/properties-admin'
import type { Property } from '@/lib/types/database'

export function usePropertyOptions() {
  const [properties, setProperties] = useState<Pick<Property, 'id' | 'name'>[]>([])

  useEffect(() => {
    let cancelled = false
    listProperties()
      .then((rows) => {
        if (!cancelled) setProperties(rows.map((property) => ({ id: property.id, name: property.name })))
      })
      .catch((error) => {
        console.error(error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return properties
}

export function PropertyFilter({
  properties,
  value,
  onValueChange,
}: {
  properties: Pick<Property, 'id' | 'name'>[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <div className="w-full sm:w-64">
      <label htmlFor="property-filter" className="mb-2 block text-sm font-medium text-gray-300">
        Property
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id="property-filter"
          className="w-full border-gray-600 bg-gray-700 text-white hover:bg-gray-600 focus:ring-2 focus:ring-purple-500"
        >
          <SelectValue placeholder="All properties" />
        </SelectTrigger>
        <SelectContent className="border-gray-700 bg-gray-800 text-white">
          <SelectItem value="all">All properties</SelectItem>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
