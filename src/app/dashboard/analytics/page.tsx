'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package, 
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Clock
} from 'lucide-react'
import { getBookings } from '@/lib/supabase/services'
import { BookingWithService } from '@/lib/types/database'

interface MonthlyStats {
  totalIncome: number
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  cancelledBookings: number
  averageOrderValue: number
  serviceTypeStats: { [key: string]: { count: number; revenue: number } }
  statusBreakdown: { [key: string]: number }
  dailyRevenue: { [key: string]: number }
}

export default function AnalyticsPage() {
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM format
    return currentMonth
  })
  const [dateFilter, setDateFilter] = useState<'created_at' | 'collection_date' | 'departure_date'>('collection_date')
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = new Date().getFullYear()
    return currentYear
  })
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalIncome: 0,
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    averageOrderValue: 0,
    serviceTypeStats: {},
    statusBreakdown: {},
    dailyRevenue: {}
  })
  const [expandedService, setExpandedService] = useState<string | null>(null)

  // Generate year options (current year ± 2 years)
  const generateYearOptions = () => {
    const options = []
    const currentYear = new Date().getFullYear()
    
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i
      options.push({ value: year, label: year.toString() })
    }
    
    return options
  }

  // Generate month options for the selected year
  const generateMonthOptions = () => {
    const options = []
    
    // Generate all 12 months for the selected year
    for (let month = 0; month < 12; month++) {
      const value = `${selectedYear}-${String(month + 1).padStart(2, '0')}`
      const date = new Date(selectedYear, month, 1)
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      
      options.push({ value, label })
    }
    
    return options
  }

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

  const calculateMonthlyStats = (bookings: BookingWithService[], month: string, dateField: 'created_at' | 'collection_date' | 'departure_date') => {
    const [year, monthNum] = month.split('-').map(Number)
    // const startDate = new Date(year, monthNum - 1, 1)
    // const endDate = new Date(year, monthNum, 0, 23, 59, 59)


    const monthlyBookings = bookings.filter(booking => {
      const dateValue = booking[dateField]
      const bookingDate = new Date(dateValue)
      // Ensure we're comparing dates in the same timezone
      const bookingYear = bookingDate.getFullYear()
      const bookingMonth = bookingDate.getMonth() + 1 // getMonth() is 0-indexed
      
      return bookingYear === year && bookingMonth === monthNum
    })



    const totalIncome = monthlyBookings.reduce((sum, booking) => {
      // Use total_price if available, otherwise extract numeric value from price range
      if (booking.total_price) {
        return sum + booking.total_price
      }
      
      // Extract numeric value from price range string (e.g., "R50-R100" -> 75)
      const priceStr = booking.service.price
      const priceMatch = priceStr.match(/R(\d+)-R(\d+)/)
      if (priceMatch) {
        const minPrice = parseInt(priceMatch[1])
        const maxPrice = parseInt(priceMatch[2])
        return sum + (minPrice + maxPrice) / 2 // Use average of range
      }
      
      // Fallback: try to extract single price
      const singlePriceMatch = priceStr.match(/R(\d+)/)
      if (singlePriceMatch) {
        return sum + parseInt(singlePriceMatch[1])
      }
      
      return sum
    }, 0)

    const totalBookings = monthlyBookings.length
    const completedBookings = monthlyBookings.filter(b => b.status === 'completed').length
    const pendingBookings = monthlyBookings.filter(b => ['pending', 'confirmed', 'collected', 'processing'].includes(b.status)).length
    const cancelledBookings = monthlyBookings.filter(b => b.status === 'cancelled').length
    const averageOrderValue = totalBookings > 0 ? totalIncome / totalBookings : 0

    // Service type statistics
    const serviceTypeStats: { [key: string]: { count: number; revenue: number } } = {}
    monthlyBookings.forEach(booking => {
      const serviceName = booking.service.name
      if (!serviceTypeStats[serviceName]) {
        serviceTypeStats[serviceName] = { count: 0, revenue: 0 }
      }
      serviceTypeStats[serviceName].count++
      
      // Use total_price if available, otherwise extract numeric value from price range
      let revenue = 0
      if (booking.total_price) {
        revenue = booking.total_price
      } else {
        // Extract numeric value from price range string (e.g., "R50-R100" -> 75)
        const priceStr = booking.service.price
        const priceMatch = priceStr.match(/R(\d+)-R(\d+)/)
        if (priceMatch) {
          const minPrice = parseInt(priceMatch[1])
          const maxPrice = parseInt(priceMatch[2])
          revenue = (minPrice + maxPrice) / 2 // Use average of range
        } else {
          // Fallback: try to extract single price
          const singlePriceMatch = priceStr.match(/R(\d+)/)
          if (singlePriceMatch) {
            revenue = parseInt(singlePriceMatch[1])
          }
        }
      }
      
      serviceTypeStats[serviceName].revenue += revenue
    })

    // Status breakdown
    const statusBreakdown: { [key: string]: number } = {}
    monthlyBookings.forEach(booking => {
      statusBreakdown[booking.status] = (statusBreakdown[booking.status] || 0) + 1
    })

    // Daily revenue breakdown
    const dailyRevenue: { [key: string]: number } = {}
    monthlyBookings.forEach(booking => {
      const day = new Date(booking.created_at).getDate().toString()
      
      // Use total_price if available, otherwise extract numeric value from price range
      let revenue = 0
      if (booking.total_price) {
        revenue = booking.total_price
      } else {
        // Extract numeric value from price range string (e.g., "R50-R100" -> 75)
        const priceStr = booking.service.price
        const priceMatch = priceStr.match(/R(\d+)-R(\d+)/)
        if (priceMatch) {
          const minPrice = parseInt(priceMatch[1])
          const maxPrice = parseInt(priceMatch[2])
          revenue = (minPrice + maxPrice) / 2 // Use average of range
        } else {
          // Fallback: try to extract single price
          const singlePriceMatch = priceStr.match(/R(\d+)/)
          if (singlePriceMatch) {
            revenue = parseInt(singlePriceMatch[1])
          }
        }
      }
      
      dailyRevenue[day] = (dailyRevenue[day] || 0) + revenue
    })

    return {
      totalIncome,
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      averageOrderValue,
      serviceTypeStats,
      statusBreakdown,
      dailyRevenue
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    if (bookings.length > 0) {
      const stats = calculateMonthlyStats(bookings, selectedMonth, dateFilter)
      setMonthlyStats(stats)
    }
  }, [bookings, selectedMonth, dateFilter])

  // Update selectedMonth when year changes to ensure it's valid for the new year
  useEffect(() => {
    const currentMonth = new Date().getMonth() + 1 // 1-indexed
    const newSelectedMonth = `${selectedYear}-${String(currentMonth).padStart(2, '0')}`
    setSelectedMonth(newSelectedMonth)
  }, [selectedYear])

  const yearOptions = generateYearOptions()
  const monthOptions = generateMonthOptions()
  const selectedMonthLabel = monthOptions.find(option => option.value === selectedMonth)?.label || 'Current Month'

  // Get bookings for a specific service type
  const getBookingsForService = (serviceName: string) => {
    const [year, monthNum] = selectedMonth.split('-').map(Number)
    
    return bookings.filter(booking => {
      const dateValue = booking[dateFilter]
      const bookingDate = new Date(dateValue)
      const bookingYear = bookingDate.getFullYear()
      const bookingMonth = bookingDate.getMonth() + 1
      
      const monthMatch = bookingYear === year && bookingMonth === monthNum
      const serviceMatch = booking.service.name === serviceName
      
      return monthMatch && serviceMatch
    })
  }

  const toggleServiceExpansion = (serviceName: string) => {
    setExpandedService(expandedService === serviceName ? null : serviceName)
  }
  

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics
          </h1>
          <p className="text-gray-400 mt-2">
            Track your business performance and insights
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Year:</span>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24 bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {yearOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value.toString()}
                    className="text-white hover:bg-gray-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Month:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {monthOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-gray-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Date field:</span>
            <Select value={dateFilter} onValueChange={(value: 'created_at' | 'collection_date' | 'departure_date') => setDateFilter(value)}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select date field" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="created_at" className="text-white hover:bg-gray-700">
                  Created Date
                </SelectItem>
                <SelectItem value="collection_date" className="text-white hover:bg-gray-700">
                  Collection Date
                </SelectItem>
                <SelectItem value="departure_date" className="text-white hover:bg-gray-700">
                  Departure Date
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-xs text-gray-500">
            ({monthlyStats.totalBookings} bookings)
          </div>
        </div>
      </div>

      {/* Month Summary */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedMonthLabel} Summary
          </CardTitle>
          <CardDescription className="text-gray-300">
            Overview of your business performance for {selectedMonthLabel}
            <br />
            <span className="text-sm text-gray-400">
              Filtering by: {dateFilter === 'created_at' ? 'Created Date' : 
                           dateFilter === 'collection_date' ? 'Collection Date' : 'Departure Date'}
            </span>
            {monthlyStats.totalBookings === 0 && (
              <span className="block text-yellow-400 mt-1">
                ⚠️ No bookings found for {selectedMonthLabel}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">R{monthlyStats.totalIncome.toFixed(2)}</div>
            <p className="text-xs text-gray-400">
              Revenue for {selectedMonthLabel}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{monthlyStats.totalBookings}</div>
            <p className="text-xs text-gray-400">
              Orders received
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Completed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{monthlyStats.completedBookings}</div>
            <p className="text-xs text-gray-400">
              {monthlyStats.totalBookings > 0 ? 
                `${((monthlyStats.completedBookings / monthlyStats.totalBookings) * 100).toFixed(1)}% completion rate` : 
                'No bookings'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">R{monthlyStats.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-gray-400">
              Per booking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Type Performance */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Service Type Performance
          </CardTitle>
          <CardDescription className="text-gray-400">
            Breakdown of bookings and revenue by service type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(monthlyStats.serviceTypeStats).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(monthlyStats.serviceTypeStats).map(([serviceName, stats]) => {
                const isExpanded = expandedService === serviceName
                const serviceBookings = getBookingsForService(serviceName)
                
                return (
                  <div key={serviceName} className="bg-gray-700/50 rounded-lg overflow-hidden">
                    {/* Service Type Header - Clickable */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-600/50 transition-colors"
                      onClick={() => toggleServiceExpansion(serviceName)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <div>
                          <h4 className="font-medium text-white">{serviceName}</h4>
                          <p className="text-sm text-gray-400">{stats.count} bookings</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-green-400">R{stats.revenue.toFixed(2)}</div>
                          <div className="text-sm text-gray-400">
                            {monthlyStats.totalBookings > 0 ? 
                              `${((stats.count / monthlyStats.totalBookings) * 100).toFixed(1)}%` : 
                              '0%'
                            } of total
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content - Booking Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-600/50 bg-gray-800/30">
                        <div className="p-4">
                          <h5 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Booking Details ({serviceBookings.length} records)
                          </h5>
                          <div className="space-y-3">
                            {serviceBookings.map((booking) => {
                              // Calculate revenue for this booking
                              let bookingRevenue = 0
                              if (booking.total_price) {
                                bookingRevenue = booking.total_price
                              } else {
                                const priceStr = booking.service.price
                                const priceMatch = priceStr.match(/R(\d+)-R(\d+)/)
                                if (priceMatch) {
                                  const minPrice = parseInt(priceMatch[1])
                                  const maxPrice = parseInt(priceMatch[2])
                                  bookingRevenue = (minPrice + maxPrice) / 2
                                } else {
                                  const singlePriceMatch = priceStr.match(/R(\d+)/)
                                  if (singlePriceMatch) {
                                    bookingRevenue = parseInt(singlePriceMatch[1])
                                  }
                                }
                              }

                              return (
                                <div key={booking.id} className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Customer Info */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span className="text-white font-medium">
                                          {booking.first_name} {booking.last_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-300 text-sm">{booking.phone}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-300 text-sm">
                                          {new Date(booking.collection_date).toLocaleDateString()} - {new Date(booking.departure_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Booking Details */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-300 text-sm">
                                          Created: {new Date(booking.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className={`h-4 w-4 ${booking.status === 'completed' ? 'text-green-400' : 'text-gray-400'}`} />
                                        <span className={`text-sm ${booking.status === 'completed' ? 'text-green-400' : 'text-gray-300'}`}>
                                          Status: {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-green-400" />
                                        <span className="text-green-400 font-medium">
                                          R{bookingRevenue.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Additional Details */}
                                  {booking.additional_details && (
                                    <div className="mt-3 pt-3 border-t border-gray-600/30">
                                      <p className="text-gray-300 text-sm">
                                        <span className="text-gray-400">Notes:</span> {booking.additional_details}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No service data available for {selectedMonthLabel}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Booking Status Breakdown
            </CardTitle>
            <CardDescription className="text-gray-400">
              Distribution of booking statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(monthlyStats.statusBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(monthlyStats.statusBreakdown).map(([status, count]) => {
                  const percentage = monthlyStats.totalBookings > 0 ? (count / monthlyStats.totalBookings) * 100 : 0
                  const statusColors = {
                    pending: 'bg-yellow-500',
                    confirmed: 'bg-blue-500',
                    collected: 'bg-indigo-500',
                    processing: 'bg-purple-500',
                    completed: 'bg-green-500',
                    cancelled: 'bg-red-500'
                  }
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}`}></div>
                        <span className="text-sm text-gray-300 capitalize">{status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{count}</span>
                        <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No status data available for {selectedMonthLabel}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Daily Revenue Trend
            </CardTitle>
            <CardDescription className="text-gray-400">
              Revenue distribution throughout the month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(monthlyStats.dailyRevenue).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(monthlyStats.dailyRevenue)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([day, revenue]) => {
                    const maxRevenue = Math.max(...Object.values(monthlyStats.dailyRevenue))
                    const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                    
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 w-8">Day {day}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-white font-medium w-16 text-right">R{revenue.toFixed(0)}</span>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No daily revenue data available for {selectedMonthLabel}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quick Stats Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{monthlyStats.pendingBookings}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{monthlyStats.cancelledBookings}</div>
              <div className="text-sm text-gray-400">Cancelled</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {monthlyStats.totalBookings > 0 ? 
                  `${((monthlyStats.completedBookings / monthlyStats.totalBookings) * 100).toFixed(0)}%` : 
                  '0%'
                }
              </div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {monthlyStats.totalBookings > 0 ? 
                  `${(monthlyStats.totalIncome / monthlyStats.totalBookings).toFixed(0)}` : 
                  '0'
                }
              </div>
              <div className="text-sm text-gray-400">Avg Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
