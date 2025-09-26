'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { CollectionNotificationBanner } from '@/components/collection-notification-banner'
import { CustomerDetailsDialog } from '@/components/customer-details-dialog'
import { BookingStatusDialog } from '@/components/booking-status-dialog'
import { getBookings } from '@/lib/supabase/services'
import { BookingWithService } from '@/lib/types/database'


const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  in_progress: AlertCircle,
  completed: CheckCircle,
  cancelled: AlertCircle,
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithService | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todaysCollections = bookings.filter(booking => booking.collection_date === today)
  const pendingBookings = bookings.filter(booking => booking.status === 'pending')
  const inProgressBookings = bookings.filter(booking => booking.status === 'processing')
  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_price || booking.service.price), 0)

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const data = await getBookings()
      setBookings(data)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleViewBooking = (booking: BookingWithService) => {
    setSelectedBooking(booking)
    setViewDialogOpen(true)
  }

  const handleUpdateStatus = (booking: BookingWithService) => {
    setSelectedBooking(booking)
    setStatusDialogOpen(true)
  }

  const handleStatusUpdateSuccess = () => {
    fetchBookings()
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">
          Welcome to your laundry service admin panel
        </p>
      </div>

      {/* Hero Promotional Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-gray-800 via-purple-900/20 to-gray-800 border-gray-700">
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
              {Array.from({ length: 400 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-white/20"
                  style={{
                    gridColumn: `${(i % 20) + 1}`,
                    gridRow: `${Math.floor(i / 20) + 1}`,
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Abstract 3D Graphics */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-30">
            <svg className="w-full h-full" viewBox="0 0 400 300">
              <defs>
                <linearGradient id="vrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* VR Headset */}
              <g transform="translate(250, 80)">
                <ellipse cx="0" cy="0" rx="40" ry="25" fill="url(#vrGradient)" filter="url(#glow)" opacity="0.8"/>
                <rect x="-35" y="-15" width="70" height="30" rx="5" fill="white" opacity="0.3"/>
                <rect x="-30" y="-10" width="60" height="20" rx="3" fill="none" stroke="white" strokeWidth="1" opacity="0.6"/>
                <circle cx="-20" cy="0" r="8" fill="white" opacity="0.4"/>
                <circle cx="20" cy="0" r="8" fill="white" opacity="0.4"/>
              </g>
              
              {/* Controller */}
              <g transform="translate(320, 150)">
                <rect x="-15" y="-30" width="30" height="60" rx="15" fill="url(#vrGradient)" filter="url(#glow)" opacity="0.7"/>
                <circle cx="0" cy="-15" r="4" fill="white" opacity="0.6"/>
                <circle cx="0" cy="0" r="4" fill="white" opacity="0.6"/>
                <circle cx="0" cy="15" r="4" fill="white" opacity="0.6"/>
                <rect x="-3" y="-35" width="6" height="10" rx="3" fill="white" opacity="0.5"/>
              </g>
              
              {/* Abstract Lines */}
              <path
                d="M50,200 Q150,100 250,150 T350,120"
                stroke="url(#vrGradient)"
                strokeWidth="2"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M80,250 Q200,180 320,220"
                stroke="url(#vrGradient)"
                strokeWidth="1.5"
                fill="none"
                opacity="0.4"
              />
            </svg>
          </div>
        </div>
        
        <CardContent className="relative z-10 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              {/* Course Tag */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-sm font-medium mb-4">
                Laundry Service
              </div>
              
              {/* Main Text */}
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                Professional laundry services for your busy lifestyle
              </h2>
              
              {/* CTA Button */}
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                CONTINUE SERVICE
              </Button>
            </div>
            
            {/* Right side spacer for graphics */}
            <div className="flex-1 hidden lg:block"></div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Notification Banner */}
      <CollectionNotificationBanner />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{bookings.length}</div>
            <p className="text-xs text-gray-400">
              All time bookings
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500 bg-orange-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Today&apos;s Collections</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-100">{todaysCollections.length}</div>
            <p className="text-xs text-orange-300">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Orders</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingBookings.length + inProgressBookings.length}</div>
            <p className="text-xs text-gray-400">
              Need processing
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-400">
              From all bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today&apos;s Collections - Prominent Display */}
      {todaysCollections.length > 0 && (
        <Card className="border-orange-500 bg-orange-900/20">
          <CardHeader>
            <CardTitle className="text-orange-100 flex items-center text-lg sm:text-xl">
              <AlertCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Today&apos;s Collections ({todaysCollections.length})
            </CardTitle>
            <CardDescription className="text-orange-300 text-sm sm:text-base">
              These bookings are scheduled for collection today - action required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-orange-500 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-900/30">
                    <TableHead className="text-orange-100 whitespace-nowrap">Customer</TableHead>
                    <TableHead className="text-orange-100 whitespace-nowrap hidden sm:table-cell">Service</TableHead>
                    <TableHead className="text-orange-100 whitespace-nowrap hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-orange-100 whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-orange-100 whitespace-nowrap">Amount</TableHead>
                    <TableHead className="text-orange-100 text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-300">
                        Loading today&apos;s collections...
                      </TableCell>
                    </TableRow>
                  ) : todaysCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-300">
                        No collections scheduled for today
                      </TableCell>
                    </TableRow>
                  ) : (
                    todaysCollections.map((booking) => {
                      const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons]
                      return (
                        <TableRow key={booking.id} className="hover:bg-orange-900/10">
                          <TableCell className="font-medium text-white">
                            <div className="flex flex-col">
                              <span>{booking.first_name} {booking.last_name}</span>
                              <span className="text-xs text-orange-300 sm:hidden">{booking.service.name}</span>
                              <span className="text-xs text-orange-300 md:hidden">{booking.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-gray-300">{booking.service.name}</TableCell>
                          <TableCell className="hidden md:table-cell text-gray-300">{booking.phone}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">{booking.status.replace('_', ' ')}</span>
                              <span className="sm:hidden">{booking.status.charAt(0).toUpperCase()}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {booking.total_price ? (
                              <div>
                                <div className="font-semibold text-green-400">${booking.total_price.toFixed(2)}</div>
                                <div className="text-xs text-gray-400">
                                  (Est: ${booking.service.price.toFixed(2)})
                                </div>
                              </div>
                            ) : (
                              <span>${booking.service.price.toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1 sm:space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs sm:text-sm border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                                onClick={() => handleViewBooking(booking)}
                              >
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                className="text-xs sm:text-sm bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => handleUpdateStatus(booking)}
                              >
                                Update
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Bookings Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl text-white">All Bookings</CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-400">
                Complete list of all bookings in your system
              </CardDescription>
            </div>
            <Link href="/dashboard/bookings">
              <Button variant="outline" className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-700 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-700/50">
                  <TableHead className="whitespace-nowrap text-gray-300">Customer</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell text-gray-300">Service</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell text-gray-300">Collection</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell text-gray-300">Departure</TableHead>
                  <TableHead className="whitespace-nowrap text-gray-300">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-gray-300">Amount</TableHead>
                  <TableHead className="text-right whitespace-nowrap text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-300">
                      Loading bookings...
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-300">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => {
                    const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons]
                    const isToday = booking.collection_date === today
                    return (
                      <TableRow key={booking.id} className={`hover:bg-gray-700/50 ${isToday ? "bg-orange-900/10" : ""}`}>
                        <TableCell className="font-medium text-white">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span>{booking.first_name} {booking.last_name}</span>
                              {isToday && (
                                <Badge variant="outline" className="text-orange-400 border-orange-500 text-xs">
                                  Today
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-400 sm:hidden">{booking.service.name}</span>
                            <span className="text-sm text-gray-400 md:hidden">{new Date(booking.collection_date).toLocaleDateString()}</span>
                            <span className="text-sm text-gray-400 lg:hidden">{new Date(booking.departure_date).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-300">{booking.service.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-gray-300">
                          <div className="flex items-center gap-1">
                            <span>{new Date(booking.collection_date).toLocaleDateString()}</span>
                            {isToday && (
                              <Badge variant="outline" className="text-orange-400 border-orange-500 text-xs">
                                !
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-300">{new Date(booking.departure_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            <span className="hidden sm:inline">{booking.status.replace('_', ' ')}</span>
                            <span className="sm:hidden">{booking.status.charAt(0).toUpperCase()}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {booking.total_price ? (
                            <div>
                              <div className="font-semibold text-green-400">${booking.total_price.toFixed(2)}</div>
                              <div className="text-xs text-gray-400">
                                (Est: ${booking.service.price.toFixed(2)})
                              </div>
                            </div>
                          ) : (
                            <span>${booking.service.price.toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1 sm:space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs sm:text-sm border-gray-600 text-white hover:bg-gray-700 hover:text-white"
                              onClick={() => handleViewBooking(booking)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs sm:text-sm border-gray-600 text-white hover:bg-gray-700 hover:text-white"
                              onClick={() => handleUpdateStatus(booking)}
                            >
                              Update
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        booking={selectedBooking}
      />

      {/* Status Update Dialog */}
      <BookingStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        booking={selectedBooking}
        onSuccess={handleStatusUpdateSuccess}
      />
    </div>
  )
}
