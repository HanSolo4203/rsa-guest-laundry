'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import Image from 'next/image'
import { 
  Calendar, 
  User, 
  Phone, 
  Package,
  Clock,
  CheckCircle,
  CheckCircle2,
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
import { useHomePage } from '@/hooks/useHomePage'

type BookingsSidebarVariant = 'default' | 'modern' | 'minimal'

interface BookingsSidebarProps {
  visible?: boolean
  onToggle?: () => void
  variant?: BookingsSidebarVariant
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-600/20 text-yellow-600 border-yellow-600/30' },
  confirmed: { icon: CheckCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  collected: { icon: Package, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  processing: { icon: Clock, color: 'bg-blue-700/20 text-blue-600 border-blue-700/30' },
  completed: { icon: CheckCircle2, color: 'bg-green-600/20 text-green-600 border-green-600/30' },
  'awaiting_payment': { icon: AlertTriangle, color: 'bg-red-500/20 text-red-500 border-red-500/40' },
  cancelled: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' }
}

export function BookingsSidebar({ visible = false, onToggle, variant = 'default' }: BookingsSidebarProps) {
  const {
    services,
    bookings,
    loadingBookings,
    searchQuery,
    setSearchQuery,
    selectedMonth,
    updatingPayment,
    editingBooking,
    editFormData,
    saving,
    expandedBookings,
    expandedDates,
    fetchBookings,
    handlePaymentMethodUpdate,
    handleEditBooking,
    handleCancelEdit,
    handleSaveEdit,
    handleEditFormChange,
    toggleBookingExpansion,
    toggleDateExpansion,
    goToPreviousMonth,
    goToNextMonth,
    filteredBookings,
    groupedBookings,
    sortedDates,
  } = useHomePage()

  // Debug: Log when component receives updated data
  useEffect(() => {
    console.log('🎨 BookingsSidebar re-rendering!')
    console.log('📊 Total bookings:', bookings.length)
    console.log('📊 Filtered bookings:', filteredBookings.length)
    console.log('📊 Grouped bookings dates:', Object.keys(groupedBookings).length)
    console.log('📋 Bookings statuses:', bookings.map(b => ({ id: b.id.substring(0, 8), status: b.status })))
  }, [bookings, filteredBookings, groupedBookings])

  // Variant-specific styling for sidebar
  const getSidebarVariantStyles = () => {
    switch (variant) {
      case 'modern':
        return {
          sidebarClass: "fixed top-0 left-0 h-full w-1/4 bg-slate-800/95 backdrop-blur-xl border-r border-slate-600/50 z-50 transition-all duration-500 ease-in-out",
          headerClass: "flex items-center justify-between mb-4",
          titleClass: "text-xl font-semibold text-white",
          monthNavClass: "mb-4",
          monthContainerClass: "flex items-center justify-between bg-slate-700/50 rounded-xl p-3 border border-slate-600/50",
          monthButtonClass: "p-2 rounded-lg hover:bg-slate-600/50 transition-colors text-slate-300 hover:text-white",
          monthTitleClass: "text-lg font-semibold text-white",
          monthSubtitleClass: "text-xs text-slate-400",
          searchClass: "mb-4",
          searchInputClass: "w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
          searchIconClass: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400",
          clearButtonClass: "absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors",
          bookingsListClass: "flex-1 overflow-y-auto space-y-3 sidebar-scroll",
          dateHeaderClass: "sticky top-0 bg-slate-800/95 backdrop-blur-sm border-b border-slate-600/50 pb-2",
          dateTitleClass: "text-lg font-semibold text-white/90",
          dateSubtitleClass: "text-xs text-slate-400",
          cardClass: "bg-slate-700/50",
          cardContentClass: "p-1.5",
          buttonClass: "text-slate-300 hover:text-white hover:bg-slate-600/50",
          refreshButtonClass: "text-slate-300 hover:text-white hover:bg-slate-600/50",
          footerClass: "mt-4 pt-4 border-t border-slate-600/50",
          footerTextClass: "text-slate-400 text-xs text-center"
        }
      case 'minimal':
        return {
          sidebarClass: "fixed top-0 left-0 h-full w-1/4 bg-white/95 backdrop-blur-xl border-r border-gray-200 z-50 transition-all duration-500 ease-in-out",
          headerClass: "flex items-center justify-between mb-4",
          titleClass: "text-xl font-semibold text-gray-900",
          monthNavClass: "mb-4",
          monthContainerClass: "flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200",
          monthButtonClass: "p-1 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700",
          monthTitleClass: "text-lg font-semibold text-gray-900",
          monthSubtitleClass: "text-xs text-gray-500",
          searchClass: "mb-4",
          searchInputClass: "w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400",
          searchIconClass: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400",
          clearButtonClass: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors",
          bookingsListClass: "flex-1 overflow-y-auto space-y-3 sidebar-scroll",
          dateHeaderClass: "sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 pb-2",
          dateTitleClass: "text-lg font-semibold text-gray-900",
          dateSubtitleClass: "text-xs text-gray-500",
          cardClass: "bg-gray-50",
          cardContentClass: "p-1.5",
          buttonClass: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          refreshButtonClass: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          footerClass: "mt-4 pt-4 border-t border-gray-200",
          footerTextClass: "text-gray-500 text-xs text-center"
        }
      default:
        return {
          sidebarClass: "fixed top-0 left-0 h-full w-1/4 backdrop-blur-xl border-r border-gray-200 z-50 transition-all duration-500 ease-in-out",
          headerClass: "flex items-center justify-between mb-4",
          titleClass: "text-xl font-semibold",
          monthNavClass: "mb-4",
          monthContainerClass: "flex items-center justify-between rounded-lg p-3 border border-gray-200",
          monthButtonClass: "p-1 rounded hover:bg-gray-100 transition-colors hover:text-gray-700",
          monthTitleClass: "text-lg font-semibold",
          monthSubtitleClass: "text-xs text-gray-500",
          searchClass: "mb-4",
          searchInputClass: "w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
          searchIconClass: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400",
          clearButtonClass: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors",
          bookingsListClass: "flex-1 overflow-y-auto space-y-3 sidebar-scroll",
          dateHeaderClass: "sticky top-0 backdrop-blur-sm border-b border-gray-200 pb-2",
          dateTitleClass: "text-lg font-semibold",
          dateSubtitleClass: "text-xs text-gray-500",
          cardClass: "bg-white border border-gray-200 shadow-sm",
          cardContentClass: "p-1.5",
          buttonClass: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          refreshButtonClass: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          footerClass: "mt-4 pt-4 border-t border-gray-200",
          footerTextClass: "text-gray-500 text-xs text-center"
        }
    }
  }

  const sidebarStyles = getSidebarVariantStyles()

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return AlertCircle
    return config.icon
  }

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return config?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }


  return (
    <>
      {/* Sidebar */}
      <div className={`${sidebarStyles.sidebarClass} ${visible ? 'translate-x-0' : '-translate-x-full'} rounded-r-3xl backdrop-blur-md`} style={{ backgroundColor: 'rgba(248, 246, 243, 0.90)' }}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-4 mt-6">
            {/* Logo - Centered */}
            <div className="flex justify-center mb-4">
              <Image
                src="/rsa.png"
                alt="RSA Logo"
                width={272}
                height={272}
              />
            </div>
            {/* Action Buttons - Centered */}
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={fetchBookings}
                variant="ghost"
                size="sm"
                className={sidebarStyles.refreshButtonClass}
                disabled={loadingBookings}
              >
                {loadingBookings ? 'Loading...' : 'Refresh'}
              </Button>
              {onToggle && (
                <Button
                  onClick={onToggle}
                  variant="ghost"
                  size="sm"
                  className={sidebarStyles.buttonClass}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Month Navigation */}
          <div className={sidebarStyles.monthNavClass}>
            <div className={sidebarStyles.monthContainerClass}>
              <button
                onClick={goToPreviousMonth}
                className={sidebarStyles.monthButtonClass}
                title="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <h3 className={sidebarStyles.monthTitleClass} style={{ color: '#2F2F2F' }}>
                  {format(selectedMonth, 'MMMM yyyy')}
                </h3>
                <p className={sidebarStyles.monthSubtitleClass} style={{ color: '#6B6B6B' }}>
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <button
                onClick={goToNextMonth}
                className={sidebarStyles.monthButtonClass}
                title="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className={sidebarStyles.searchClass}>
            <div className="relative">
              <Search className={sidebarStyles.searchIconClass} />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={sidebarStyles.searchInputClass}
                style={{ 
                  backgroundColor: '#F8F6F3',
                  color: '#2F2F2F',
                  borderColor: '#6B2F2F'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={sidebarStyles.clearButtonClass}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bookings List */}
          <div className={`${sidebarStyles.bookingsListClass}`}>
            {loadingBookings ? (
              <div className="text-center py-8" style={{ color: '#6B6B6B' }}>
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#6B6B6B' }}>
                No bookings yet
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#6B6B6B' }}>
                {searchQuery ? (
                  <div>
                    <p>No bookings found for &quot;{searchQuery}&quot;</p>
                    <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>in {format(selectedMonth, 'MMMM yyyy')}</p>
                  </div>
                ) : (
                  <div>
                    <p>No bookings in {format(selectedMonth, 'MMMM yyyy')}</p>
                    <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>Try selecting a different month</p>
                  </div>
                )}
              </div>
            ) : (
              sortedDates.map((date) => {
                const isDateExpanded = expandedDates.has(date)
                return (
                  <div key={date} className="space-y-2">
                    {/* Date Header */}
                    <div 
                      className="sticky top-0 z-20 backdrop-blur-sm border-b border-gray-200 pb-2 mb-2 shadow-sm cursor-pointer hover:bg-gray-50/50 transition-colors rounded-md p-2"
                      style={{ backgroundColor: 'rgba(248, 246, 243, 1)' }}
                      onClick={() => toggleDateExpansion(date)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold" style={{ color: '#2F2F2F' }}>
                            {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
                          </h3>
                          <p className="text-xs" style={{ color: '#6B6B6B' }}>
                            {groupedBookings[date].length} booking{groupedBookings[date].length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: '#6B6B6B' }}>
                            {isDateExpanded ? 'Hide' : 'Show'}
                          </span>
                          {isDateExpanded ? (
                            <ChevronUp className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                          ) : (
                            <ChevronDown className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bookings for this date */}
                    {isDateExpanded && (
                      <div className="space-y-1.5">
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
                        <Card key={booking.id} className={`${sidebarStyles.cardClass} ${getCardBorderColor()} transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-lg hover:z-10 relative mx-1 rounded-md`} style={{ backgroundColor: isCompletedWithPayment ? 'rgba(34, 197, 94, 0.1)' : booking.status === 'processing' ? 'rgba(59, 130, 246, 0.1)' : booking.status === 'completed' && !booking.payment_method ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 1)', borderColor: '#6B2F2F' }}>
                          <CardContent className={isCompletedWithPayment && !isExpanded ? "p-1" : sidebarStyles.cardContentClass}>
                            {isEditing && editFormData ? (
                              /* Edit Form */
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium" style={{ color: '#2F2F2F' }}>Edit Booking</h4>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleSaveEdit}
                                      disabled={saving}
                                      className="h-8 px-2 text-xs"
                                      style={{
                                        borderColor: '#2B5F44',
                                        color: '#2B5F44',
                                        backgroundColor: 'transparent'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#2B5F44'
                                        e.currentTarget.style.color = 'white'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                        e.currentTarget.style.color = '#2B5F44'
                                      }}
                                    >
                                      <Save className="h-4 w-4 mr-1" />
                                      {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      disabled={saving}
                                      className="h-8 px-2 text-xs"
                                      style={{
                                        borderColor: '#E03131',
                                        color: '#E03131',
                                        backgroundColor: 'transparent'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#E03131'
                                        e.currentTarget.style.color = 'white'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                        e.currentTarget.style.color = '#E03131'
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label htmlFor={`first_name_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>First Name</Label>
                                    <Input
                                      id={`first_name_${booking.id}`}
                                      value={editFormData.first_name}
                                      onChange={(e) => handleEditFormChange('first_name', e.target.value)}
                                      className="h-8 text-sm"
                                      style={{ 
                                        backgroundColor: '#6B2F2F',
                                        color: 'white',
                                        borderColor: '#6B2F2F'
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`last_name_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>Last Name</Label>
                                    <Input
                                      id={`last_name_${booking.id}`}
                                      value={editFormData.last_name}
                                      onChange={(e) => handleEditFormChange('last_name', e.target.value)}
                                      className="h-8 text-sm"
                                      style={{ 
                                        backgroundColor: '#6B2F2F',
                                        color: 'white',
                                        borderColor: '#6B2F2F'
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Phone */}
                                <div>
                                  <Label htmlFor={`phone_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>Phone</Label>
                                  <Input
                                    id={`phone_${booking.id}`}
                                    value={editFormData.phone}
                                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                                    className="h-8 text-sm"
                                    style={{ 
                                      backgroundColor: '#6B2F2F',
                                      color: 'white',
                                      borderColor: '#6B2F2F'
                                    }}
                                  />
                                </div>

                                {/* Service Selection */}
                                <div>
                                  <Label htmlFor={`service_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>Service</Label>
                                  <Select
                                    value={editFormData.service_id}
                                    onValueChange={(value) => handleEditFormChange('service_id', value)}
                                  >
                                    <SelectTrigger className="h-8 text-sm" style={{ 
                                      backgroundColor: '#6B2F2F',
                                      color: 'white',
                                      borderColor: '#6B2F2F'
                                    }}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: '#6B2F2F', borderColor: '#6B2F2F' }}>
                                      {services.map((service) => (
                                        <SelectItem key={service.id} value={service.id} style={{ color: 'white' }}>
                                          {service.name} - R{service.price}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Date Fields */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label htmlFor={`collection_date_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>Collection Date</Label>
                                    <Input
                                      id={`collection_date_${booking.id}`}
                                      type="date"
                                      value={editFormData.collection_date}
                                      onChange={(e) => handleEditFormChange('collection_date', e.target.value)}
                                      className="h-8 text-sm"
                                      style={{ 
                                        backgroundColor: '#6B2F2F',
                                        color: 'white',
                                        borderColor: '#6B2F2F'
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`departure_date_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>Departure Date</Label>
                                    <Input
                                      id={`departure_date_${booking.id}`}
                                      type="date"
                                      value={editFormData.departure_date}
                                      onChange={(e) => handleEditFormChange('departure_date', e.target.value)}
                                      className="h-8 text-sm"
                                      style={{ 
                                        backgroundColor: '#6B2F2F',
                                        color: 'white',
                                        borderColor: '#6B2F2F'
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Additional Details */}
                                <div>
                                  <Label htmlFor={`additional_details_${booking.id}`} className="text-xs" style={{ color: '#6B6B6B' }}>Additional Notes</Label>
                                  <textarea
                                    id={`additional_details_${booking.id}`}
                                    value={editFormData.additional_details}
                                    onChange={(e) => handleEditFormChange('additional_details', e.target.value)}
                                    placeholder="Any additional notes or special instructions..."
                                    className="w-full h-16 px-3 py-2 text-sm rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                    style={{ 
                                      backgroundColor: '#6B2F2F',
                                      color: 'white',
                                      borderColor: '#6B2F2F'
                                    }}
                                  />
                                </div>
                              </div>
                            ) : isCompletedWithPayment && !isExpanded ? (
                              /* Compact View for Completed Bookings */
                              <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                                    <span className="font-semibold text-base" style={{ color: '#2F2F2F' }}>
                                      {booking.first_name} {booking.last_name}
                                    </span>
                                  </div>
                                  <span className="font-medium text-sm" style={{ color: '#2B5F44' }}>
                                    R{booking.total_price || booking.service.price}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {booking.payment_method ? (
                                    <CheckCircle2 className="h-4 w-4" style={{ color: '#2B5F44' }} />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4" style={{ color: '#f97316' }} />
                                  )}
                                  <button
                                    onClick={() => toggleBookingExpansion(booking.id)}
                                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                                    style={{ color: '#6B6B6B' }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Full Display Mode */
                              <div className="space-y-0.5">
                                {/* Customer Info with Edit Button or Expand Button */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                                    <span className="font-semibold text-base" style={{ color: '#2F2F2F' }}>
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
                                        className="h-7 px-2 text-xs"
                                        style={{
                                          borderColor: '#6B2F2F',
                                          color: '#6B2F2F',
                                          backgroundColor: 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = '#6B2F2F'
                                          e.currentTarget.style.color = 'white'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'transparent'
                                          e.currentTarget.style.color = '#6B2F2F'
                                        }}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                    {/* Expand/Collapse Button for Completed Bookings with Payment */}
                                    {isCompletedWithPayment && (
                                      <button
                                        onClick={() => toggleBookingExpansion(booking.id)}
                                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                                        style={{ color: '#6B6B6B' }}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                                  <span className="text-sm" style={{ color: '#2F2F2F' }}>{booking.phone}</span>
                                </div>

                                {/* Service */}
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                                  <span className="text-sm" style={{ color: '#2F2F2F' }}>{booking.service.name}</span>
                                  <span className="font-medium text-sm" style={{ color: '#2B5F44' }}>R{booking.service.price}</span>
                                </div>

                                {/* Dates */}
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                                  <span className="text-sm" style={{ color: '#2F2F2F' }}>
                                    {format(new Date(booking.collection_date), 'MMM dd')} - {format(new Date(booking.departure_date), 'MMM dd')}
                                  </span>
                                </div>

                                {/* Created Time */}
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" style={{ color: '#6B6B6B' }} />
                                  <span className="text-sm" style={{ color: '#2F2F2F' }}>
                                    Created: {format(new Date(booking.created_at), 'MMM dd, h:mm a')}
                                  </span>
                                </div>

                                {/* Completion Time (only for completed bookings) */}
                                {booking.status === 'completed' && booking.completed_at && (
                                  <div className="flex items-center gap-1.5">
                                    {booking.payment_method ? (
                                      <CheckCircle2 className="h-4 w-4" style={{ color: '#2B5F44' }} />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4" style={{ color: '#dc2626' }} />
                                    )}
                                    <span className="text-sm font-medium" style={{ color: booking.payment_method ? '#2B5F44' : '#dc2626' }}>
                                      {booking.payment_method ? 'Completed' : 'Awaiting Payment'}: {format(new Date(booking.completed_at), 'MMM dd, h:mm a')}
                                    </span>
                                  </div>
                                )}

                                {/* Payment Method Selection (only for completed bookings without payment method) */}
                                {booking.status === 'completed' && !booking.payment_method && (
                                  <div className="mt-2 p-2 bg-red-500/10 rounded border-2 border-red-500/60 shadow-sm">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                      <p className="text-red-600 text-sm font-semibold">OUTSTANDING: Select Payment Method</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-sm h-8 border-red-500/60 text-red-600 hover:bg-red-500/20 font-medium"
                                        onClick={() => handlePaymentMethodUpdate(booking.id, 'card')}
                                        disabled={updatingPayment === booking.id}
                                      >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        Card
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-sm h-8 border-red-500/60 text-red-600 hover:bg-red-500/20 font-medium"
                                        onClick={() => handlePaymentMethodUpdate(booking.id, 'cash')}
                                        disabled={updatingPayment === booking.id}
                                      >
                                        <Banknote className="h-4 w-4 mr-1" />
                                        Cash
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Payment Method Display (for completed bookings with payment method) */}
                                {booking.status === 'completed' && booking.payment_method && (
                                  <div className="flex items-center gap-1.5">
                                    {booking.payment_method === 'card' ? (
                                      <CreditCard className="h-4 w-4" style={{ color: '#2B5F44' }} />
                                    ) : (
                                      <Banknote className="h-4 w-4" style={{ color: '#2B5F44' }} />
                                    )}
                                    <span className="text-sm" style={{ color: '#2F2F2F' }}>
                                      Paid via {booking.payment_method.charAt(0).toUpperCase() + booking.payment_method.slice(1)}
                                    </span>
                                  </div>
                                )}

                                {/* Status */}
                                <div className="flex items-center justify-between">
                                  <Badge className={`${booking.status === 'completed' && !booking.payment_method ? getStatusColor('awaiting_payment') : statusColor} border`}>
                                    {booking.status === 'completed' && !booking.payment_method ? (
                                      <>
                                        <AlertTriangle className="h-6 w-6 mr-1" />
                                        Awaiting Payment Method
                                      </>
                                    ) : (
                                      <>
                                        <StatusIcon className="h-6 w-6 mr-1" />
                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                      </>
                                    )}
                                  </Badge>
                                  
                                  {booking.total_price && (
                                    <span className="font-medium text-sm" style={{ color: '#2B5F44' }}>
                                      R{booking.total_price}
                                    </span>
                                  )}
                                </div>

                                {/* Additional Details */}
                                {booking.additional_details && (
                                  <div className="mt-1.5 p-1.5 rounded text-sm" style={{ backgroundColor: '#F8F6F3', color: '#2F2F2F' }}>
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
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className={sidebarStyles.footerClass}>
            <p className={sidebarStyles.footerTextClass}>
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
