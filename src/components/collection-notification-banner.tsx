'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, AlertCircle, Bell } from 'lucide-react'
import { getBookingsByCollectionDate } from '@/lib/supabase/services'
import { BookingWithService } from '@/lib/types/database'
import Link from 'next/link'

export function CollectionNotificationBanner() {
  const [todaysCollections, setTodaysCollections] = useState<BookingWithService[]>([])
  const [tomorrowsCollections, setTomorrowsCollections] = useState<BookingWithService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
        
        const [todayData, tomorrowData] = await Promise.all([
          getBookingsByCollectionDate(today),
          getBookingsByCollectionDate(tomorrow)
        ])
        
        setTodaysCollections(todayData)
        setTomorrowsCollections(tomorrowData)
      } catch (error) {
        console.error('Error fetching collections:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCollections()
  }, [])

  if (loading) {
    return (
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="text-blue-600 dark:text-blue-400">Loading collection data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasCollections = todaysCollections.length > 0 || tomorrowsCollections.length > 0

  if (!hasCollections) {
    return null
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                Upcoming Collections
              </h3>
            </div>
            
            <div className="flex items-center space-x-3 sm:space-x-6 flex-wrap gap-2">
              {todaysCollections.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700 text-xs sm:text-sm">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Today: {todaysCollections.length}
                  </Badge>
                </div>
              )}
              
              {tomorrowsCollections.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs sm:text-sm">
                    <Clock className="mr-1 h-3 w-3" />
                    Tomorrow: {tomorrowsCollections.length}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30 w-full sm:w-auto text-xs sm:text-sm">
              <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              View All Bookings
            </Button>
          </Link>
        </div>
        
        {(todaysCollections.length > 0 || tomorrowsCollections.length > 0) && (
          <div className="mt-3 text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-1">
            {todaysCollections.length > 0 && (
              <p>
                <strong>{todaysCollections.length}</strong> collection{todaysCollections.length !== 1 ? 's' : ''} scheduled for today
                {todaysCollections.length > 0 && ' - immediate attention required'}
              </p>
            )}
            {tomorrowsCollections.length > 0 && (
              <p>
                <strong>{tomorrowsCollections.length}</strong> collection{tomorrowsCollections.length !== 1 ? 's' : ''} scheduled for tomorrow
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
