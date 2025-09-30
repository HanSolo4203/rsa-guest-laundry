import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { bookingSchema, type BookingFormData } from '@/lib/schemas/booking'
import { 
  getServices, 
  createBooking, 
  getBookings, 
  updateBookingPaymentMethod, 
  updateBooking 
} from '@/lib/supabase/services'
import { Service, BookingWithService } from '@/lib/types/database'
import { calculatePrice } from '@/lib/pricing'
import { getTheme, type HomeTheme } from '@/config/homeThemes'

export type HomeVariant = 'default' | 'modern' | 'minimal'

interface UseHomePageReturn {
  // Services
  services: Service[]
  loadingServices: boolean
  
  // Home page state
  sidebarVisible: boolean
  setSidebarVisible: (visible: boolean) => void
  variant: HomeVariant
  setVariant: (variant: HomeVariant) => void
  theme: HomeTheme
  
  // Booking form state and handlers
  bookingForm: ReturnType<typeof useForm<BookingFormData>>
  isSubmittingBooking: boolean
  weight: number | undefined
  setWeight: (weight: number | undefined) => void
  selectedService: string
  setSelectedService: (service: string) => void
  calculatedPrice: number
  onSubmitBooking: (data: BookingFormData) => Promise<void>
  
  // Bookings sidebar state and handlers
  bookings: BookingWithService[]
  loadingBookings: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedMonth: Date
  setSelectedMonth: (month: Date) => void
  updatingPayment: string | null
  editingBooking: string | null
  editFormData: {
    first_name: string
    last_name: string
    phone: string
    service_id: string
    collection_date: string
    departure_date: string
    additional_details: string
  } | null
  saving: boolean
  expandedBookings: Set<string>
  expandedDates: Set<string>
  
  // Bookings handlers
  fetchBookings: () => Promise<void>
  handlePaymentMethodUpdate: (bookingId: string, paymentMethod: 'card' | 'cash') => Promise<void>
  handleEditBooking: (booking: BookingWithService) => void
  handleCancelEdit: () => void
  handleSaveEdit: () => Promise<void>
  handleEditFormChange: (field: string, value: string) => void
  toggleBookingExpansion: (bookingId: string) => void
  toggleDateExpansion: (date: string) => void
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  
  // Computed values
  filteredBookings: BookingWithService[]
  groupedBookings: Record<string, BookingWithService[]>
  sortedDates: string[]
}

export function useHomePage(): UseHomePageReturn {
  // Services state
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  
  // Home page state
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [variant, setVariant] = useState<HomeVariant>('default')
  
  // Booking form state
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [weight, setWeight] = useState<number | undefined>(undefined)
  const [selectedService, setSelectedService] = useState<string>('')
  
  // Set default dates for form
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  
  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      service_id: '',
      collection_date: format(today, 'yyyy-MM-dd'),
      departure_date: format(tomorrow, 'yyyy-MM-dd'),
      additional_details: '',
    },
  })
  
  // Bookings sidebar state
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
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
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set([format(new Date(), 'yyyy-MM-dd')]))
  
  // Calculate price when weight or service changes
  const calculatedPrice = weight && selectedService ? calculatePrice(selectedService, weight) : 0
  
  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true)
      const data = await getServices()
      setServices(data)
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoadingServices(false)
    }
  }, [])
  
  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true)
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
      setLoadingBookings(false)
    }
  }, [])
  
  // Booking form submission
  const onSubmitBooking = useCallback(async (data: BookingFormData) => {
    setIsSubmittingBooking(true)
    
    try {
      await createBooking(data)
      toast.success('Booking created successfully!')
      bookingForm.reset()
      setWeight(undefined) // Reset weight field
      setSelectedService('') // Reset selected service
      
      // Trigger a custom event to refresh the sidebar
      window.dispatchEvent(new CustomEvent('bookingAdded'))
    } catch (error) {
      toast.error('Failed to create booking. Please try again.')
      console.error('Booking error:', error)
    } finally {
      setIsSubmittingBooking(false)
    }
  }, [bookingForm])
  
  // Payment method update
  const handlePaymentMethodUpdate = useCallback(async (bookingId: string, paymentMethod: 'card' | 'cash') => {
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
  }, [fetchBookings])
  
  // Edit booking handlers
  const handleEditBooking = useCallback((booking: BookingWithService) => {
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
  }, [])
  
  const handleCancelEdit = useCallback(() => {
    setEditingBooking(null)
    setEditFormData(null)
  }, [])
  
  const handleSaveEdit = useCallback(async () => {
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
  }, [editingBooking, editFormData, fetchBookings])
  
  const handleEditFormChange = useCallback((field: string, value: string) => {
    if (!editFormData) return
    setEditFormData(prev => prev ? { ...prev, [field]: value } : null)
  }, [editFormData])
  
  // Toggle booking expansion
  const toggleBookingExpansion = useCallback((bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }, [])

  const toggleDateExpansion = useCallback((date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }, [])
  
  // Month navigation functions
  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])
  
  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])
  
  // Filter bookings based on month and search query - MEMOIZED for performance
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
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
  }, [bookings, selectedMonth, searchQuery])
  
  // Group filtered bookings by collection date - MEMOIZED for performance
  const groupedBookings = useMemo(() => {
    const groups = filteredBookings.reduce((groups, booking) => {
      const collectionDate = format(new Date(booking.collection_date), 'yyyy-MM-dd')
      if (!groups[collectionDate]) {
        groups[collectionDate] = []
      }
      groups[collectionDate].push(booking)
      return groups
    }, {} as Record<string, BookingWithService[]>)
    
    console.log('🔄 Recalculating groupedBookings, total groups:', Object.keys(groups).length)
    return groups
  }, [filteredBookings])
  
  // Sort dates in descending order (latest first) and bookings within each group - MEMOIZED
  const sortedDates = useMemo(() => {
    const dates = Object.keys(groupedBookings).sort((a, b) => b.localeCompare(a))
    
    dates.forEach(date => {
      groupedBookings[date].sort((a, b) => {
        // Define status priority order: completed without payment, completed with payment, processing, pending, cancelled
        const getStatusPriority = (booking: BookingWithService) => {
          if (booking.status === 'completed' && !booking.payment_method) return 1 // Highest priority
          if (booking.status === 'completed' && booking.payment_method) return 2
          if (booking.status === 'processing') return 3
          if (booking.status === 'pending') return 4
          if (booking.status === 'cancelled') return 5 // Lowest priority
          return 6 // Other statuses
        }
        
        const aPriority = getStatusPriority(a)
        const bPriority = getStatusPriority(b)
        
        // If different priorities, sort by priority
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        // If same priority, sort by collection date (latest first)
        return new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime()
      })
    })
    
    console.log('🔄 Recalculating sortedDates, total dates:', dates.length)
    return dates
  }, [groupedBookings])
  
  // Initialize data on mount
  useEffect(() => {
    fetchServices()
    fetchBookings()
    
    // Listen for new booking events
    const handleBookingAdded = () => {
      fetchBookings()
    }
    
    window.addEventListener('bookingAdded', handleBookingAdded)
    
    return () => {
      window.removeEventListener('bookingAdded', handleBookingAdded)
    }
  }, [fetchServices, fetchBookings])


  // Auto-expand current day when month changes
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const currentMonth = format(selectedMonth, 'yyyy-MM')
    const todayMonth = format(new Date(), 'yyyy-MM')
    
    // If we're viewing the current month and today's date exists in the bookings, expand it
    if (currentMonth === todayMonth) {
      setExpandedDates(prev => {
        const newSet = new Set(prev)
        newSet.add(today)
        return newSet
      })
    }
  }, [selectedMonth])
  
  return {
    // Services
    services,
    loadingServices,
    
    // Home page state
    sidebarVisible,
    setSidebarVisible,
    variant,
    setVariant,
    theme: getTheme(variant),
    
    // Booking form state and handlers
    bookingForm,
    isSubmittingBooking,
    weight,
    setWeight,
    selectedService,
    setSelectedService,
    calculatedPrice,
    onSubmitBooking,
    
    // Bookings sidebar state and handlers
    bookings,
    loadingBookings,
    searchQuery,
    setSearchQuery,
    selectedMonth,
    setSelectedMonth,
    updatingPayment,
    editingBooking,
    editFormData,
    saving,
    expandedBookings,
    expandedDates,
    
    // Bookings handlers
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
    
    // Computed values
    filteredBookings,
    groupedBookings,
    sortedDates,
  }
}
