'use client'

import { BookingForm } from '@/components/home/booking-form'
import { BookingsSidebar } from '@/components/home/bookings-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { ParallaxLogo } from '@/components/home/parallax-logo'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useHomePage, type HomeVariant } from '@/hooks/useHomePage'
import { DevTools } from '@/components/DevTools'
import { ThemeProvider } from '@/components/ThemeProvider'
import { VideoBackground } from '@/components/VideoBackground'

export default function Home() {
  const {
    services,
    loadingServices,
    sidebarVisible,
    setSidebarVisible,
    variant,
    setVariant,
    theme,
  } = useHomePage()

  return (
    <ThemeProvider theme={theme}>
      <div className="h-screen relative overflow-hidden" style={{ 
        backgroundColor: '#F8F6F3',
        borderTop: '8px solid #E03131',
        borderLeft: '8px solid #E03131',
        borderRight: '8px solid #E03131',
        borderBottom: '48px solid #E03131',
        boxShadow: '0 0 0 2px #CC0000'
      }}>
      {/* YouTube Video Background */}
      <VideoBackground 
        videoId="TWxUv9BJDHc" 
        className="z-0"
      />

      {/* Variant Selector */}
      <div className="fixed top-4 left-4 z-50">
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value as HomeVariant)}
          className="bg-slate-800/80 backdrop-blur-sm border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
        className={`fixed top-4 z-50 bg-slate-800/80 backdrop-blur-sm border border-white/10 text-white hover:bg-slate-700/80 transition-all duration-300 ease-in-out ${
          sidebarVisible ? 'right-4' : 'right-4'
        }`}
      >
        {sidebarVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Main Content */}
      <div className={`relative z-20 h-screen flex items-center justify-center w-full px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out ${
        sidebarVisible 
          ? 'transform translate-x-0 sm:translate-x-[12rem] md:translate-x-[13.5rem] lg:translate-x-[15rem]' 
          : 'transform translate-x-0'
      }`} style={{ marginTop: '-2rem' }}>
        <div className="mx-auto w-full max-w-6xl">

          {/* Logo Section */}
          <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
            <ParallaxLogo variant={variant} />
          </div>

          {/* Booking Form Section */}
          <div className="mb-2 sm:mb-3 md:mb-4">
            {loadingServices ? (
              <div className="text-center text-white/70">Loading services...</div>
            ) : (
              <BookingForm services={services} variant={variant} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 sm:hidden transition-all duration-500 ease-in-out"
          onClick={() => setSidebarVisible(false)}
        />
      )}

      {/* Bookings Sidebar */}
      <BookingsSidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(false)} variant={variant} />

      <Toaster />
      
        {/* Development Tools */}
        <DevTools />
      </div>
    </ThemeProvider>
  )
}
