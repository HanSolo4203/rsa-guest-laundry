'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar, Phone, User, Package, DollarSign } from 'lucide-react'
import { BookingWithService } from '@/lib/types/database'

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
      <DialogContent className="sm:max-w-[320px] mx-4 max-h-[50vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Details
          </DialogTitle>
          <DialogDescription className="text-sm">
            Booking information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Customer Information */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">First</label>
                <p className="text-sm font-medium">{booking.first_name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last</label>
                <p className="text-sm font-medium">{booking.last_name}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Phone
              </label>
              <p className="text-sm font-medium">{booking.phone}</p>
            </div>
          </div>

          {/* Service Information */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Service
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <p className="text-sm font-medium">{booking.service.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Est. Price
                </label>
                <p className="text-sm font-medium">${booking.service.price.toFixed(2)}</p>
              </div>
              {booking.total_price ? (
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Final
                  </label>
                  <p className="text-sm font-semibold text-green-600">${booking.total_price.toFixed(2)}</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Final</label>
                  <p className="text-xs text-muted-foreground">Not set</p>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Information */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Collection</label>
                <p className="text-sm font-medium">{formatDate(booking.collection_date)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Departure</label>
                <p className="text-sm font-medium">{formatDate(booking.departure_date)}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Created</label>
              <p className="text-sm font-medium">
                {formatDate(booking.created_at)} {formatTime(booking.created_at)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
