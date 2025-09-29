'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar, Phone, User, Package, DollarSign, Weight } from 'lucide-react'
import { BookingWithService } from '@/lib/types/database'
import { formatPrice } from '@/lib/pricing'

interface CustomerDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: BookingWithService | null
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  collected: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function CustomerDetailsDialog({ open, onOpenChange, booking }: CustomerDetailsDialogProps) {
  if (!booking) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 sm:mx-auto sm:max-w-[600px] md:max-w-[700px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl border border-purple-500/30 shadow-2xl text-white">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            Customer Details
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-base">
            Complete booking information and customer details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
            <h3 className="font-bold text-lg flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">First Name</label>
                <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{booking.first_name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Last Name</label>
                <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{booking.last_name}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-400" />
                Phone Number
              </label>
              <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{booking.phone}</p>
            </div>
          </div>

          {/* Service Information */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
            <h3 className="font-bold text-lg flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              Service Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Service Type</label>
                <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{booking.service.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Status</label>
                <div className="mt-1">
                  <Badge className={`${statusColors[booking.status as keyof typeof statusColors]} font-bold px-3 py-1 text-sm`}>
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  Price Range
                </label>
                <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{booking.service.price}</p>
              </div>
              {booking.weight_kg ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Weight className="h-4 w-4 text-orange-400" />
                    Weight
                  </label>
                  <p className="text-base font-bold text-orange-300 bg-gray-600 px-3 py-2 rounded-lg">{booking.weight_kg} kg</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Weight className="h-4 w-4 text-orange-400" />
                    Weight
                  </label>
                  <p className="text-sm text-gray-400 bg-gray-600 px-3 py-2 rounded-lg">Not weighed</p>
                </div>
              )}
            </div>
            {booking.total_price && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  Final Price
                </label>
                <p className="text-xl font-bold text-green-400 bg-green-900/30 px-4 py-3 rounded-lg border border-green-500/30">{formatPrice(booking.total_price)}</p>
              </div>
            )}
          </div>

          {/* Schedule Information */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
            <h3 className="font-bold text-lg flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              Schedule Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Collection Date</label>
                <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{formatDate(booking.collection_date)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Departure Date</label>
                <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">{formatDate(booking.departure_date)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Booking Created</label>
              <p className="text-base font-bold text-white bg-gray-600 px-3 py-2 rounded-lg">
                {formatDate(booking.created_at)} at {formatTime(booking.created_at)}
              </p>
            </div>
          </div>

          {/* Additional Details */}
          {booking.additional_details && (
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 space-y-4 border border-gray-600 shadow-lg">
              <h3 className="font-bold text-lg text-white">Additional Details</h3>
              <div className="bg-gray-600 rounded-lg p-4">
                <p className="text-base text-gray-200 leading-relaxed">{booking.additional_details}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
