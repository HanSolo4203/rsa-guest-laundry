'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useSearch } from '@/contexts/search-context'

export function DashboardSearch() {
  const { searchQuery, setSearchQuery } = useSearch()

  return (
    <div className="relative w-full max-w-2xl">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        type="text"
        placeholder="Search customers or phone numbers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-10 pl-10 pr-3 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent rounded-md"
      />
    </div>
  )
}
