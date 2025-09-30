'use client'

import '@/styles/home-demo.css'
import { BookingForm } from '@/components/home/booking-form'
import { BookingsSidebar } from '@/components/home/bookings-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useHomePage, type HomeVariant } from '@/hooks/useHomePage'
import { DevTools } from '@/components/DevTools'
import { tradeHotelBrand } from '@/config/clientBrand'

export default function ClientPreviewPage() {
  const {
    services,
    loadingServices,
    sidebarVisible,
    setSidebarVisible,
    variant,
    setVariant,
  } = useHomePage()

  return (
    <div className="home-demo-variant min-h-screen relative overflow-hidden">
      {/* Trade Hotel Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-float-gentle" style={{background: 'radial-gradient(circle, rgba(43, 95, 68, 0.06) 0%, rgba(43, 95, 68, 0.02) 70%, transparent 100%)'}}></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl animate-float-reverse-gentle" style={{background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.02) 70%, transparent 100%)'}}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full blur-3xl animate-float-slow-gentle" style={{background: 'radial-gradient(circle, rgba(232, 93, 117, 0.04) 0%, rgba(232, 93, 117, 0.01) 70%, transparent 100%)'}}></div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/6 right-1/6 w-48 h-48 rounded-full blur-2xl animate-float-drift" style={{background: 'radial-gradient(circle, rgba(74, 144, 164, 0.03) 0%, rgba(74, 144, 164, 0.01) 70%, transparent 100%)'}}></div>
        <div className="absolute bottom-1/4 left-1/6 w-72 h-72 rounded-full blur-3xl animate-float-drift-reverse" style={{background: 'radial-gradient(circle, rgba(132, 169, 140, 0.03) 0%, rgba(132, 169, 140, 0.01) 70%, transparent 100%)'}}></div>
        
        {/* Lens Flare Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="lens-flare-container">
            <div className="lens-flare-1" style={{background: 'radial-gradient(circle, rgba(232, 93, 117, 0.6) 0%, rgba(232, 93, 117, 0.3) 30%, transparent 70%)'}}></div>
            <div className="lens-flare-2" style={{background: 'radial-gradient(circle, rgba(43, 95, 68, 0.5) 0%, rgba(43, 95, 68, 0.25) 40%, transparent 80%)'}}></div>
            <div className="lens-flare-3" style={{background: 'radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, rgba(212, 175, 55, 0.3) 35%, transparent 75%)'}}></div>
          </div>
        </div>
      </div>

      {/* Variant Selector */}
      <div className="fixed top-4 left-4 z-50">
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value as HomeVariant)}
          className="bg-white/90 backdrop-blur-sm border text-charcoal rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 shadow-md"
          style={{borderColor: 'rgba(43, 95, 68, 0.2)', focusRingColor: 'rgba(43, 95, 68, 0.5)'}}
        >
          <option value="default">Default</option>
          <option value="modern">Modern</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>

      {/* Sidebar Toggle Button */}
      <Button
        onClick={() => setSidebarVisible(!sidebarVisible)}
        variant="ghost"
        size="sm"
        className={`fixed top-4 z-50 bg-white/90 backdrop-blur-sm border text-charcoal transition-all duration-300 ease-in-out rounded-2xl shadow-md ${
          sidebarVisible ? 'right-4' : 'right-4'
        }`}
        style={{borderColor: 'rgba(43, 95, 68, 0.2)'}}
      >
        {sidebarVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Main Content */}
      <div className={`relative z-10 min-h-screen flex flex-col justify-center py-12 w-full px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out ${
        sidebarVisible 
          ? 'transform translate-x-0 sm:translate-x-[12rem] md:translate-x-[13.5rem] lg:translate-x-[15rem]' 
          : 'transform translate-x-0'
      }`}>
        <div className="mx-auto w-full max-w-6xl">

          {/* Booking Form Section */}
          <div className="mb-8 sm:mb-12 md:mb-16">
            {loadingServices ? (
              <div className="text-center text-text-light text-lg">Loading our amazing services...</div>
            ) : (
              <div className="form-container">
                <BookingForm services={services} variant="minimal" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div 
          className="fixed inset-0 bg-charcoal/20 backdrop-blur-sm z-40 sm:hidden transition-all duration-500 ease-in-out"
          onClick={() => setSidebarVisible(false)}
        />
      )}

      {/* Bookings Sidebar - Using 'modern' variant */}
      <BookingsSidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(false)} variant="modern" />

      <Toaster />
      
      {/* Development Tools */}
      <DevTools />
    </div>
  )
}
