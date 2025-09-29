'use client'

import { useState } from 'react'
import { BookingForm } from '@/components/booking-form'
import { BookingsSidebar } from '@/components/bookings-sidebar'
import { getServices } from '@/lib/supabase/services'
import { Toaster } from '@/components/ui/sonner'
import { Service } from '@/lib/types/database'
import { ParallaxLogo } from '../components/parallax-logo'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useEffect } from 'react'

export default function Home() {
  const [services, setServices] = useState<Service[]>([])
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServices()
        setServices(data)
      } catch (error) {
        console.error('Failed to fetch services:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchServices()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-gentle"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float-reverse-gentle"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-float-slow-gentle"></div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/6 right-1/6 w-48 h-48 bg-indigo-500/8 rounded-full blur-2xl animate-float-drift"></div>
        <div className="absolute bottom-1/4 left-1/6 w-72 h-72 bg-pink-500/8 rounded-full blur-3xl animate-float-drift-reverse"></div>
        
        {/* Lens Flare Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="lens-flare-container">
            <div className="lens-flare-1"></div>
            <div className="lens-flare-2"></div>
            <div className="lens-flare-3"></div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <Button
        onClick={() => setSidebarVisible(!sidebarVisible)}
        variant="ghost"
        size="sm"
        className={`fixed top-4 z-50 bg-slate-800/80 backdrop-blur-sm border border-white/10 text-white hover:bg-slate-700/80 transition-all duration-300 ease-in-out ${
          sidebarVisible ? 'right-4' : 'right-4'
        }`}
      >
        {sidebarVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Main Content */}
      <div className={`relative z-10 min-h-screen flex items-center justify-center py-0 w-full px-4 sm:px-6 lg:px-8 transition-transform duration-300 ease-out ${
        sidebarVisible 
          ? 'transform translate-x-0 sm:translate-x-[16rem] md:translate-x-[18rem] lg:translate-x-[20rem]' 
          : 'transform translate-x-0'
      }`}>
        <div className="mx-auto w-full max-w-4xl">

          {/* Logo Section */}
          <div className="flex justify-center mb-6 sm:mb-8 md:mb-10">
            <ParallaxLogo />
          </div>

          {/* Booking Form Section */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            {loading ? (
              <div className="text-center text-white/70">Loading services...</div>
            ) : (
              <BookingForm services={services} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-300"
          onClick={() => setSidebarVisible(false)}
        />
      )}

      {/* Bookings Sidebar */}
      <BookingsSidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(false)} />

      <Toaster />
    </div>
  )
}
