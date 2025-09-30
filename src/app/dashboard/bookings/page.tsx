'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, Plus, Settings, CreditCard, Banknote, Calendar } from 'lucide-react'
import { getBookings } from '@/lib/supabase/services'
import { BookingWithService } from '@/lib/types/database'
import { BookingStatusDialog } from '@/components/booking-status-dialog'
import { CustomerDetailsDialog } from '@/components/customer-details-dialog'
import { formatPrice } from '@/lib/pricing'
import { useSearch } from '@/contexts/search-context'


const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  collected: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const renderPaymentMethod = (paymentMethod: string | null | undefined) => {
  if (!paymentMethod) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-red-500 text-xs">Not Paid</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-1">
      {paymentMethod === 'card' ? (
        <CreditCard className="h-3 w-3 text-blue-500" />
      ) : (
        <Banknote className="h-3 w-3 text-green-500" />
      )}
      <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">{paymentMethod}</span>
    </div>
  )
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithService | null>(null)
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false)
  const [selectedCustomerBooking, setSelectedCustomerBooking] = useState<BookingWithService | null>(null)
  const { searchQuery } = useSearch()

  // Filter bookings by search query (customer name or phone)
  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery.trim()) return true
    
    const fullName = `${booking.first_name} ${booking.last_name}`.toLowerCase()
    const phone = booking.phone.toLowerCase()
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || phone.includes(query)
  })

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
    <div className="space-y-8 w-full">
      {/* Page header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white flex items-center">
                Bookings
                {searchQuery && (
                  <Badge variant="outline" className="ml-3 text-purple-300 border-purple-400 bg-purple-900/30">
                    Filtered
                  </Badge>
                )}
              </h1>
            </div>
            <p className="text-gray-300 text-lg font-medium">
              {searchQuery ? `Showing ${filteredBookings.length} of ${bookings.length} bookings` : 'Manage all laundry service bookings'}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
              <div className="w-px h-4 bg-gray-600"></div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Real-time Sync</span>
              </div>
            </div>
          </div>
          <Button className="mt-6 sm:mt-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-gray-800 via-purple-900/20 to-gray-800 border-gray-700 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-400" />
            Filters
          </CardTitle>
          <CardDescription className="text-gray-300">
            Filter bookings by status and service type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Status Filter</label>
              <Select>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 focus:ring-2 focus:ring-purple-500">
                  <Filter className="mr-2 h-4 w-4 text-purple-400" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all" className="hover:bg-gray-700">All Status</SelectItem>
                  <SelectItem value="pending" className="hover:bg-gray-700">Pending</SelectItem>
                  <SelectItem value="confirmed" className="hover:bg-gray-700">Confirmed</SelectItem>
                  <SelectItem value="collected" className="hover:bg-gray-700">Collected</SelectItem>
                  <SelectItem value="processing" className="hover:bg-gray-700">Processing</SelectItem>
                  <SelectItem value="completed" className="hover:bg-gray-700">Completed</SelectItem>
                  <SelectItem value="cancelled" className="hover:bg-gray-700">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Service Filter</label>
              <Select>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all" className="hover:bg-gray-700">All Services</SelectItem>
                  <SelectItem value="wash-fold" className="hover:bg-gray-700">Wash & Fold</SelectItem>
                  <SelectItem value="dry-cleaning" className="hover:bg-gray-700">Dry Cleaning</SelectItem>
                  <SelectItem value="express" className="hover:bg-gray-700">Express Service</SelectItem>
                  <SelectItem value="bulk" className="hover:bg-gray-700">Bulk Laundry</SelectItem>
                  <SelectItem value="ironing" className="hover:bg-gray-700">Ironing Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card className="bg-gray-800 border-gray-700 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-400" />
            All Bookings
          </CardTitle>
          <CardDescription className="text-gray-300 text-base">
            A comprehensive list of all bookings in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-gray-700 overflow-x-auto bg-gray-900/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-700/50 border-gray-600">
                  <TableHead className="whitespace-nowrap text-gray-200 font-semibold">Customer</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell text-gray-200 font-semibold">Service</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell text-gray-200 font-semibold">Collection</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell text-gray-200 font-semibold">Departure</TableHead>
                  <TableHead className="whitespace-nowrap text-gray-200 font-semibold">Status</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell text-gray-200 font-semibold">Weight</TableHead>
                  <TableHead className="whitespace-nowrap text-gray-200 font-semibold">Price</TableHead>
                  <TableHead className="whitespace-nowrap hidden xl:table-cell text-gray-200 font-semibold">Payment</TableHead>
                  <TableHead className="text-right whitespace-nowrap text-gray-200 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-gray-800/50">
                    <TableCell colSpan={9} className="text-center py-12 text-gray-300">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-lg">Loading bookings...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBookings.length === 0 ? (
                  <TableRow className="hover:bg-gray-800/50">
                    <TableCell colSpan={9} className="text-center py-12 text-gray-300">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <span className="text-lg">
                          {searchQuery ? 'No bookings found matching your search' : 'No bookings found'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking, index) => (
                    <TableRow key={booking.id} className={`hover:bg-gray-700/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/10'}`}>
                      <TableCell className="font-medium text-white">
                        <div className="flex flex-col">
                          <span className="text-base font-semibold">{booking.first_name} {booking.last_name}</span>
                          <span className="text-sm text-gray-400 sm:hidden">{booking.service.name}</span>
                          <span className="text-sm text-gray-400 md:hidden">{new Date(booking.collection_date).toLocaleDateString()}</span>
                          <span className="text-sm text-gray-400 lg:hidden">{new Date(booking.departure_date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-gray-300">{booking.service.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-gray-300">{new Date(booking.collection_date).toLocaleDateString()}</TableCell>
                      <TableCell className="hidden lg:table-cell text-gray-300">{new Date(booking.departure_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[booking.status as keyof typeof statusColors]} font-medium px-3 py-1`}>
                          <span className="hidden sm:inline">{booking.status.replace('_', ' ')}</span>
                          <span className="sm:hidden">{booking.status.charAt(0).toUpperCase()}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-gray-300">
                        {booking.weight_kg ? (
                          <span className="text-sm font-semibold text-orange-300">{booking.weight_kg} kg</span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {booking.status === 'pending' ? (
                          <span className="text-sm text-gray-500">R0.00</span>
                        ) : (booking.status === 'processing' || booking.status === 'completed') && booking.total_price ? (
                          <div>
                            <div className="font-bold text-green-400 text-base">{formatPrice(booking.total_price)}</div>
                            <div className="text-xs text-gray-400">
                              (Range: {booking.service.price})
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">R0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {renderPaymentMethod(booking.payment_method)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewCustomerDetails(booking)}
                            className="text-xs sm:text-sm border-gray-600 text-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200"
                          >
                            <span className="hidden sm:inline">View</span>
                            <span className="sm:hidden">👁</span>
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleStatusUpdate(booking)}
                            className="text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
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
