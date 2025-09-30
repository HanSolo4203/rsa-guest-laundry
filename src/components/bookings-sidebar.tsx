'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBookings, updateBookingPaymentMethod, updateBooking, getServices } from '@/lib/supabase/services'
import { BookingWithService, Service } from '@/lib/types/database'
import { format } from 'date-fns'
import { 
  Calendar, 
  User, 
  Phone, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  Edit,
  Save,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface BookingsSidebarProps {
  visible?: boolean
  onToggle?: () => void
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  confirmed: { icon: CheckCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  collected: { icon: Package, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  processing: { icon: Clock, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  completed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' }
}

export function BookingsSidebar({ visible = false, onToggle }: BookingsSidebarProps) {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null)
  const [editingBooking, setEditingBooking] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    first_name: string
    last_name: string
    phone: string
    service_id: string
    collection_date: string
    departure_date: string
    additional_details: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const data = await getBookings()
      // Sort bookings with fully completed (with payment method) at the top, then by collection date
      const sortedData = data.sort((a, b) => {
        // Check if booking is fully completed (completed status + payment method)
        const aIsFullyCompleted = a.status === 'completed' && a.payment_method
        const bIsFullyCompleted = b.status === 'completed' && b.payment_method
        
        // If one is fully completed and the other isn't, prioritize the fully completed one
        if (aIsFullyCompleted && !bIsFullyCompleted) return -1
        if (!aIsFullyCompleted && bIsFullyCompleted) return 1
        
        // If both have the same completion status, sort by collection date (latest first)
        return new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime()
      })
      setBookings(sortedData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const data = await getServices()
      setServices(data)
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const handlePaymentMethodUpdate = async (bookingId: string, paymentMethod: 'card' | 'cash') => {
    try {
      setUpdatingPayment(bookingId)
      await updateBookingPaymentMethod(bookingId, paymentMethod)
      // Refresh bookings to show updated payment method
      await fetchBookings()
    } catch (error) {
      console.error('Error updating payment method:', error)
    } finally {
      setUpdatingPayment(null)
    }
  }

  const handleEditBooking = (booking: BookingWithService) => {
    setEditingBooking(booking.id)
    setEditFormData({
      first_name: booking.first_name,
      last_name: booking.last_name,
      phone: booking.phone,
      service_id: booking.service_id,
      collection_date: booking.collection_date,
      departure_date: booking.departure_date,
      additional_details: booking.additional_details || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingBooking(null)
    setEditFormData(null)
  }

  const handleSaveEdit = async () => {
    if (!editingBooking || !editFormData) return

    try {
      setSaving(true)
      await updateBooking(editingBooking, editFormData)
      await fetchBookings()
      setEditingBooking(null)
      setEditFormData(null)
    } catch (error) {
      console.error('Error updating booking:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditFormChange = (field: string, value: string) => {
    if (!editFormData) return
    setEditFormData(prev => prev ? { ...prev, [field]: value } : null)
  }

  const toggleBookingExpansion = (bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  useEffect(() => {
    fetchBookings()
    fetchServices()
    
    // Listen for new booking events
    const handleBookingAdded = () => {
      fetchBookings()
    }
    
    window.addEventListener('bookingAdded', handleBookingAdded)
    
    return () => {
      window.removeEventListener('bookingAdded', handleBookingAdded)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return AlertCircle
    return config.icon
  }

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  // Month navigation functions
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Filter bookings based on month and search query
  const filteredBookings = bookings.filter(booking => {
    // Filter by month
    const bookingDate = new Date(booking.collection_date)
    const bookingMonth = bookingDate.getMonth()
    const bookingYear = bookingDate.getFullYear()
    const selectedMonthNum = selectedMonth.getMonth()
    const selectedYear = selectedMonth.getFullYear()
    
    const monthMatch = bookingMonth === selectedMonthNum && bookingYear === selectedYear
    
    // Filter by search query
    const searchMatch = !searchQuery.trim() || 
      `${booking.first_name} ${booking.last_name}`.toLowerCase().includes(searchQuery.toLowerCase().trim())
    
    return monthMatch && searchMatch
  })

  // Group filtered bookings by collection date
  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const collectionDate = format(new Date(booking.collection_date), 'yyyy-MM-dd')
    if (!groups[collectionDate]) {
      groups[collectionDate] = []
    }
    groups[collectionDate].push(booking)
    return groups
  }, {} as Record<string, BookingWithService[]>)

  // Sort dates in descending order (latest first) and bookings within each group
  const sortedDates = Object.keys(groupedBookings).sort((a, b) => b.localeCompare(a))
  sortedDates.forEach(date => {
    groupedBookings[date].sort((a, b) => {
      // Check if booking is fully completed (completed status + payment method)
      const aIsFullyCompleted = a.status === 'completed' && a.payment_method
      const bIsFullyCompleted = b.status === 'completed' && b.payment_method
      
      // If one is fully completed and the other isn't, prioritize the fully completed one
      if (aIsFullyCompleted && !bIsFullyCompleted) return -1
      if (!aIsFullyCompleted && bIsFullyCompleted) return 1
      
      // If both have the same completion status, sort by collection date (latest first)
      return new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime()
    })
  })

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-1/3 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-50 transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Bookings</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchBookings}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              {onToggle && (
                <Button
                  onClick={onToggle}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Month Navigation */}
          <div className="mb-4">
            <div className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 border border-white/10">
              <button
                onClick={goToPreviousMonth}
                className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                title="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">
                  {format(selectedMonth, 'MMMM yyyy')}
                </h3>
                <p className="text-xs text-white/60">
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <button
                onClick={goToNextMonth}
                className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                title="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bookings List */}
          <div className="flex-1 overflow-y-auto space-y-4 sidebar-scroll">
            {loading ? (
              <div className="text-center text-white/70 py-8">
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center text-white/70 py-8">
                No bookings yet
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center text-white/70 py-8">
                {searchQuery ? (
                  <div>
                    <p>No bookings found for &quot;{searchQuery}&quot;</p>
                    <p className="text-sm text-white/50 mt-1">in {format(selectedMonth, 'MMMM yyyy')}</p>
                  </div>
                ) : (
                  <div>
                    <p>No bookings in {format(selectedMonth, 'MMMM yyyy')}</p>
                    <p className="text-sm text-white/50 mt-1">Try selecting a different month</p>
                  </div>
                )}
              </div>
            ) : (
              sortedDates.map((date) => (
                <div key={date} className="space-y-3">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 pb-2">
                    <h3 className="text-lg font-semibold text-white/90">
                      {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
                    </h3>
                    <p className="text-xs text-white/60">
                      {groupedBookings[date].length} booking{groupedBookings[date].length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Bookings for this date */}
                  <div className="space-y-3">
                    {groupedBookings[date].map((booking) => {
                      const StatusIcon = getStatusIcon(booking.status)
                      const statusColor = getStatusColor(booking.status)
                      const isEditing = editingBooking === booking.id
                      
                      // Determine card border color and glow based on status and payment method
                      const getCardBorderColor = () => {
                        if (booking.status === 'completed' && booking.payment_method) {
                          return 'border-green-500/50 shadow-[inset_0_0_8px_rgba(34,197,94,0.6)]' // Green for completed with payment
                        } else if (booking.status === 'completed' && !booking.payment_method) {
                          return 'border-orange-500/50 shadow-[inset_0_0_8px_rgba(249,115,22,0.6)]' // Orange for completed without payment
                        }
                        return 'border-white/10' // Default border
                      }

                      const isCompletedWithPayment = booking.status === 'completed' && booking.payment_method
                      const isExpanded = expandedBookings.has(booking.id)

                      return (
                        <Card key={booking.id} className={`bg-slate-800/50 ${getCardBorderColor()} transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:z-10 relative`}>
                          <CardContent className="p-2">
                            {isEditing && editFormData ? (
                              /* Edit Form */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-white font-medium">Edit Booking</h4>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleSaveEdit}
                                      disabled={saving}
                                      className="h-8 px-2 text-xs border-green-500/50 text-green-400 hover:bg-green-500/20"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      disabled={saving}
                                      className="h-8 px-2 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label htmlFor={`first_name_${booking.id}`} className="text-white/70 text-xs">First Name</Label>
                                    <Input
                                      id={`first_name_${booking.id}`}
                                      value={editFormData.first_name}
                                      onChange={(e) => handleEditFormChange('first_name', e.target.value)}
                                      className="h-8 text-sm bg-slate-700/50 border-white/20 text-white"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`last_name_${booking.id}`} className="text-white/70 text-xs">Last Name</Label>
                                    <Input
                                      id={`last_name_${booking.id}`}
                                      value={editFormData.last_name}
                                      onChange={(e) => handleEditFormChange('last_name', e.target.value)}
                                      className="h-8 text-sm bg-slate-700/50 border-white/20 text-white"
                                    />
                                  </div>
                                </div>

                                {/* Phone */}
                                <div>
                                  <Label htmlFor={`phone_${booking.id}`} className="text-white/70 text-xs">Phone</Label>
                                  <Input
                                    id={`phone_${booking.id}`}
                                    value={editFormData.phone}
                                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                                    className="h-8 text-sm bg-slate-700/50 border-white/20 text-white"
                                  />
                                </div>

                                {/* Service Selection */}
                                <div>
                                  <Label htmlFor={`service_${booking.id}`} className="text-white/70 text-xs">Service</Label>
                                  <Select
                                    value={editFormData.service_id}
                                    onValueChange={(value) => handleEditFormChange('service_id', value)}
                                  >
                                    <SelectTrigger className="h-8 text-sm bg-slate-700/50 border-white/20 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-white/20">
                                      {services.map((service) => (
                                        <SelectItem key={service.id} value={service.id} className="text-white">
                                          {service.name} - R{service.price}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Date Fields */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label htmlFor={`collection_date_${booking.id}`} className="text-white/70 text-xs">Collection Date</Label>
                                    <Input
                                      id={`collection_date_${booking.id}`}
                                      type="date"
                                      value={editFormData.collection_date}
                                      onChange={(e) => handleEditFormChange('collection_date', e.target.value)}
                                      className="h-8 text-sm bg-slate-700/50 border-white/20 text-white"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`departure_date_${booking.id}`} className="text-white/70 text-xs">Departure Date</Label>
                                    <Input
                                      id={`departure_date_${booking.id}`}
                                      type="date"
                                      value={editFormData.departure_date}
                                      onChange={(e) => handleEditFormChange('departure_date', e.target.value)}
                                      className="h-8 text-sm bg-slate-700/50 border-white/20 text-white"
                                    />
                                  </div>
                                </div>

                                {/* Additional Details */}
                                <div>
                                  <Label htmlFor={`additional_details_${booking.id}`} className="text-white/70 text-xs">Additional Notes</Label>
                                  <textarea
                                    id={`additional_details_${booking.id}`}
                                    value={editFormData.additional_details}
                                    onChange={(e) => handleEditFormChange('additional_details', e.target.value)}
                                    placeholder="Any additional notes or special instructions..."
                                    className="w-full h-16 px-3 py-2 text-sm bg-slate-700/50 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                                  />
                                </div>
                              </div>
                            ) : isCompletedWithPayment && !isExpanded ? (
                              /* Compact View for Completed Bookings with Payment */
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-white/70" />
                                    <span className="text-white font-medium">
                                      {booking.first_name} {booking.last_name}
                                    </span>
                                  </div>
                                  <span className="text-green-400 font-medium">
                                    R{booking.total_price || booking.service.price}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                  <button
                                    onClick={() => toggleBookingExpansion(booking.id)}
                                    className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Full Display Mode */
                              <div className="space-y-2">
                                {/* Customer Info with Edit Button or Expand Button */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-white/70" />
                                    <span className="text-white font-medium">
                                      {booking.first_name} {booking.last_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Edit Button for Pending Bookings */}
                                    {booking.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditBooking(booking)}
                                        className="h-7 px-2 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                    {/* Expand/Collapse Button for Completed Bookings with Payment */}
                                    {isCompletedWithPayment && (
                                      <button
                                        onClick={() => toggleBookingExpansion(booking.id)}
                                        className="p-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-white/70" />
                                  <span className="text-white/80 text-sm">{booking.phone}</span>
                                </div>

                                {/* Service */}
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-white/70" />
                                  <span className="text-white/80 text-sm">{booking.service.name}</span>
                                  <span className="text-green-400 font-medium">R{booking.service.price}</span>
                                </div>

                                {/* Dates */}
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-white/70" />
                                  <span className="text-white/80 text-sm">
                                    {format(new Date(booking.collection_date), 'MMM dd')} - {format(new Date(booking.departure_date), 'MMM dd')}
                                  </span>
                                </div>

                                {/* Created Time */}
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-white/70" />
                                  <span className="text-white/80 text-sm">
                                    Created: {format(new Date(booking.created_at), 'MMM dd, h:mm a')}
                                  </span>
                                </div>

                                {/* Completion Time (only for completed bookings) */}
                                {booking.status === 'completed' && booking.completed_at && (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    <span className="text-green-400 text-sm font-medium">
                                      Completed: {format(new Date(booking.completed_at), 'MMM dd, h:mm a')}
                                    </span>
                                  </div>
                                )}

                                {/* Payment Method Selection (only for completed bookings without payment method) */}
                                {booking.status === 'completed' && !booking.payment_method && (
                                  <div className="mt-3 p-2 bg-orange-500/10 rounded border border-orange-500/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                                      <p className="text-orange-400 text-xs font-medium">Select Payment Method:</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-xs h-8 border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                                        onClick={() => handlePaymentMethodUpdate(booking.id, 'card')}
                                        disabled={updatingPayment === booking.id}
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Card
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-xs h-8 border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                                        onClick={() => handlePaymentMethodUpdate(booking.id, 'cash')}
                                        disabled={updatingPayment === booking.id}
                                      >
                                        <Banknote className="h-3 w-3 mr-1" />
                                        Cash
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Payment Method Display (for completed bookings with payment method) */}
                                {booking.status === 'completed' && booking.payment_method && (
                                  <div className="flex items-center gap-2">
                                    {booking.payment_method === 'card' ? (
                                      <CreditCard className="h-4 w-4 text-blue-400" />
                                    ) : (
                                      <Banknote className="h-4 w-4 text-green-400" />
                                    )}
                                    <span className="text-white/80 text-sm">
                                      Paid via {booking.payment_method.charAt(0).toUpperCase() + booking.payment_method.slice(1)}
                                    </span>
                                  </div>
                                )}

                                {/* Status */}
                                <div className="flex items-center justify-between">
                                  <Badge className={`${statusColor} border`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </Badge>
                                  
                                  {booking.total_price && (
                                    <span className="text-green-400 font-medium text-sm">
                                      R{booking.total_price}
                                    </span>
                                  )}
                                </div>

                                {/* Additional Details */}
                                {booking.additional_details && (
                                  <div className="mt-2 p-2 bg-slate-700/30 rounded text-white/80 text-xs">
                                    {booking.additional_details}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/60 text-xs text-center">
              {searchQuery 
                ? `${filteredBookings.length} of ${bookings.filter(booking => {
                    const bookingDate = new Date(booking.collection_date)
                    return bookingDate.getMonth() === selectedMonth.getMonth() && 
                           bookingDate.getFullYear() === selectedMonth.getFullYear()
                  }).length} bookings in ${format(selectedMonth, 'MMMM yyyy')}`
                : `${filteredBookings.length} bookings in ${format(selectedMonth, 'MMMM yyyy')}`
              }
            </p>
          </div>
        </div>
      </div>

    </>
  )
}
