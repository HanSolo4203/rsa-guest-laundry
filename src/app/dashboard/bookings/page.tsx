'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, Filter, Plus, Settings } from 'lucide-react'
import { getBookings } from '@/lib/supabase/services'
import { BookingWithService } from '@/lib/types/database'
import { BookingStatusDialog } from '@/components/booking-status-dialog'
import { CustomerDetailsDialog } from '@/components/customer-details-dialog'


const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  collected: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithService | null>(null)
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false)
  const [selectedCustomerBooking, setSelectedCustomerBooking] = useState<BookingWithService | null>(null)

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

  const handleStatusUpdate = (booking: BookingWithService) => {
    setSelectedBooking(booking)
    setStatusDialogOpen(true)
  }

  const handleStatusUpdateSuccess = () => {
    fetchBookings()
  }

  const handleViewCustomerDetails = (booking: BookingWithService) => {
    setSelectedCustomerBooking(booking)
    setCustomerDetailsOpen(true)
  }
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Bookings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage all laundry service bookings
          </p>
        </div>
        <Button className="mt-4 sm:mt-0">
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Filters and search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="wash-fold">Wash & Fold</SelectItem>
                <SelectItem value="dry-cleaning">Dry Cleaning</SelectItem>
                <SelectItem value="express">Express Service</SelectItem>
                <SelectItem value="bulk">Bulk Laundry</SelectItem>
                <SelectItem value="ironing">Ironing Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            A list of all bookings in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Customer</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Service</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Collection</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">Departure</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Price</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading bookings...
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{booking.first_name} {booking.last_name}</span>
                          <span className="text-sm text-slate-500 sm:hidden">{booking.service.name}</span>
                          <span className="text-sm text-slate-500 md:hidden">{new Date(booking.collection_date).toLocaleDateString()}</span>
                          <span className="text-sm text-slate-500 lg:hidden">{new Date(booking.departure_date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{booking.service.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{new Date(booking.collection_date).toLocaleDateString()}</TableCell>
                      <TableCell className="hidden lg:table-cell">{new Date(booking.departure_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                          <span className="hidden sm:inline">{booking.status.replace('_', ' ')}</span>
                          <span className="sm:hidden">{booking.status.charAt(0).toUpperCase()}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {booking.total_price ? (
                          <div>
                            <div className="font-semibold text-green-600 text-sm sm:text-base">${booking.total_price.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                              (Est: ${booking.service.price.toFixed(2)})
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm sm:text-base">${booking.service.price.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1 sm:space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewCustomerDetails(booking)}
                            className="text-xs sm:text-sm border-gray-600 text-white hover:bg-gray-700 hover:text-white"
                          >
                            <span className="hidden sm:inline">View</span>
                            <span className="sm:hidden">👁</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusUpdate(booking)}
                            className="text-xs sm:text-sm border-gray-600 text-white hover:bg-gray-700 hover:text-white"
                          >
                            <Settings className="mr-1 h-3 w-3" />
                            <span className="hidden sm:inline">Status</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <BookingStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        booking={selectedBooking}
        onSuccess={handleStatusUpdateSuccess}
      />

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        open={customerDetailsOpen}
        onOpenChange={setCustomerDetailsOpen}
        booking={selectedCustomerBooking}
      />
    </div>
  )
}
